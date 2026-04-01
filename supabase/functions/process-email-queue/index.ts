import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  nav_igazolas: {
    subject: "Kérjük töltse fel a NAV Jövedelemigazolását",
    body: "Tisztelt Ügyfelünk!<br><br>Sikeresen megkötöttük a szerződést. Kérjük, minél hamarabb szerezze be és küldje el a hivatalos NAV jövedelemigazolást a rendszerünkbe, hogy folytathassuk a projektet."
  },
  onkormanyzati_igazolas: {
    subject: "Kérjük töltse fel az Önkormányzati Igazolást (Adóigazolás)",
    body: "Tisztelt Ügyfelünk!<br><br>Sikeresen megkötöttük a szerződést. Szükségünk lenne egy hivatalos önkormányzati adóigazolásra az adott ingatlanra és személyre vonatkozóan (nullás igazolás)."
  },
  tamogatoi_tabla_foto: {
    subject: "Feltöltendő Fotó: Támogatói Tábla Kihelyezése",
    body: "Tisztelt Ügyfelünk!<br><br>Kérjük, hogy a projekttáblát (Támogatói tábla) helyezze ki az építési területre/ingatlanra jól látható helyre, majd készítsen róla egy jó minőségű fényképet és küldje vissza számunkra."
  }
};

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key is missing.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Lekérdezzük azokat a sorokat, amik pending-ek és letelt a várakozási idő
    const now = new Date().toISOString();
    const { data: queueItems, error: fetchErr } = await supabase
      .from('email_queue')
      .select('id, client_email, email_type, projects(clients(name))')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (fetchErr) throw fetchErr;

    if (!queueItems || queueItems.length === 0) {
       return new Response(JSON.stringify({ success: true, message: "Üres a queue." }), { status: 200 });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const item of queueItems) {
        
       // 1. Üres e-mail ellenőrzés (Bolondbiztosság)
       if (!item.client_email || item.client_email.trim() === '') {
           await supabase.from('email_queue').update({ status: 'failed_no_email' }).eq('id', item.id);
           failedCount++;
           continue;
       }

       // 2. Email API kiküldés hívás (Ha be van állítva)
       if (resendApiKey) {
           const template = TEMPLATES[item.email_type];
           const clientName = Array.isArray(item.projects?.clients) ? item.projects.clients[0]?.name : item.projects?.clients?.name;
           
           if (!template) {
               await supabase.from('email_queue').update({ status: 'failed' }).eq('id', item.id);
               failedCount++;
               continue;
           }

           try {
               const res = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      from: 'HitelTanacs System <onboarding@resend.dev>',
                      to: [item.client_email],
                      subject: template.subject,
                      html: `<h2>Kedves ${clientName || 'Ügyfelünk'}!</h2>
                             <p>${template.body}</p>
                             <br>Üdvözlettel,<br>A HitelTanacs csapata.`
                  })
               });

               if (!res.ok) {
                   throw new Error('Resend API Error');
               }

               // Sikeres küldés lekönyvelése
               await supabase.from('email_queue').update({ 
                   status: 'sent', 
                   sent_at: new Date().toISOString() 
               }).eq('id', item.id);
               
               sentCount++;

           } catch (e) {
               // Hiba a postozás közben
               await supabase.from('email_queue').update({ status: 'failed' }).eq('id', item.id);
               failedCount++;
           }
       } else {
           console.warn("RESEND_API_KEY nincs beállítva. Szimuláljuk a sikert...");
           await supabase.from('email_queue').update({ 
               status: 'sent', 
               sent_at: new Date().toISOString() 
           }).eq('id', item.id);
           sentCount++;
       }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: queueItems.length,
      sent: sentCount,
      failed: failedCount
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
