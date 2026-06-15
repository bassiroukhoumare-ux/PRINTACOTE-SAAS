// Edge Function : demande de code de récupération, rate-limitée.
// Rate limit : 3 / 15 min par email + 10 / h par IP.
// Puis appelle la RPC send_recovery_email via service role (qui ignore le REVOKE).
// Secrets : UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.
// Fournis par la plateforme : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getRedis, rateLimit } from "../_shared/redis.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  let email: string, recovery_code: string, client_ip: string, client_location: string, client_device: string;
  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
    recovery_code = String(body.recovery_code || "");
    client_ip = String(body.client_ip || "Inconnu");
    client_location = String(body.client_location || "Inconnue");
    client_device = String(body.client_device || "");
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }
  if (!email || !recovery_code) return json({ error: "Paramètres manquants" }, 400);

  // IP réelle (derrière le proxy Supabase).
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0";

  // Rate limit : par email puis par IP.
  const redis = getRedis();
  const byEmail = await rateLimit(redis, `rl:recovery:${email}`, { max: 3, windowSec: 15 * 60 });
  if (!byEmail.allowed) {
    return json({ error: "Trop de demandes pour cette adresse. Réessayez plus tard." }, 429);
  }
  const byIp = await rateLimit(redis, `rl:recovery:ip:${ip}`, { max: 10, windowSec: 60 * 60 });
  if (!byIp.allowed) {
    return json({ error: "Trop de demandes depuis ce réseau. Réessayez plus tard." }, 429);
  }

  // Appel RPC via service role (contourne le REVOKE anon/authenticated).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await admin.rpc("send_recovery_email", {
    email_to: email,
    recovery_code,
    client_ip,
    client_location,
    client_device,
  });
  if (error) {
    // On renvoie le message brut pour que le front distingue "email inexistant".
    return json({ error: error.message }, 400);
  }
  return json({ ok: true });
});
