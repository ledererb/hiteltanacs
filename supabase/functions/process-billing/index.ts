import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Jövőbeli számlázó API mock url (pl. Billingo/Számlázz.hu majdani végpontját ide kell tenni)
const BILLING_API_URL = "https://api.mock-billing.com/invoice";
// Könyvelői/Rendszergazdai e-mail, ha végérvényesen hibára fut a kiállítás
const ALERT_EMAIL = "nagyd965@gmail.com"; 

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key is missing.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Szűrés a kiküldendő eseményekre (még nincs elküldve ÉS max 3x próbáltuk)
    const { data: billingEvents, error: fetchErr } = await supabase
      .from('billing_events')
      .select('id, amount_huf, event_type, retry_count, projects(id, clients(name, email))')
      .eq('sent_to_billing', false)
      .lt('retry_count', 3);

    if (fetchErr) throw fetchErr;

    if (!billingEvents || billingEvents.length === 0) {
       return new Response(JSON.stringify({ success: true, message: "Nincs feldolgozásra váró számlázási esemény." }), { status: 200 });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const event of billingEvents) {
       let clientName = 'Ismeretlen ügyfél';
       let clientEmail = '';
       
       if (event.projects?.clients) {
           const clientData = Array.isArray(event.projects.clients) ? event.projects.clients[0] : event.projects.clients;
           clientName = clientData.name;
           clientEmail = clientData.email;
       }

       try {
           // 1. API Hívás a harmadikfeles számlázó rendszerbe
           // Ez egy mock hívás, ami szimulálja a számla kiállítást
           const mockApiResponse = await fetch(BILLING_API_URL, {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json',
                   // 'Authorization': `Bearer ${BILLING_API_KEY}` // Később ide jön a Billingo key
               },
               body: JSON.stringify({
                   customer_name: clientName,
                   customer_email: clientEmail,
                   amount: event.amount_huf,
                   description: `Sikeres pályázati esemény: ${event.event_type}`,
                   project_reference: event.projects?.id
               })
           });

           // Mivel a mock api valószínűleg 404-et vagy DNS hibát fog dobni ebben a nulladik fázisban,
           // A catch fog megfutni. Viszont ha sikeres (pl mock server elérhető):
           if (!mockApiResponse.ok) {
               throw new Error(`API hiba: ${mockApiResponse.status}`);
           }

           // 2. Adatbázis rögzítés SIKERES számlázás után
           await supabase.from('billing_events').update({ 
               sent_to_billing: true, 
               sent_at: new Date().toISOString() 
           }).eq('id', event.id);

           successCount++;

       } catch (error: any) {
           // 3. HIBAKEZELÉS és Újrapróbálkozás (Retry logika)
           errorCount++;
           const newRetryCount = event.retry_count + 1;
           
           console.error(`Sikertelen API hívás (ID: ${event.id}). Retry számláló: ${newRetryCount}`, error.message);

           await supabase.from('billing_events').update({ 
               retry_count: newRetryCount 
           }).eq('id', event.id);

           // 4. E-mail Riasztás, ha elérte a 3. sikertelenséget
           if (newRetryCount >= 3) {
               if (resendApiKey) {
                   await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: {
                          'Authorization': `Bearer ${resendApiKey}`,
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                          from: 'HitelTanacs System <onboarding@resend.dev>',
                          to: [ALERT_EMAIL],
                          subject: `[Kritikus Hiba] Számlázás meghiúsult: ${clientName}`,
                          html: `<h2>Riasztás - Számlázó API Hiba</h2>
                                 <p>Tisztelt Könyvelő / Rendszergazda!</p>
                                 <p>A rendszer 3 alkalommal sikertelenül próbálta meg kiállítani az alábbi számlát, a feladat beavatkozást igényel!</p>
                                 <ul>
                                    <li>Ügyfél neve: <b>${clientName}</b></li>
                                    <li>Összeg: <b>${event.amount_huf} Ft</b></li>
                                    <li>Esemény típusa: <b>${event.event_type}</b></li>
                                    <li>Belső esemény ID: <b>${event.id}</b></li>
                                 </ul>
                                 <p>Kérem, intézkedjen manuálisan a felületen, vagy lépjen kapcsolatba a fejlesztőkkel!</p>`
                      })
                   });
               } else {
                   console.warn("Nincs RESEND_API_KEY, ezért a könyvelői riasztást nem lehetett kiküldeni.", ALERT_EMAIL);
               }
           }
       }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: billingEvents.length,
      successCount,
      errorCount
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
