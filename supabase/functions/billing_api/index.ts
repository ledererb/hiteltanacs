import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// This function acts as a webhook target for Supabase database triggers inserted into billing_events
console.log("Hello from billing_api function!")

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("PAYLOAD RECEIVED:", JSON.stringify(payload, null, 2))
    
    // In production we would use `fetch` to call the Számlázó API with payload.record.amount_huf
    const amount = payload.record?.amount_huf || payload.amount || 0;
    const project_id = payload.record?.project_id || payload.project_id || 'unknown';
    
    console.log(`[SZÁMLÁZÁS SZIMULÁLÁS] Számla készítés hívása: ${amount} Ft`);
    console.log(`Projekt azonosító: ${project_id}`);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log(`[SZÁMLÁZÁS SZIMULÁLÁS] Sikeresen kiállítva.`);

    // Next step in full implementation would be to update `sent_to_billing` in Supabase DB

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Invoice generation queued successfully",
        amount_generated: amount
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Hiba történt a webhook hívás közben", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
})
