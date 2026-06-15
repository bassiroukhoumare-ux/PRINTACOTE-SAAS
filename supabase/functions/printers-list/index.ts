// Edge Function : liste publique des imprimeurs, cachée 120 s dans Redis.
// verify_jwt = false (données publiques). Sur miss/erreur Redis -> lecture Supabase directe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getRedis, withCache } from "../_shared/redis.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const printers = await withCache(getRedis(), "cache:printers:list", 120, async () => {
    const { data, error } = await admin
      .from("printers").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

  return json({ printers });
});
