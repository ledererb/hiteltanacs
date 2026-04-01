-- ======================================
-- SUPABASE STORAGE SETUP ALAPOK
-- Futtasd ezt a Supabase SQL editor-ban!
-- ======================================

-- 1. Hozzuk létre a storage bucket-et a dokumentumokhoz (ha még nincs).
-- Ha manuálisan már létrehoztad "documents" néven, ezt a lépést kihagyhatod.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Hozzáadjuk Policy-ket a storage-hez (hogy ki mit tölthet fel / tölthet le)

-- 2/a. A felhasználók láthatják a dokumentumokat. Mivel nem public bucket,
-- kell az egyedi RLS feltétel, ami most legyen a bejelentkezett felhasználó.
CREATE POLICY "A felhasznalok olvashatjak a sajat irataikat"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'documents' );

-- 2/b. Bármely bejelentkezett felhasználó tölthet fel iratot a "documents" bucket-be.
CREATE POLICY "Bejelentkezett feltoltheti a dokumentumokat"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'documents' );

-- 2/c. Frissítés engedélyezése.
CREATE POLICY "Bejelentkezett frissíthet"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'documents' );

-- 2/d. Törlés engedélyezése.
CREATE POLICY "Bejelentkezett törölhet"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'documents' );
