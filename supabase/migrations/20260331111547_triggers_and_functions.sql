-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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


-- Trigger function for automatic billing events
CREATE OR REPLACE FUNCTION handle_project_billing_events()
RETURNS TRIGGER AS $$
DECLARE
    extra_contractors INT;
    calculated_amount INT;
BEGIN
    -- 1. Projekt indulás
    IF TG_OP = 'INSERT' THEN
        INSERT INTO billing_events (project_id, event_type, amount_huf)
        VALUES (NEW.id, 'indulás', 50000);
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

            INSERT INTO billing_events (project_id, event_type, amount_huf)
            VALUES (NEW.id, 'beadás', calculated_amount);
        END IF;

        -- 'folyósítás' státusz
        IF NEW.status = 'folyósítás' THEN
            INSERT INTO billing_events (project_id, event_type, amount_huf)
            VALUES (NEW.id, 'lehívás', 25000);
        END IF;

        -- 'zárás' státusz
        IF NEW.status = 'zárás' THEN
            INSERT INTO billing_events (project_id, event_type, amount_huf)
            VALUES (NEW.id, 'lehívás', 25000);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for billing_events
CREATE TRIGGER project_billing_trigger
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION handle_project_billing_events();
