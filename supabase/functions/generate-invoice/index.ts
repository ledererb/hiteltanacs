import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // CORS kezelése (OPTIONS kérés)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { event_id } = await req.json();

    if (!event_id) {
      throw new Error("Missing event_id payload.");
    }

    // 1. Lekérdezzük a számlázási eseményt és a hozzá kapcsolódó projekt/ügyfél adatokat
    const { data: eventData, error: eventError } = await supabaseClient
      .from('billing_events')
      .select(`
        id, event_type, amount_huf, sent_to_billing, invoice_number,
        projects (
           id, notes,
           clients (
              name, email, tax_id, birth_name
           )
        )
      `)
      .eq('id', event_id)
      .single();

    if (eventError || !eventData) {
      throw new Error(`Nem található a billing_event adat: ${eventError?.message}`);
    }

    // 2. MOCK Számlázz.hu XML Generálás
    // Biztonsági okokból NEM küldjük el a Számlázz.hu végpontjára, csak a konzolra logoljuk!
    const client = eventData.projects?.clients;
    const clientName = Array.isArray(client) ? client[0]?.name : client?.name;
    const amount = eventData.amount_huf;

    const mockXmlPayload = `
    <?xml version="1.0" encoding="UTF-8"?>
    <xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla http://www.szamlazz.hu/docs/xsds/szamla.xsd">
        <beallitasok>
            <felhasznalo>MOCK_USER</felhasznalo>
            <jelszo>MOCK_PASSWORD</jelszo>
            <szamlaagentkulcs>MOCK_AGENT_KEY</szamlaagentkulcs>
            <pdfLetoltes>false</pdfLetoltes>
            <valaszVerzio>2</valaszVerzio>
        </beallitasok>
        <fejlec>
            <keltDatum>${new Date().toISOString().split('T')[0]}</keltDatum>
            <teljesitesDatum>${new Date().toISOString().split('T')[0]}</teljesitesDatum>
            <fizetesiHataridoDatum>${new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}</fizetesiHataridoDatum>
            <fizmod>Átutalás</fizmod>
            <penznem>HUF</penznem>
            <szamlaNyelve>hu</szamlaNyelve>
            <megjegyzes>Generálva a Hiteltanácsadó platformból (MOCK)</megjegyzes>
        </fejlec>
        <vevo>
            <nev>${clientName || 'Ismeretlen ügyfél'}</nev>
            <cim>
                <orszag>Magyarország</orszag>
                <irsz>1000</irsz>
                <telepules>Tesztváros</telepules>
                <cim>Teszt utca 1.</cim>
            </cim>
            <email>${Array.isArray(client) ? client[0]?.email : client?.email || ''}</email>
        </vevo>
        <tetelek>
            <tetel>
                <megnevezes>Energetikai tanácsadás - ${eventData.event_type} apropó</megnevezes>
                <mennyiseg>1</mennyiseg>
                <mennyisegiEgyseg>db</mennyisegiEgyseg>
                <nettoEgysegar>${amount}</nettoEgysegar>
                <afakulcs>AAM</afakulcs>
                <nettoErtek>${amount}</nettoErtek>
                <afaErtek>0</afaErtek>
                <bruttoErtek>${amount}</bruttoErtek>
            </tetel>
        </tetelek>
    </xmlszamla>
    `;

    console.log("-----------------------------------------");
    console.log("MOCK SZÁMLÁZZ.HU XML PAYLOAD (NINCS ELKÜLDVE):");
    console.log(mockXmlPayload);
    console.log("-----------------------------------------");

    // 3. Szimulált 2 másodperces hálózati késleltetés
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // MOCK Számlaszám generálása
    const mockInvoiceNumber = `TESZT-2026-${Math.floor(Math.random() * 899 + 100)}`;

    // 4. Esemény frissítése a Supabase adatbázisban
    const { error: updateError } = await supabaseClient
      .from('billing_events')
      .update({
         sent_to_billing: true,
         sent_at: new Date().toISOString(),
         invoice_number: mockInvoiceNumber
      })
      .eq('id', event_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invoice_number: mockInvoiceNumber, 
      message: "Számla sikeresen generálva (MOCK)."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error("Hiba az Edge Function futtatásakor:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
    });
  }
});
