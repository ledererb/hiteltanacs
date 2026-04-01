-- Befejező dokumentum típusok hozzáadása a document_type ENUM-hoz
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'tulajdonosi_nyilatkozat';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'tulajdonosi_hozzajarulas';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'pep_nyilatkozat';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'khr_nyilatkozat';
