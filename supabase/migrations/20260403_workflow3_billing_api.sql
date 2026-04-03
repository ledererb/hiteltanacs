-- ==============================================
-- MIGRÁCIÓ 3: Workflow 3 - Automatikus Számlázás
-- ==============================================

-- 1. Újrahívások számának nyilvántartása a hibakezeléshez
ALTER TABLE billing_events ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- 2. CRON JOB beállítása a számlázó API háttérfolyamatához (15 percenként)
-- HA újra szeretnénk futtatni egy esetleges hiba miatt a schedule-t:
SELECT cron.unschedule('process_billing_15min');

SELECT cron.schedule(
    'process_billing_15min',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url:='https://[YOUR_PROJECT_REF_URL].supabase.co/functions/v1/process-billing',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_ANON_KEY]"}'::jsonb
    );
    $$
);
