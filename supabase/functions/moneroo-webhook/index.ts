// Edge Function : réception des webhooks Moneroo.
//
// 1. Vérifie la signature HMAC-SHA256 sur le corps BRUT (X-Moneroo-Signature)
// 2. Déduplique via processed_events (id synthétique = sha256(rawBody))
// 3. Re-vérifie le paiement auprès de Moneroo (défense en profondeur)
// 4. Contrôle anti-altération du montant
// 5. Active l'abonnement de façon idempotente (RPC complete_subscription_payment)
//
// Cette fonction doit être déployée SANS vérification de JWT
// (voir supabase/config.toml → verify_jwt = false), car Moneroo l'appelle
// sans token utilisateur.
//
// Secret requis : MONEROO_WEBHOOK_SECRET (Dashboard Moneroo → Developers → Webhooks)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseMonerooEvent,
  sha256Hex,
  verifyMonerooSignature,
  verifyPayment,
} from "../_shared/moneroo.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const MONEROO_SECRET_KEY = Deno.env.get("MONEROO_SECRET_KEY");
  const MONEROO_WEBHOOK_SECRET = Deno.env.get("MONEROO_WEBHOOK_SECRET");

  if (!MONEROO_WEBHOOK_SECRET || !MONEROO_SECRET_KEY) {
    return new Response("Configuration manquante", { status: 500 });
  }

  // Corps BRUT obligatoire pour le HMAC (ne PAS re-stringifier le JSON parsé).
  const rawBody = await req.text();

  // 1. Vérifier la signature.
  const signature = req.headers.get("X-Moneroo-Signature");
  const valid = await verifyMonerooSignature(rawBody, signature, MONEROO_WEBHOOK_SECRET);
  if (!valid) return new Response("Signature invalide", { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }

  const event = parseMonerooEvent(body);
  // payment.initiated ou événement non géré → accusé de réception sans action.
  if (!event) return new Response(JSON.stringify({ received: true }), { status: 200 });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // 2. Dédup : id synthétique à partir du corps brut.
  const eventId = `synthetic-${(await sha256Hex(rawBody)).slice(0, 32)}`;
  const { error: dedupErr } = await admin
    .from("processed_events")
    .insert({ provider: "moneroo", event_id: eventId });
  if (dedupErr) {
    // Violation de clé primaire → déjà traité.
    return new Response(JSON.stringify({ received: true, deduped: true }), { status: 200 });
  }

  // Retrouver notre ligne de paiement (via metadata.paymentId, sinon via tx id).
  let query = admin.from("subscription_payments").select("*").limit(1);
  query = event.paymentId
    ? query.eq("id", event.paymentId)
    : query.eq("provider_transaction_id", event.providerTransactionId);
  const { data: payment } = await query.maybeSingle();

  if (!payment) return new Response(JSON.stringify({ received: true, unknown: true }), { status: 200 });

  // Échec déclaré par Moneroo → on marque échec et on s'arrête.
  if (event.status === "failed") {
    await admin
      .from("subscription_payments")
      .update({
        status: "failed",
        failure_reason: event.failureReason ?? "payment.failed",
        webhook_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // 3. Re-vérification auprès de Moneroo (défense en profondeur).
  const live = await verifyPayment(event.providerTransactionId, MONEROO_SECRET_KEY);
  if (!live || live.status !== "success") {
    return new Response(JSON.stringify({ received: true, requeryMismatch: true }), { status: 200 });
  }

  // 4. Contrôle anti-altération du montant (Moneroo règle au franc près).
  const liveAmount = live.amount ?? event.reportedAmount;
  if (typeof liveAmount === "number" && liveAmount !== payment.amount) {
    await admin
      .from("subscription_payments")
      .update({
        status: "failed",
        failure_reason: `Montant divergent : attendu ${payment.amount}, reçu ${liveAmount}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    return new Response(JSON.stringify({ received: true, amountMismatch: true }), { status: 200 });
  }

  // 5. Activation idempotente (passe 'pending' → 'completed' et prolonge l'abo).
  await admin.rpc("complete_subscription_payment", {
    p_payment_id: payment.id,
    p_tx_id: event.providerTransactionId,
  });

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
