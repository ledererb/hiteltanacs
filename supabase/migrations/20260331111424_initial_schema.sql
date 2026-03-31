-- ======================================
-- TELJES ADATBÁZIS MIGRÁCIÓ
-- Supabase SQL Editor-ba másolandó
-- ======================================

-- 1. ENUM típusok
CREATE TYPE project_status AS ENUM ('előkészítés', 'beadás', 'hiánypótlás', 'szerződéskötés', 'folyósítás', 'zárás');
CREATE TYPE document_type AS ENUM ('het_start', 'het_planned', 'het_final', 'hiánypótlás', 'árajánlat', 'nyilatkozat', 'meghatalmazás');
CREATE TYPE billing_event_type AS ENUM ('indulás', 'beadás', 'extra_kivitelező', 'lehívás');

-- 2. Ügyfelek tábla
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    co_debtor_name TEXT,
    owners JSONB DEFAULT '[]'::jsonb,
    beneficiaries JSONB DEFAULT '[]'::jsonb,
    income_data JSONB DEFAULT '{}'::jsonb,
    existing_loans JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Projektek tábla
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status project_status DEFAULT 'előkészítés',
    investment_items JSONB DEFAULT '[]'::jsonb,
    contractors JSONB DEFAULT '[]'::jsonb,
    submission_date TIMESTAMPTZ,
    contract_date TIMESTAMPTZ,
    disbursement_75_date TIMESTAMPTZ,
    disbursement_25_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Dokumentumok tábla
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    doc_type document_type NOT NULL,
    storage_path TEXT NOT NULL,
    generated_at TIMESTAMPTZ,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Számlázási események tábla
CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type billing_event_type NOT NULL,
    amount_huf INTEGER NOT NULL,
    sent_to_billing BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS bekapcsolása
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policy-k
CREATE POLICY "Users can fully manage their own clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can fully manage their own projects" ON projects
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can fully manage relevant documents" ON documents
    FOR ALL USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can read billing events of their projects" ON billing_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = billing_events.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert billing events of their projects" ON billing_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = billing_events.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- 8. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_modtime
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_projects_modtime
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_documents_modtime
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_billing_events_modtime
    BEFORE UPDATE ON billing_events
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 9. Automatikus számlázási trigger
CREATE OR REPLACE FUNCTION handle_project_billing_events()
RETURNS TRIGGER AS $$
DECLARE
    extra_contractors INT;
    calculated_amount INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO billing_events (project_id, event_type, amount_huf)
        VALUES (NEW.id, 'indulás', 50000);
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'beadás' THEN
            extra_contractors := jsonb_array_length(NEW.contractors) - 1;
            IF extra_contractors < 0 THEN extra_contractors := 0; END IF;
            calculated_amount := 74000 + (extra_contractors * 20000);
            INSERT INTO billing_events (project_id, event_type, amount_huf)
            VALUES (NEW.id, 'beadás', calculated_amount);
        END IF;

        IF NEW.status = 'folyósítás' THEN
            INSERT INTO billing_events (project_id, event_type, amount_huf)
            VALUES (NEW.id, 'lehívás', 25000);
        END IF;

        IF NEW.status = 'zárás' THEN
            INSERT INTO billing_events (project_id, event_type, amount_huf)
            VALUES (NEW.id, 'lehívás', 25000);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER project_billing_trigger
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION handle_project_billing_events();
