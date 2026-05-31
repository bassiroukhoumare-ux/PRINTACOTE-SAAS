// Edge Function : initialisation d'un paiement d'abonnement Moneroo.
//
// Flux : authentifie l'imprimeur (JWT) → lit le prix côté serveur (anti-fraude)
// → insère une ligne subscription_payments 'pending' AVANT d'appeler Moneroo
// → appelle Moneroo initialize → renvoie { checkoutUrl }.
//
// Secrets requis (supabase secrets set ...) :
//   MONEROO_SECRET_KEY  — clé secrète Moneroo
//   SITE_URL            — origine publique du site (ex. https://printacote.com)
// Fournis automatiquement par la plateforme : SUPABASE_URL,
//   SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { initiatePayment, PLANS } from "../_shared/moneroo.ts";

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
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const MONEROO_SECRET_KEY = Deno.env.get("MONEROO_SECRET_KEY");
  const SITE_URL = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");

  if (!MONEROO_SECRET_KEY) return json({ error: "Configuration Moneroo manquante" }, 500);

  // 1. Authentifier l'utilisateur via son JWT (décodage direct car l'API Gateway valide la signature via verify_jwt = true).
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  
  let user: { id: string; email: string } | null = null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload && payload.sub) {
        user = { id: payload.sub, email: payload.email };
      }
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
    .select("id, name, first_name, last_name, whatsapp")
    .eq("owner_id", user.id)
    .single();
  if (printerErr || !printer) return json({ error: "Profil imprimeur introuvable" }, 404);

  // 4. Insérer la ligne de paiement 'pending' AVANT d'appeler Moneroo
  //    (le webhook peut arriver avant notre réponse HTTP).
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
      provider: "moneroo",
    })
    .select("id")
    .single();
  if (insertErr || !payment) return json({ error: "Création du paiement impossible" }, 500);

  // 5. Initialiser le paiement Moneroo.
  const customerName =
    [printer.first_name, printer.last_name].filter(Boolean).join(" ").trim() || printer.name;
  const result = await initiatePayment(
    {
      amount: planDef.amount,
      currency: "XOF",
      description: `Abonnement Printacote ${planDef.months} mois`,
      returnUrl: `${SITE_URL}/dashboard?payment=return&pid=${payment.id}`,
      customerEmail: user.email!,
      customerName,
      customerPhone: printer.whatsapp || undefined,
      metadata: { paymentId: payment.id, ownerId: user.id, plan },
    },
    MONEROO_SECRET_KEY,
  );

  if (!result.ok) {
    await admin
      .from("subscription_payments")
      .update({ status: "failed", failure_reason: result.error, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return json({ error: result.error }, 502);
  }

  // 6. Mémoriser l'id de transaction + l'URL de checkout.
  await admin
    .from("subscription_payments")
    .update({
      provider_transaction_id: result.providerTransactionId,
      checkout_url: result.checkoutUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  return json({ checkoutUrl: result.checkoutUrl, paymentId: payment.id });
});
