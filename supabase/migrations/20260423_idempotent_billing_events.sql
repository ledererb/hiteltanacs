-- 20260423_idempotent_billing_events_v2.sql
-- Ez a script módosítja a számlázási események automatizmusát.
-- Nem hoz létre duplikációkat visszahúzáskor, viszont ha visszahúzás után extra kivitelezőt adnak hozzá,
-- majd újra "beadás" státuszba léptetik, akkor FRISSÍTI az összeget (feltéve, hogy még nincs kiszámlázva).

CREATE OR REPLACE FUNCTION handle_project_billing_events()
RETURNS TRIGGER AS $$
DECLARE
    extra_contractors INT;
    calculated_amount INT;
    lehivas_count INT;
BEGIN
    -- 1. Projekt indulás
    IF TG_OP = 'INSERT' THEN
        IF NOT EXISTS (SELECT 1 FROM billing_events WHERE project_id = NEW.id AND event_type = 'indulás') THEN
            INSERT INTO billing_events (project_id, event_type, amount_huf)
            VALUES (NEW.id, 'indulás', 50000);
        END IF;
        RETURN NEW;
    END IF;

    -- 2. Státusz váltások a frissítéskor
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- 'beadás' státusz
        IF NEW.status = 'beadás' THEN
            -- Számoljuk meg a kivitelezőket (mínusz 1 alapértelmezett).
            extra_contractors := jsonb_array_length(NEW.contractors) - 1;
            IF extra_contractors < 0 THEN extra_contractors := 0; END IF;
            
            calculated_amount := 74000 + (extra_contractors * 20000);

            -- Ellenőrizzük, hogy létezik-e már beadási esemény
            IF NOT EXISTS (SELECT 1 FROM billing_events WHERE project_id = NEW.id AND event_type = 'beadás') THEN
                INSERT INTO billing_events (project_id, event_type, amount_huf)
                VALUES (NEW.id, 'beadás', calculated_amount);
            ELSE
                -- Ha már létezik, de újra 'beadás'-ba lett húzva, akkor UPDATE-eljük az összeget!
                -- Így a hozzáadott extra kivitelezők is beleszámítanak.
                -- (De csak akkor írjuk felül, ha még nem lett belőle elküldött díjbekérő)
                UPDATE billing_events 
                SET amount_huf = calculated_amount 
                WHERE project_id = NEW.id 
                  AND event_type = 'beadás' 
                  AND sent_to_billing = false;
            END IF;
        END IF;

        -- 'folyósítás' státusz
        IF NEW.status = 'folyósítás' THEN
            SELECT count(*) INTO lehivas_count FROM billing_events WHERE project_id = NEW.id AND event_type = 'lehívás';
            IF lehivas_count < 1 THEN
                INSERT INTO billing_events (project_id, event_type, amount_huf)
                VALUES (NEW.id, 'lehívás', 25000);
            END IF;
        END IF;

        -- 'zárás' státusz
        IF NEW.status = 'zárás' THEN
            SELECT count(*) INTO lehivas_count FROM billing_events WHERE project_id = NEW.id AND event_type = 'lehívás';
            IF lehivas_count < 2 THEN
                INSERT INTO billing_events (project_id, event_type, amount_huf)
                VALUES (NEW.id, 'lehívás', 25000);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';
