// Edge Function : stats globales admin, cachées 300 s dans Redis.
// verify_jwt = false MAIS protégée par l'en-tête x-admin-token == ADMIN_API_TOKEN
// (vérifié à CHAQUE appel, y compris sur cache hit). L'EF calcule les stats
// elle-même via service role (mêmes agrégats que le fallback d'AdminPage).
// Secrets : UPSTASH_*, ADMIN_API_TOKEN. Plateforme : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
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

  // Garde : jeton admin partagé, vérifié sur CHAQUE requête.
  const expected = Deno.env.get("ADMIN_API_TOKEN");
  const provided = req.headers.get("x-admin-token");
  if (!expected || provided !== expected) {
    return json({ error: "Non autorisé" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const stats = await withCache(getRedis(), "cache:admin:stats", 300, async () => {
    const [printersRes, productsRes] = await Promise.all([
      admin.from("printers").select("id, services, portfolio, views, clicks"),
      admin.from("products").select("id", { count: "exact", head: true }),
    ]);
    const printers = printersRes.data ?? [];
    return {
      totalPrinters: printers.length,
      totalServices: printers.reduce((acc, p) => acc + (p.services?.length || 0), 0),
      totalPortfolio: printers.reduce((acc, p) => acc + (p.portfolio?.length || 0), 0),
      totalProducts: productsRes.count || 0,
      totalViews: printers.reduce((acc, p) => acc + (p.views || 0), 0),
      totalClicks: printers.reduce((acc, p) => acc + (p.clicks || 0), 0),
    };
  });

  return json({ stats });
});
