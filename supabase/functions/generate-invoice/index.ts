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
    const apiKey = Deno.env.get('SZAMLAZZ_HU_API_KEY');
    if (!apiKey) {
      throw new Error("A Számlázz.hu API kulcs nincs beállítva a környezeti változókban.");
    }

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

    const client = eventData.projects?.clients;
    const clientName = Array.isArray(client) ? client[0]?.name : client?.name;
    const amount = eventData.amount_huf;

    // 2. KŐBE VÉSETT XML STRUKTÚRA DÍJBEKÉRŐ MÓDBAN
    const xmlPayload = `
    <?xml version="1.0" encoding="UTF-8"?>
    <xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla http://www.szamlazz.hu/docs/xsds/szamla.xsd">
        <beallitasok>
            <szamlaagentkulcs>${apiKey}</szamlaagentkulcs>
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
            <megjegyzes>Generálva a Hiteltanácsadó platformból (Díjbekérő)</megjegyzes>
            <dijbekero>true</dijbekero>
        </fejlec>
        <elado>
            <bank>Teszt Bank Zrt.</bank>
            <bankszamlaszam>11111111-22222222-33333333</bankszamlaszam>
            <emailReplyto>info@hiteltanacsado.hu</emailReplyto>
            <emailTargy>Díjbekérő</emailTargy>
            <emailSzoveg>Íme a kért díjbekérő</emailSzoveg>
        </elado>
        <vevo>
            <nev>${clientName || 'Ismeretlen ügyfél'}</nev>
            <orszag>Magyarország</orszag>
            <irsz>1000</irsz>
            <telepules>Tesztváros</telepules>
            <cim>Teszt utca 1.</cim>
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
    `.trim();

    // 3. API Kérés összeállítása
    const formData = new FormData();
    formData.append('action-xmlagentxmlfile', new File([xmlPayload], 'invoice.xml', { type: 'text/xml' }));

    const szamlazzResponse = await fetch('https://www.szamlazz.hu/szamla/', {
      method: 'POST',
      body: formData,
    });

    // 4. API Válasz feldolgozása headderek alapján
    const errorMessage = szamlazzResponse.headers.get('szamlaAgentErrorMessage');
    if (errorMessage) {
      throw new Error(decodeURIComponent(errorMessage.replace(/\\+/g, ' ')));
    }

    const responseText = await szamlazzResponse.text();
    let szamlaszam = szamlazzResponse.headers.get('szamlaAgentSzamlaszam');
    
    if (!szamlaszam) {
      const szamlaszamMatch = responseText.match(/<szamlaszam>(.*?)<\/szamlaszam>/i);
      if (szamlaszamMatch && szamlaszamMatch[1]) {
          szamlaszam = szamlaszamMatch[1];
      }
    }

    if (!szamlaszam) {
      let errorDetail = "Ismeretlen API hiba. (Nyers válasz: " + responseText.substring(0, 150) + ")";
      const hibauzenetMatch = responseText.match(/<hibauzenet>(.*?)<\/hibauzenet>/i);
      if (hibauzenetMatch && hibauzenetMatch[1]) {
          errorDetail = hibauzenetMatch[1];
      }
      throw new Error(`Nem érkezett számlaszám a válaszban. Részletek: ${errorDetail}`);
    }

    // 5. Esemény frissítése a Supabase adatbázisban
    const { error: updateError } = await supabaseClient
      .from('billing_events')
      .update({
         sent_to_billing: true,
         sent_at: new Date().toISOString(),
         invoice_number: szamlaszam
      })
      .eq('id', event_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invoiceId: szamlaszam,
      invoice_number: szamlaszam 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error("Hiba az Edge Function futtatásakor:", err.message);
    return new Response(JSON.stringify({ success: false, errorMessage: err.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
  }
});
