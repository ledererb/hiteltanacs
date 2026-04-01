import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Segéd függvény dátum kalkulációhoz
const getDaysAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // Service role kulcsot használunk, hogy a háttérfolyamat (hook) lássa a user adattáblákat RLS mellett is
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key is missing.');
    }

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY nincs beállítva. Az e-mailek nem mennek ki.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. BEADÁS ablak (15 napos határidő)
    // Szűrés: status = 'beadás' és telt el legalább 10 nap (maradt max 5 nap)
    const tenDaysAgoTarget = new Date();
    tenDaysAgoTarget.setDate(tenDaysAgoTarget.getDate() - 10);
    
    const { data: beadasProjects, error: beadasErr } = await supabase
      .from('projects')
      .select('id, status, submission_date, clients(name)')
      .eq('status', 'beadás')
      .lte('submission_date', tenDaysAgoTarget.toISOString());

    if (beadasErr) throw beadasErr;

    // 2. FOLYÓSÍTÁS ablak (10 napos határidő)
    // Szűrés: disbursement_75_date legalább 5 napja volt
    const fiveDaysAgoTarget = new Date();
    fiveDaysAgoTarget.setDate(fiveDaysAgoTarget.getDate() - 5);

    const { data: folyositasProjects, error: folyositasErr } = await supabase
      .from('projects')
      .select('id, status, disbursement_75_date, clients(name)')
      .lte('disbursement_75_date', fiveDaysAgoTarget.toISOString());

    if (folyositasErr) throw folyositasErr;

    const emailPromises: Promise<any>[] = [];

    // Feldolgozzuk a Beadásokat
    if (beadasProjects && beadasProjects.length > 0) {
      for (const p of beadasProjects) {
        const daysPassed = getDaysAgo(p.submission_date);
        const daysLeft = 15 - daysPassed;
        
        // Csak akkor küldünk, ha a hátralévő napok száma <= 5, és még nincs mínuszban túl régóta (hogy ne floodoljon hetekig)
        if (daysLeft <= 5 && daysLeft >= -5 && resendApiKey) {
           const clientName = Array.isArray(p.clients) ? p.clients[0]?.name : p.clients?.name;
           
           emailPromises.push(
               fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      from: 'HitelTanacs System <onboarding@resend.dev>',
                      to: ['nagyd965@gmail.com'],
                      subject: `[Határidő Figyelmeztetés] ${clientName} - Beadás lejár`,
                      html: `<h2>Határidő közeleg!</h2>
                             <p>Az ügyfél: <strong>${clientName}</strong></p>
                             <p>A projekt státusza jelenleg "Beadás". Cselekvés szükséges!</p>
                             <p style="color: red; font-size: 18px;"><strong>Még ${daysLeft} napod maradt a 15-ből!</strong></p>`
                  })
               })
           );
        }
      }
    }

    // Feldolgozzuk a Folyósításokat
    if (folyositasProjects && folyositasProjects.length > 0) {
      for (const p of folyositasProjects) {
        const daysPassed = getDaysAgo(p.disbursement_75_date);
        const daysLeft = 10 - daysPassed;
        
        if (daysLeft <= 5 && daysLeft >= -5 && resendApiKey) {
           const clientName = Array.isArray(p.clients) ? p.clients[0]?.name : p.clients?.name;
           
           emailPromises.push(
               fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      from: 'HitelTanacs System <onboarding@resend.dev>',
                      to: ['nagyd965@gmail.com'],
                      subject: `[Határidő Figyelmeztetés] ${clientName} - Folyósítás lejár`,
                      html: `<h2>Határidő közeleg!</h2>
                             <p>Az ügyfél: <strong>${clientName}</strong></p>
                             <p>Folyósítás (75%) dátuma átlépte a limitet.</p>
                             <p style="color: red; font-size: 18px;"><strong>Még ${daysLeft} napod maradt a 10-ből!</strong></p>`
                  })
               })
           );
        }
      }
    }

    // Elküldjük az összes emailt
    await Promise.all(emailPromises);

    return new Response(JSON.stringify({ 
      success: true, 
      processed_beadas: beadasProjects?.length || 0,
      processed_folyositas: folyositasProjects?.length || 0,
      emails_sent_attempt: emailPromises.length
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
