-- ==========================================
-- MIGRÁCIÓ: pg_cron + pg_net automatizáció
-- ==========================================

-- 1. Engedélyezzük a hálózati kérések küldését lehetővé tevő kiterjesztést
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Engedélyezzük az időzített feladatok futtatását
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Ha esetleg már létezik a feladat (pl. tesztelés utáni újra-futtatás), akkor töröljük
SELECT cron.unschedule('check_deficiencies_daily_8am');

-- 4. Beállítunk egy cron job-ot, ami minden nap reggel 08:00-kor lefut
-- KÉRLEK CSERÉLD KI A KÖVETKEZŐKET A PRKODEJTED SAJÁT ADATAIRA:
-- [YOUR_PROJECT_REF_URL]: A Supabase projected API URL-je
-- [YOUR_ANON_KEY]: A project anon webhook kulcsa
SELECT cron.schedule(
    'check_deficiencies_daily_8am',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url:='https://[YOUR_PROJECT_REF_URL].supabase.co/functions/v1/check-deficiencies',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_ANON_KEY]"}'::jsonb
    );
    $$
);
