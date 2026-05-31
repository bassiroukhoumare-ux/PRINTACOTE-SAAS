// Edge Function : réception des webhooks IPN PayTech SN.
//
// 1. Vérifie l'authenticité de l'IPN en comparant les sha256 de la clé API et du secret.
// 2. Déduplique via processed_events.
// 3. Contrôle anti-altération du montant.
// 4. Active l'abonnement de façon idempotente (RPC complete_subscription_payment).
//
// Secrets requis :
//   MONEROO_SECRET_KEY / PAYTECH_API_KEY
//   MONEROO_WEBHOOK_SECRET / PAYTECH_API_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256Hex, timingSafeEqual } from "../_shared/paytech.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // Rétrocompatibilité : utilise les clés existantes si configurées sous le nom MONEROO_*
  const PAYTECH_API_KEY = Deno.env.get("PAYTECH_API_KEY") || Deno.env.get("MONEROO_SECRET_KEY");
  const PAYTECH_API_SECRET = Deno.env.get("PAYTECH_API_SECRET") || Deno.env.get("MONEROO_WEBHOOK_SECRET");

  if (!PAYTECH_API_KEY || !PAYTECH_API_SECRET) {
    return new Response("Configuration manquante sur le serveur", { status: 500 });
  }

  // Récupérer le corps de la requête.
  const text = await req.text();
  let refCommand = "";
  let apiKeySha256 = "";
  let apiSecretSha256 = "";
  let itemPrice = 0;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(text);
    refCommand = params.get("ref_command") || "";
    apiKeySha256 = params.get("api_key_sha256") || "";
    apiSecretSha256 = params.get("api_secret_sha256") || "";
    itemPrice = parseFloat(params.get("item_price") || "0");
  } else {
    try {
      const json = JSON.parse(text);
      refCommand = json.ref_command || "";
      apiKeySha256 = json.api_key_sha256 || "";
      apiSecretSha256 = json.api_secret_sha256 || "";
      itemPrice = parseFloat(json.item_price || "0");
    } catch (_) {
      return new Response("Format de corps inconnu", { status: 400 });
    }
  }

  if (!refCommand || !apiKeySha256 || !apiSecretSha256) {
    return new Response("Paramètres IPN requis manquants", { status: 400 });
  }

  // 1. Vérification de la signature IPN.
  const myApiKeyHashed = await sha256Hex(PAYTECH_API_KEY);
  const myApiSecretHashed = await sha256Hex(PAYTECH_API_SECRET);

  const isValid = timingSafeEqual(apiKeySha256, myApiKeyHashed) && timingSafeEqual(apiSecretSha256, myApiSecretHashed);
  if (!isValid) {
    return new Response("Signature IPN invalide", { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // 2. Dédupliquer via processed_events.
  const eventId = `synthetic-${refCommand}`;
  const { error: dedupErr } = await admin
    .from("processed_events")
    .insert({ provider: "paytech", event_id: eventId });
  if (dedupErr) {
    // Déjà traité, renvoie 200 pour accuser réception à PayTech.
    return new Response(JSON.stringify({ received: true, deduped: true }), { status: 200 });
  }

  // 3. Récupérer la ligne de paiement correspondante.
  const { data: payment, error: fetchErr } = await admin
    .from("subscription_payments")
    .select("*")
    .eq("id", refCommand)
    .maybeSingle();

  if (fetchErr || !payment) {
    return new Response(JSON.stringify({ received: true, unknown: true }), { status: 200 });
  }

  // Échec si déjà traité pour des raisons de cohérence de flux.
  if (payment.status !== "pending") {
    return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
  }

  // 4. Contrôle anti-altération du montant.
  if (itemPrice !== payment.amount) {
    await admin
      .from("subscription_payments")
      .update({
        status: "failed",
        failure_reason: `Montant divergent : attendu ${payment.amount}, reçu ${itemPrice}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    return new Response(JSON.stringify({ received: true, amountMismatch: true }), { status: 200 });
  }

  // 5. Activation idempotente (passe 'pending' → 'completed' et active/prolonge l'abonnement).
  await admin.rpc("complete_subscription_payment", {
    p_payment_id: payment.id,
    p_tx_id: refCommand,
  });

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
