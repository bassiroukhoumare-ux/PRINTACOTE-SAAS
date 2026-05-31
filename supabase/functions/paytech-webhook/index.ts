// Edge Function : réception des webhooks (IPN) de PayTech SN.
//
// 1. Reçoit la notification en application/x-www-form-urlencoded
// 2. Vérifie la clé/secrète via la comparaison SHA256 (api_key_sha256, api_secret_sha256)
// 3. Déduplique via processed_events (id synthétique = ref_command + token)
// 4. Contrôle anti-altération du montant (item_price)
// 5. Active l'abonnement via complete_subscription_payment RPC
//
// Cette fonction doit être déployée SANS vérification de JWT.
//
// Secrets requis (supabase secrets set ...) :
//   PAYTECH_API_KEY
//   PAYTECH_API_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256Hex, timingSafeEqual } from "../_shared/paytech.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const PAYTECH_API_KEY = Deno.env.get("PAYTECH_API_KEY");
  const PAYTECH_API_SECRET = Deno.env.get("PAYTECH_API_SECRET");

  if (!PAYTECH_API_KEY || !PAYTECH_API_SECRET) {
    console.error("Configuration PayTech manquante sur le serveur (API_KEY/SECRET)");
    return new Response("Configuration manquante", { status: 500 });
  }

  // PayTech envoie l'IPN en application/x-www-form-urlencoded
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);

  const incomingKeyHash = params.get("api_key_sha256") || "";
  const incomingSecretHash = params.get("api_secret_sha256") || "";
  
  // 1. Calculer les SHA-256 locaux des clés pour authentifier la provenance
  const expectedKeyHash = await sha256Hex(PAYTECH_API_KEY);
  const expectedSecretHash = await sha256Hex(PAYTECH_API_SECRET);

  const isAuthValid = timingSafeEqual(expectedKeyHash, incomingKeyHash) && 
                      timingSafeEqual(expectedSecretHash, incomingSecretHash);

  if (!isAuthValid) {
    console.error("Signature ou identifiants PayTech invalides");
    return new Response("Signature invalide", { status: 401 });
  }

  // 2. Extraire les détails de la transaction
  const paymentId = params.get("ref_command"); // Notre UUID de paiement
  const token = params.get("token") || ""; // Token de transaction PayTech
  const itemPrice = parseFloat(params.get("item_price") || "0"); // Prix payé

  if (!paymentId) {
    console.error("Paramètre ref_command (paymentId) manquant dans l'IPN PayTech");
    return new Response("ref_command requis", { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // 3. Déduplication
  const eventId = `paytech-${paymentId}-${token.slice(0, 30)}`;
  const { error: dedupErr } = await admin
    .from("processed_events")
    .insert({ provider: "paytech", event_id: eventId });

  if (dedupErr) {
    console.log(`Événement PayTech déjà traité: ${eventId}`);
    return new Response(JSON.stringify({ received: true, deduped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 4. Retrouver le paiement d'origine
  const { data: payment, error: fetchErr } = await admin
    .from("subscription_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchErr || !payment) {
    console.error(`Paiement ${paymentId} non trouvé dans la base de données`);
    return new Response(JSON.stringify({ received: true, unknown: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 5. Contrôle anti-altération du montant
  if (itemPrice !== payment.amount) {
    console.error(`Montant divergent pour le paiement ${paymentId}: attendu ${payment.amount}, reçu ${itemPrice}`);
    await admin
      .from("subscription_payments")
      .update({
        status: "failed",
        failure_reason: `Montant divergent : attendu ${payment.amount}, reçu ${itemPrice}`,
        updated_at: new Date().toISOString()
      })
      .eq("id", paymentId)
      .eq("status", "pending");

    return new Response(JSON.stringify({ received: true, amountMismatch: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 6. Activer l'abonnement
  console.log(`Activation de l'abonnement pour le paiement ${paymentId} (PayTech)`);
  const { data: success, error: rpcErr } = await admin.rpc("complete_subscription_payment", {
    p_payment_id: paymentId,
    p_tx_id: token || "paytech-ipn"
  });

  if (rpcErr) {
    console.error(`Erreur RPC complete_subscription_payment :`, rpcErr);
    return new Response("Erreur interne", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true, activated: success }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
