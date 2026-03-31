// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Hello from check_deadlines function!")

serve(async (req) => {
  // In a real application, this would fetch from Supabase
  // using @supabase/supabase-js 
  // const supabase = createClient(...)
  // const { data } = await supabase.from('projects').select('*').match({ status: 'beadás' })
  
  // To mock the N8N workflow:
  console.log("CRON TRIGGERED: Checking all deadlines for submissions older than 5 days...");
  
  // Faking email sending
  console.log("EMAIL SENT: Ügyfél hiánypótlási értesítés [MOCK]");

  const data = {
    message: "Határidő ellenőrzés sikeresen lefutott, email értesítések elküldve (simulated).",
    processed_count: 2,
    timestamp: new Date().toISOString()
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
