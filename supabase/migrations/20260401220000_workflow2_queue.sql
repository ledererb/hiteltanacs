-- ==========================================
-- MIGRÁCIÓ 2: Workflow 2 - Contract Queue
-- ==========================================

-- 1. E-mail cím oszlop hozzáadása
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Típusok és Tábla létrehozása
CREATE TYPE email_queue_status AS ENUM ('pending', 'sent', 'failed', 'failed_no_email');

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    client_email TEXT,
    email_type TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status email_queue_status DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can fully manage their email queue via projects" ON email_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = email_queue.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Modtime trigger a biztonság kedvéért
CREATE TRIGGER update_email_queue_modtime
    BEFORE UPDATE ON email_queue
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 3. Trigger létrehozása, ami feltölti a sorokat
CREATE OR REPLACE FUNCTION queue_contract_emails()
RETURNS TRIGGER AS $$
DECLARE
    client_email_val TEXT;
BEGIN
    -- Módosult a projekt státusza ÉS a célstátusz 'szerződéskötés'
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'szerződéskötés' THEN
        
        -- Kiolvassuk az e-mail címet a kliensek táblából
        SELECT email INTO client_email_val FROM clients WHERE id = NEW.client_id;
        
        -- Hozzáadjuk a 3 darab késleltetett feladatot a queue-hoz (+24 óra)
        INSERT INTO email_queue (project_id, client_email, email_type, scheduled_for)
        VALUES 
            (NEW.id, client_email_val, 'nav_igazolas', NOW() + INTERVAL '24 hours'),
            (NEW.id, client_email_val, 'onkormanyzati_igazolas', NOW() + INTERVAL '24 hours'),
            (NEW.id, client_email_val, 'tamogatoi_tabla_foto', NOW() + INTERVAL '24 hours');
            
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trigger_queue_contract_emails
    AFTER UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION queue_contract_emails();

-- 4. CRON JOB óránkénti futáshoz
-- HA újra szeretnénk futtatni egy esetleges hiba miatt:
SELECT cron.unschedule('process_email_queue_hourly');

SELECT cron.schedule(
    'process_email_queue_hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url:='https://[YOUR_PROJECT_REF_URL].supabase.co/functions/v1/process-email-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_ANON_KEY]"}'::jsonb
    );
    $$
);
