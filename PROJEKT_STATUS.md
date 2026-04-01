# Projekt Státusz Összefoglaló (hiteltanacs)

Ez a dokumentum a `hiteltanacs` nevű React alkalmazás jelenlegi állapotát foglalja össze. Célja, hogy egy másik Gemini agent gyorsan kontextusba kerüljön és folytathassa a fejlesztést.

## 1. Technológiai Stack
- **Keretrendszer:** React 19 + TypeScript + Vite
- **Stílusozás:** Tailwind CSS v4, `lucide-react` ikonok, `clsx` + `tailwind-merge`
- **Állapotkezelés & Útválasztás:** `react-router-dom` v7
- **Űrlapkezelés & Validáció:** `react-hook-form` + `@hookform/resolvers` + `zod`
- **Drag & Drop:** `@dnd-kit/core`, `@dnd-kit/sortable`
- **Backend & Adatbázis:** Supabase (`@supabase/supabase-js`) teljes RLS (Row Level Security) és PostgreSQL funkciókkal.

## 2. Architektúra & Kódbázis Struktúra
A kód a `src/` mappában található, a következő fő részekkel:
- **`App.tsx` & `main.tsx`:** Belépési pontok, útvonalak (`Router`, `Routes`).
- **`components/layout/AppLayout.tsx`:** Fő elrendezés a bejelentkezett felhasználóknak.
- **`pages/`:** Jelenleg implementált oldalak:
  - `Login.tsx`: Bejelentkezési képernyő.
  - `Dashboard.tsx`: Ügyfelek és aktív projektek táblázatos nézete keresővel és szűréssel.
  - `ClientDetails.tsx`: Ügyfél adatlap, alapadatok és projektek szerkesztése, fájlok feltöltése.
  - `Kanban.tsx`: Drag & drop tábla a projektek állapotának (státuszának) kezeléséhez.
- **`lib/`:** Segédfüggvények, pl. `supabase.ts` (Supabase kliens inicializálás) és egy `PrintPDF.tsx` komponens.
- **`supabase/migrations/`:** Az adatbázis sémát leíró SQL fájlok (2 darab migráló script).

## 3. Adatbázis Séma (Supabase)
A backend már dedikált sémával rendelkezik, készen áll a használatra. Főbb táblák és típusok:
- **Enums:** `project_status` (pl. `előkészítés`, `beadás`, `folyósítás`), `document_type`, `billing_event_type`.
- **`clients`:** Ügyféladatok, adóstárs, jövedelem infók, meglévő hitelek (JSONB).
- **`projects`:** Az ügyfélhez tartozó projektek státusszal, kivitelezők listájával és dátumokkal.
- **`documents`:** Feltöltött és generált dokumentumok a projekthez.
- **`billing_events`:** Számlázási események (automatizált triggerek alapján).

**Adatbázis triggerek (SQL):**
- Minden táblánál automatikus `updated_at` frissítés.
- **Automatikus számlázási trigger** (`project_billing_trigger`): Ha egy projekt státusza megváltozik, automatikusan rekord jön létre a `billing_events` táblában (pl. indulásnál 50.000 Ft, beadásnál 74.000 Ft + extra kivitelezők után, folyósításnál 25.000 Ft).
- A táblákon RLS policy-k vannak beállítva (felhasználók csak a saját adataikat látják).

## 4. Jelenlegi Implementációs Állapot (Hol tart a kód?)
> [!IMPORTANT]
> A UI nagyrészt kész és reszponzív (a Tailwind és Lucide-react segítségével), **DE jelenleg hardcoded, mock adatokkal dolgozik**. 

- **Frontend nézetek:** Az oldalak (`Dashboard`, `Kanban`, `ClientDetails`) szépen meg vannak írva vizuálisan, animációkkal és design elemekkel. A Kanban táblán a drag & drop működik in-memory.
- **Integráció Hiánya (Következő fázis):** A Supabase inicializálva van, de **a UI komponensek nincsenek összekötve a Supabase táblákkal**. 
- A felületek (űrlapok) elkészültek, a `react-hook-form` is be van kötve a `ClientDetails`-ben, de a mentés gomb jelenleg csak `console.log`-ol, és a listák const array-ből renderelődnek.

## 5. Mik a teendői a folytató Agent-nek?
Amire számítani kell a következő fázisban (TODO):
1. **Autentikáció összekötése:** A `Login.tsx` és `App.tsx` felokosítása a Supabase Auth session-tel, hogy csak bejelentkezettek érjék el a `/` route-okat.
2. **Adatlekérés (Fetch):** A mock adatok lecserélése Supabase lekérdezésekre (`supabase.from('clients').select(...)`).
3. **Adatmódosítás (Mutations):** A `ClientDetails.tsx` mentés gombjának bekötése az adatbázisba (insert/update `clients` és `projects`).
4. **Kanban Backend Bekötése:** A Kanban táblán a státuszváltás (drag end) módosítsa a Supabase-ben a `projects.status` mezőt, ami egyben indítja az SQL billinge-triggert is!
5. **Storage Integráció:** A fájl feltöltő szekció bekötése a Supabase Storage bucket-hez.

Ezzel a leírással már egyértelmű az Agent számára, hogy a vizuális MVP megvan, az adatbázis alap készen vár a Supabase-en, de a React állapotkezelést és a hálózatot (Supabase JS API-kat) össze kell hangolni.
