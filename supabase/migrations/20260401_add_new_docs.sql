-- Új PDF típusok hozzáadása a document_type ENUM-hoz
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'osszefoglalo';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'horizontalis';
