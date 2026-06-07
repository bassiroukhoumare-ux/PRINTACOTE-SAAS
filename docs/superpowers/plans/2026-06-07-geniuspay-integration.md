# Intégration GeniusPay — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher GeniusPay comme passerelle de paiement des abonnements Printacote (checkout hébergé + webhook signé), en réutilisant l'infra d'abonnement existante.

**Architecture:** 3ᵉ passerelle clonée sur le patron PayTech/Moneroo : un adaptateur Deno partagé, une Edge Function `geniuspay-checkout` (JWT, prix serveur, insertion `subscription_payments` pending, appel `POST /payments`) et une Edge Function `geniuspay-webhook` (vérif HMAC, anti-rejeu, dédup, re-query GET, activation idempotente). Côté front, `SubscriptionPanel` pointe sur GeniusPay et l'onglet « Facturation » est ré-affiché sans réactiver le paywall.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), React 19 + Vite, API GeniusPay v1 (`https://geniuspay.ci/api/v1/merchant`).

**Pas de suite de tests automatisée** dans le projet : la vérification de chaque tâche front se fait via `npm run lint` + `npm run build` ; les Edge Functions sont vérifiées par revue + le test sandbox de bout en bout (Task 8).

---

### Task 1 : Adaptateur partagé `_shared/geniuspay.ts`

**Files:**
- Create: `supabase/functions/_shared/geniuspay.ts`

- [ ] **Step 1 : Écrire l'adaptateur complet**

```typescript
// Adaptateur GeniusPay pour Edge Functions Deno.
// Référence API : https://geniuspay.ci/docs/api

const GENIUSPAY_API_URL = "https://geniuspay.ci/api/v1/merchant";
const FETCH_TIMEOUT_MS = 15_000;

// ── Catalogue serveur des formules (source de vérité anti-fraude) ────
// DOIT rester aligné avec src/lib/subscription.js et _shared/paytech.ts.
export const PLANS: Record<string, { months: number; amount: number }> = {
  "1m": { months: 1, amount: 150 }, // Prix de test temporaire à 150 FCFA
  "3m": { months: 3, amount: 12000 },
  "6m": { months: 6, amount: 20000 },
};

export type InitiateGeniusPayParams = {
  paymentId: string; // notre UUID (corrélation via metadata.payment_id)
  ownerId: string;
  plan: string;
  amount: number;
  description: string;
  successUrl: string;
  errorUrl: string;
};

export type InitiateGeniusPayResult =
  | { ok: true; reference: string; checkoutUrl: string }
  | { ok: false; error: string };

async function geniusFetch(path: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${GENIUSPAY_API_URL}${path}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(apiKey: string, apiSecret: string): HeadersInit {
  return {
    "X-API-Key": apiKey,
    "X-API-Secret": apiSecret,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

/** Crée un paiement (mode checkout hébergé : pas de payment_method). */
export async function initiateGeniusPayPayment(
  params: InitiateGeniusPayParams,
  apiKey: string,
  apiSecret: string
): Promise<InitiateGeniusPayResult> {
  const body = {
    amount: params.amount,
    currency: "XOF",
    description: params.description,
    success_url: params.successUrl,
    error_url: params.errorUrl,
    metadata: {
      payment_id: params.paymentId,
      owner_id: params.ownerId,
      plan: params.plan,
    },
  };

  let res: Response;
  try {
    res = await geniusFetch("/payments", {
      method: "POST",
      headers: authHeaders(apiKey, apiSecret),
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: `Erreur réseau GeniusPay : ${(err as Error).message}` };
  }

  let parsed: { success?: boolean; data?: { reference?: string; checkout_url?: string; payment_url?: string }; message?: string };
  try {
    parsed = (await res.json()) as typeof parsed;
  } catch {
    return { ok: false, error: `GeniusPay a répondu ${res.status} (non-JSON)` };
  }

  const data = parsed.data;
  const checkoutUrl = data?.checkout_url || data?.payment_url;
  if (!parsed.success || !data?.reference || !checkoutUrl) {
    return { ok: false, error: parsed.message || `GeniusPay a répondu success=${parsed.success}` };
  }

  return { ok: true, reference: data.reference, checkoutUrl };
}

/** Re-query d'une transaction par référence (confirmation côté webhook). */
export async function getGeniusPayPayment(
  reference: string,
  apiKey: string,
  apiSecret: string
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await geniusFetch(`/payments/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: authHeaders(apiKey, apiSecret),
    });
  } catch (err) {
    return { ok: false, error: `Erreur réseau GeniusPay (GET) : ${(err as Error).message}` };
  }

  let parsed: { success?: boolean; data?: { status?: string } };
  try {
    parsed = (await res.json()) as typeof parsed;
  } catch {
    return { ok: false, error: `GeniusPay GET a répondu ${res.status} (non-JSON)` };
  }

  if (!parsed.success || !parsed.data?.status) {
    return { ok: false, error: `GeniusPay GET success=${parsed.success}` };
  }
  return { ok: true, status: parsed.data.status };
}

/**
 * Vérifie la signature webhook GeniusPay.
 * Format : HMAC-SHA256(timestamp + "." + rawBody, webhookSecret) en hex.
 * On utilise le corps BRUT reçu (pas un re-JSON.stringify) pour éviter les
 * divergences d'ordre de clés.
 */
export async function verifyGeniusPaySignature(
  timestamp: string,
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  );
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expected, (signature || "").toLowerCase());
}

/** Comparaison à temps constant de deux chaînes hex de même longueur. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
```

- [ ] **Step 2 : Vérifier la syntaxe TypeScript**

Run (si Deno est installé) : `deno check "supabase/functions/_shared/geniuspay.ts"`
Expected : aucune erreur. (Si Deno absent, relecture manuelle — le fichier n'a pas de dépendance externe.)

- [ ] **Step 3 : Commit**

```bash
git add supabase/functions/_shared/geniuspay.ts
git commit -m "feat: adaptateur GeniusPay partagé (checkout, re-query, signature)"
```

---

### Task 2 : Déclaration des fonctions dans `config.toml`

**Files:**
- Modify: `supabase/config.toml` (après le bloc `[functions.paytech-webhook]`)

- [ ] **Step 1 : Ajouter les deux blocs**

Ajouter à la fin du fichier :

```toml
# GeniusPay checkout exige un utilisateur connecté
[functions.geniuspay-checkout]
verify_jwt = true

# GeniusPay appelle le webhook sans token utilisateur -> pas de vérification JWT.
# La sécurité repose sur la signature HMAC X-Webhook-Signature.
[functions.geniuspay-webhook]
verify_jwt = false
```

- [ ] **Step 2 : Commit**

```bash
git add supabase/config.toml
git commit -m "feat: déclaration des Edge Functions GeniusPay (verify_jwt)"
```

---

### Task 3 : Edge Function `geniuspay-checkout`

**Files:**
- Create: `supabase/functions/geniuspay-checkout/index.ts`

- [ ] **Step 1 : Écrire la fonction (calquée sur `paytech-checkout`)**

```typescript
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
```

- [ ] **Step 2 : Vérifier la syntaxe**

Run (si Deno installé) : `deno check "supabase/functions/geniuspay-checkout/index.ts"`
Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add supabase/functions/geniuspay-checkout/index.ts
git commit -m "feat: Edge Function geniuspay-checkout (init paiement abonnement)"
```

---

### Task 4 : Edge Function `geniuspay-webhook`

**Files:**
- Create: `supabase/functions/geniuspay-webhook/index.ts`

- [ ] **Step 1 : Écrire la fonction (calquée sur `paytech-webhook`)**

```typescript
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
```

- [ ] **Step 2 : Vérifier la syntaxe**

Run (si Deno installé) : `deno check "supabase/functions/geniuspay-webhook/index.ts"`
Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add supabase/functions/geniuspay-webhook/index.ts
git commit -m "feat: Edge Function geniuspay-webhook (vérif signature, re-query, activation)"
```

---

### Task 5 : Brancher `SubscriptionPanel` sur GeniusPay

**Files:**
- Modify: `src/components/SubscriptionPanel.jsx`

- [ ] **Step 1 : Remplacer l'invocation Moneroo par GeniusPay**

Dans `src/components/SubscriptionPanel.jsx`, remplacer :

```javascript
            const { data, error } = await supabase.functions.invoke('moneroo-checkout', {
                body: { plan: planId },
            });
            if (error) throw error;
            if (!data?.checkoutUrl) throw new Error("Réponse de paiement invalide.");
            // Redirection vers la page de paiement hébergée Moneroo.
            window.location.href = data.checkoutUrl;
```

par :

```javascript
            const { data, error } = await supabase.functions.invoke('geniuspay-checkout', {
                body: { plan: planId },
            });
            if (error) throw error;
            if (!data?.checkoutUrl) throw new Error("Réponse de paiement invalide.");
            // Redirection vers la page de checkout hébergée GeniusPay.
            window.location.href = data.checkoutUrl;
```

- [ ] **Step 2 : Mettre à jour le commentaire d'en-tête + le libellé du bandeau passerelle**

Remplacer le commentaire :

```javascript
// Grille des formules + lancement du checkout Moneroo.
// Utilisé à la fois dans l'onglet "Facturation" et dans le paywall.
```

par :

```javascript
// Grille des formules + lancement du checkout GeniusPay.
// Utilisé dans l'onglet "Facturation" du dashboard.
```

Puis remplacer le bloc bandeau passerelle (logo + texte PayTech) :

```javascript
            <div className={`flex items-center justify-center gap-2 text-xs font-bold ${dark ? 'text-white/40' : 'text-dark/40'}`}>
                <img src="https://paytech.sn/assets/srcs/img/logo_paytech.png" className="h-4 w-auto grayscale opacity-50" alt="PayTech" />
                Paiement sécurisé via PayTech — Mobile Money (Wave, Orange Money…) & carte bancaire.
            </div>
```

par :

```javascript
            <div className={`flex items-center justify-center gap-2 text-xs font-bold ${dark ? 'text-white/40' : 'text-dark/40'}`}>
                <ShieldCheck size={16} className="opacity-50" />
                Paiement sécurisé via GeniusPay — Mobile Money (Wave, Orange, MTN, Moov) & carte bancaire.
            </div>
```

(`ShieldCheck` est déjà importé en haut du fichier.)

- [ ] **Step 3 : Vérifier lint + build**

Run : `npm run lint`
Expected : aucune nouvelle erreur dans `SubscriptionPanel.jsx`.

Run : `npm run build`
Expected : build OK (`dist/` généré sans erreur).

- [ ] **Step 4 : Commit**

```bash
git add src/components/SubscriptionPanel.jsx
git commit -m "feat: SubscriptionPanel branché sur geniuspay-checkout"
```

---

### Task 6 : Ré-afficher l'onglet « Facturation » + polling au retour de paiement

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1 : Ajouter l'entrée de menu « Facturation »**

Dans `src/pages/DashboardPage.jsx`, dans le tableau `menuItems` (vers la ligne 649), ajouter l'entrée `billing` juste avant `support` :

```javascript
    const menuItems = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
        { id: 'profile', label: 'Profil Public', icon: User },
        { id: 'services', label: 'Mes Services', icon: Wrench },
        { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
        { id: 'marketplace', label: 'Ma Boutique', icon: Store },
        { id: 'reviews', label: 'Avis Clients', icon: Star },
        { id: 'billing', label: 'Facturation', icon: CreditCard },
        { id: 'support', label: 'Contact Support', icon: MessageCircle },
    ];
```

(`CreditCard` est déjà importé ligne 7.)

- [ ] **Step 2 : Garder `billing` hors de la barre mobile réduite**

À la ligne ~1089, le filtre `menuItems.filter(item => !['billing', 'support'].includes(item.id))` exclut `billing` de la barre de navigation mobile compacte. Le **laisser tel quel** : `billing` reste accessible via le menu latéral (desktop) et n'encombre pas la barre mobile. Aucune modification ici.

- [ ] **Step 3 : Ajouter le rendu du contenu de l'onglet `billing`**

Juste après le bloc `{activeTab === 'reviews' && ...}` (ligne ~1221) et avant `{activeTab === 'support' && (`, insérer :

```javascript
                        {activeTab === 'billing' && (
                            <SubscriptionPanel printerData={printerData} user={user} showToast={showToast} />
                        )}
```

- [ ] **Step 4 : Polling au retour de la passerelle (`?payment=return`)**

Ajouter ce `useEffect` parmi les autres effets du composant (par ex. juste après le bloc « Auto-refresh support messages list » vers la ligne 312). Il bascule sur l'onglet Facturation, re-fetch les données plusieurs fois pour capter l'activation par le webhook, puis nettoie l'URL :

```javascript
    // Retour de la passerelle de paiement GeniusPay : on re-poll les données
    // quelques fois pour capter l'activation déclenchée par le webhook.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment = params.get('payment');
        if (!payment || printerData?.isMock) return;

        setActiveTab('billing');
        if (payment === 'return') {
            showToast?.('Paiement en cours de validation…', 'success');
            let tries = 0;
            const interval = setInterval(() => {
                tries += 1;
                fetchPrinterData?.();
                if (tries >= 5) clearInterval(interval);
            }, 3000);
            // Nettoyer l'URL pour éviter de re-déclencher au refresh.
            window.history.replaceState({}, '', '/dashboard');
            return () => clearInterval(interval);
        }
        if (payment === 'cancel') {
            showToast?.('Paiement annulé.', 'error');
            window.history.replaceState({}, '', '/dashboard');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printerData?.isMock]);
```

> Vérifier au passage que `fetchPrinterData` et `setActiveTab` sont bien définis dans la portée du composant (ils le sont : `fetchPrinterData` est passé aux sous-composants, `setActiveTab` pilote `activeTab`). Si le callback s'appelle différemment dans le fichier, utiliser le nom réel.

- [ ] **Step 5 : Vérifier lint + build**

Run : `npm run lint`
Expected : aucune nouvelle erreur dans `DashboardPage.jsx`.

Run : `npm run build`
Expected : build OK.

- [ ] **Step 6 : Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: ré-affichage onglet Facturation + polling retour paiement"
```

---

### Task 7 : Documentation déploiement + secrets

**Files:**
- Modify: `supabase/functions/README.md`

- [ ] **Step 1 : Ajouter une section GeniusPay au README**

Ajouter à la fin de `supabase/functions/README.md` :

```markdown
## GeniusPay

Passerelle active côté front (les fonctions Moneroo/PayTech restent déployables mais ne
sont plus proposées dans l'UI).

### Secrets (jamais commités)

```bash
supabase secrets set GENIUSPAY_API_KEY="pk_sandbox_xxx"
supabase secrets set GENIUSPAY_API_SECRET="sk_sandbox_xxx"
supabase secrets set GENIUSPAY_WEBHOOK_SECRET="whsec_xxx"
# SITE_URL déjà défini ; sinon :
supabase secrets set SITE_URL="https://printacote.com"
```

Passage en production : remplacer les clés `pk_sandbox_`/`sk_sandbox_` par `pk_live_`/`sk_live_`.

### Déploiement

```bash
supabase functions deploy geniuspay-checkout
supabase functions deploy geniuspay-webhook
```

### Webhook GeniusPay

Dans le dashboard GeniusPay (ou via `POST /webhooks`), enregistrer l'URL :

```
https://<project-ref>.supabase.co/functions/v1/geniuspay-webhook
```

abonnée aux événements : `payment.success`, `payment.failed`, `payment.cancelled`,
`payment.expired`. Le secret renvoyé (`whsec_...`) doit correspondre à `GENIUSPAY_WEBHOOK_SECRET`.
```

- [ ] **Step 2 : Commit**

```bash
git add supabase/functions/README.md
git commit -m "docs: déploiement et secrets GeniusPay"
```

---

### Task 8 : Vérification sandbox de bout en bout (manuel)

**Files:** aucun (validation).

- [ ] **Step 1 : Déposer les secrets sandbox**

```bash
supabase secrets set GENIUSPAY_API_KEY="pk_sandbox_..."
supabase secrets set GENIUSPAY_API_SECRET="sk_sandbox_..."
supabase secrets set GENIUSPAY_WEBHOOK_SECRET="whsec_..."
```

- [ ] **Step 2 : Déployer les fonctions**

Run : `supabase functions deploy geniuspay-checkout && supabase functions deploy geniuspay-webhook`
Expected : déploiement réussi des deux fonctions.

- [ ] **Step 3 : Enregistrer le webhook GeniusPay**

Créer le webhook pointant sur `…/functions/v1/geniuspay-webhook`, abonné à `payment.success` (+ failed/cancelled/expired). Vérifier que le `whsec_` correspond au secret déposé.

- [ ] **Step 4 : Test de paiement**

Depuis le dashboard d'un compte réel (non-mock) → onglet « Facturation » → « Souscrire » sur le plan 1 mois (150 FCFA) → page checkout GeniusPay → payer en sandbox → vérifier la redirection vers `/dashboard?payment=return`.

- [ ] **Step 5 : Vérifier l'activation en base**

Dans Supabase (SQL editor), vérifier :
- `subscription_payments` : la ligne est passée `pending → completed`, `provider='geniuspay'`.
- `printers` : `subscription_ends_at` prolongé, `subscription_status='active'`.

- [ ] **Step 6 : Vérifier l'idempotence**

Re-livrer le même webhook (bouton « Tester » côté GeniusPay) → la réponse doit être `deduped` (ou `activated:false`), sans double prolongation de `subscription_ends_at`.

---

## Notes de cohérence

- `src/lib/subscription.js` (`PLANS` : `1m`=150, `3m`=12000, `6m`=20000) est **déjà aligné**
  avec le catalogue serveur `_shared/geniuspay.ts` — aucune modification requise, mais toute
  évolution de prix doit toucher **les deux** fichiers.
- Le paywall reste désactivé : on n'ajoute aucun rendu conditionné par `hasAccess`.
- Moneroo/PayTech restent en place (code + secrets) mais ne sont plus invoqués par l'UI.
