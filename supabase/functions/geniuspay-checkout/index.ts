// Edge Function : initialisation d'un paiement d'abonnement GeniusPay.
//
// Flux : authentifie l'imprimeur (JWT) → lit le prix côté serveur (anti-fraude)
// → insère une ligne subscription_payments 'pending' AVANT d'appeler GeniusPay
// → appelle GeniusPay POST /payments (mode checkout) → renvoie { checkoutUrl }.
//
// Secrets requis (supabase secrets set ...) :
//   GENIUSPAY_API_KEY      — clé publique GeniusPay (pk_...)
//   GENIUSPAY_API_SECRET   — clé secrète GeniusPay (sk_...)
//   SITE_URL               — origine publique du site (ex. https://printacote.com)
// Fournis automatiquement par la plateforme : SUPABASE_URL,
//   SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { initiateGeniusPayPayment, PLANS } from "../_shared/geniuspay.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const GENIUSPAY_API_KEY = Deno.env.get("GENIUSPAY_API_KEY");
  const GENIUSPAY_API_SECRET = Deno.env.get("GENIUSPAY_API_SECRET");
  const SITE_URL = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");

  if (!GENIUSPAY_API_KEY || !GENIUSPAY_API_SECRET) {
    return json({ error: "Configuration GeniusPay manquante sur le serveur" }, 500);
  }

  // 1. Authentifier l'utilisateur via son JWT (décodage direct : l'API Gateway
  //    valide déjà la signature via verify_jwt = true).
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  let user: { id: string; email: string } | null = null;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload && payload.sub) user = { id: payload.sub, email: payload.email };
    }
  } catch (err) {
    console.error("Erreur de décodage JWT:", err);
  }
  if (!user) return json({ error: "Non authentifié" }, 401);

  // 2. Valider la formule + lire le prix CÔTÉ SERVEUR.
  let plan: string;
  try {
    ({ plan } = await req.json());
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }
  const planDef = PLANS[plan];
  if (!planDef) return json({ error: "Formule inconnue" }, 400);

  // 3. Récupérer le profil imprimeur (service role : contourne la RLS).
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: printer, error: printerErr } = await admin
    .from("printers")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();
  if (printerErr || !printer) return json({ error: "Profil imprimeur introuvable" }, 404);

  // 4. Insérer la ligne de paiement 'pending' AVANT d'appeler GeniusPay.
  const { data: payment, error: insertErr } = await admin
    .from("subscription_payments")
    .insert({
      printer_id: printer.id,
      owner_id: user.id,
      plan,
      months: planDef.months,
      amount: planDef.amount,
      currency: "XOF",
      status: "pending",
      provider: "geniuspay",
    })
    .select("id")
    .single();
  if (insertErr || !payment) return json({ error: "Création du paiement impossible" }, 500);

  // 5. Initialiser le paiement GeniusPay (mode checkout).
  const result = await initiateGeniusPayPayment(
    {
      paymentId: payment.id,
      ownerId: user.id,
      plan,
      amount: planDef.amount,
      description: `Abonnement Printacote ${planDef.months} mois`,
      successUrl: `${SITE_URL}/dashboard?payment=return&pid=${payment.id}`,
      errorUrl: `${SITE_URL}/dashboard?payment=cancel&pid=${payment.id}`,
    },
    GENIUSPAY_API_KEY,
    GENIUSPAY_API_SECRET
  );

  if (!result.ok) {
    await admin
      .from("subscription_payments")
      .update({ status: "failed", failure_reason: result.error, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return json({ error: result.error }, 502);
  }

  // 6. Mémoriser la référence GeniusPay + l'URL de checkout.
  await admin
    .from("subscription_payments")
    .update({
      provider_transaction_id: result.reference,
      checkout_url: result.checkoutUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  return json({ checkoutUrl: result.checkoutUrl, paymentId: payment.id });
});
