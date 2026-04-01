-- ======================================
-- 1. FÁZIS: Bővített RLS Szabályok (Billing)
-- Supabase SQL Editor-ba másolandó és futtatandó!
-- ======================================

-- Engedélyezzük, hogy a felhasználó saját projektjeinek a számlázási eseményeit tudja módosítani 
-- (elsősorban a 'sent_to_billing' státuszt)
CREATE POLICY "Users can update billing events of their projects" ON billing_events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = billing_events.project_id
            AND projects.user_id = auth.uid()
        )
    );
