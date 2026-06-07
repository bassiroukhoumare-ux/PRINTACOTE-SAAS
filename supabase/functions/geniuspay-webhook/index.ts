// Edge Function : réception des webhooks GeniusPay.
//
// 1. Lit le corps BRUT (nécessaire pour la signature)
// 2. Vérifie la signature HMAC-SHA256 (X-Webhook-Signature + X-Webhook-Timestamp)
// 3. Rejette si timestamp > 5 min (anti-rejeu)
// 4. Ne traite que payment.success ; marque failed pour failed/cancelled/expired
// 5. Déduplique via processed_events (event_id = payload.id)
// 6. Retrouve la ligne via metadata.payment_id (fallback reference)
// 7. Contrôle anti-altération du montant
// 8. Re-query GET /payments/{reference} → exige status=completed
// 9. Active via complete_subscription_payment (idempotent)
//
// Déployée SANS vérification de JWT.
//
// Secrets requis :
//   GENIUSPAY_API_KEY, GENIUSPAY_API_SECRET, GENIUSPAY_WEBHOOK_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getGeniusPayPayment, verifyGeniusPaySignature } from "../_shared/geniuspay.ts";

function ok(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const API_KEY = Deno.env.get("GENIUSPAY_API_KEY");
  const API_SECRET = Deno.env.get("GENIUSPAY_API_SECRET");
  const WEBHOOK_SECRET = Deno.env.get("GENIUSPAY_WEBHOOK_SECRET");

  if (!API_KEY || !API_SECRET || !WEBHOOK_SECRET) {
    console.error("Configuration GeniusPay manquante (clés ou secret webhook)");
    return new Response("Configuration manquante", { status: 500 });
  }

  // 1. Corps brut + headers de signature.
  const rawBody = await req.text();
  const signature = req.headers.get("X-Webhook-Signature") || "";
  const timestamp = req.headers.get("X-Webhook-Timestamp") || "";

  // 2. Vérifier la signature.
  const validSig = await verifyGeniusPaySignature(timestamp, rawBody, signature, WEBHOOK_SECRET);
  if (!validSig) {
    console.error("Signature webhook GeniusPay invalide");
    return new Response("Signature invalide", { status: 401 });
  }

  // 3. Anti-rejeu : timestamp < 5 min.
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.error("Timestamp webhook trop ancien ou invalide");
    return new Response("Timestamp invalide", { status: 400 });
  }

  // 4. Parser le payload.
  let payload: {
    id?: string;
    event?: string;
    data?: { reference?: string; amount?: number; status?: string; metadata?: { payment_id?: string } };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Payload invalide", { status: 400 });
  }

  const event = payload.event || "";
  const data = payload.data || {};
  const reference = data.reference || "";
  const paymentId = data.metadata?.payment_id || "";

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // 5. Déduplication (sur l'id de livraison du webhook).
  const eventId = payload.id || `${reference}-${event}`;
  const { error: dedupErr } = await admin
    .from("processed_events")
    .insert({ provider: "geniuspay", event_id: eventId });
  if (dedupErr) {
    console.log(`Événement GeniusPay déjà traité: ${eventId}`);
    return ok({ received: true, deduped: true });
  }

  // 6. Retrouver la ligne de paiement (via notre UUID, fallback reference).
  let query = admin.from("subscription_payments").select("*");
  query = paymentId ? query.eq("id", paymentId) : query.eq("provider_transaction_id", reference);
  const { data: payment, error: fetchErr } = await query.maybeSingle();

  if (fetchErr || !payment) {
    console.error(`Paiement GeniusPay introuvable (pid=${paymentId}, ref=${reference})`);
    return ok({ received: true, unknown: true });
  }

  // 7. Événements non-succès → marquer failed (si encore pending) et sortir.
  if (event !== "payment.success") {
    if (["payment.failed", "payment.cancelled", "payment.expired"].includes(event)) {
      await admin
        .from("subscription_payments")
        .update({ status: "failed", failure_reason: event, updated_at: new Date().toISOString() })
        .eq("id", payment.id)
        .eq("status", "pending");
    }
    return ok({ received: true, ignored: event });
  }

  // 8. Contrôle anti-altération du montant.
  if (typeof data.amount === "number" && Math.round(data.amount) !== payment.amount) {
    console.error(`Montant divergent (${payment.id}) : attendu ${payment.amount}, reçu ${data.amount}`);
    await admin
      .from("subscription_payments")
      .update({
        status: "failed",
        failure_reason: `Montant divergent : attendu ${payment.amount}, reçu ${data.amount}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    return ok({ received: true, amountMismatch: true });
  }

  // 9. Re-query de confirmation : le webhook seul n'active pas.
  const verify = await getGeniusPayPayment(reference, API_KEY, API_SECRET);
  if (!verify.ok || verify.status !== "completed") {
    console.error(`Re-query GeniusPay non confirmée pour ${reference}: ${JSON.stringify(verify)}`);
    return ok({ received: true, notConfirmed: true });
  }

  // 10. Activer l'abonnement (idempotent).
  console.log(`Activation abonnement ${payment.id} (GeniusPay)`);
  const { data: success, error: rpcErr } = await admin.rpc("complete_subscription_payment", {
    p_payment_id: payment.id,
    p_tx_id: reference || "geniuspay-webhook",
  });
  if (rpcErr) {
    console.error("Erreur RPC complete_subscription_payment :", rpcErr);
    return new Response("Erreur interne", { status: 500 });
  }

  return ok({ received: true, activated: success });
});
