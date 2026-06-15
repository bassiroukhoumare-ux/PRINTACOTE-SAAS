// Edge Function : message support imprimeur -> admin, rate-limité.
// Rate limit : 5 / min + 30 / h par utilisateur. verify_jwt = true.
// Insère dans admin_messages (direction printer_to_admin) via service role.
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

  // Identifier l'utilisateur via le JWT (la gateway l'a déjà validé : verify_jwt=true).
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  let userId: string | null = null;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.sub) userId = payload.sub;
    }
  } catch (err) {
    console.error("Erreur de décodage JWT:", err);
  }
  if (!userId) return json({ error: "Non authentifié" }, 401);

  let subject: string, content: string;
  try {
    const body = await req.json();
    subject = String(body.subject || "").trim();
    content = String(body.content || "").trim();
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }
  if (!content) return json({ error: "Message vide" }, 400);

  // Rate limit : par utilisateur (rafale + horaire).
  const redis = getRedis();
  const perMin = await rateLimit(redis, `rl:support:min:${userId}`, { max: 5, windowSec: 60 });
  if (!perMin.allowed) return json({ error: "Trop de messages. Patientez une minute." }, 429);
  const perHour = await rateLimit(redis, `rl:support:hour:${userId}`, { max: 30, windowSec: 60 * 60 });
  if (!perHour.allowed) return json({ error: "Limite horaire de messages atteinte." }, 429);

  // Retrouver l'imprimeur du user puis insérer (service role).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: printer, error: pErr } = await admin
    .from("printers").select("id").eq("owner_id", userId).single();
  if (pErr || !printer) return json({ error: "Profil imprimeur introuvable" }, 404);

  const { error: insErr } = await admin.from("admin_messages").insert({
    printer_id: printer.id,
    subject,
    content,
    direction: "printer_to_admin",
  });
  if (insErr) return json({ error: "Enregistrement du message impossible" }, 500);

  return json({ ok: true });
});
