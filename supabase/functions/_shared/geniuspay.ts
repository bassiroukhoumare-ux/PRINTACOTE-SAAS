// Adaptateur GeniusPay pour Edge Functions Deno.
// Référence API : https://geniuspay.ci/docs/api

const GENIUSPAY_API_URL = "https://geniuspay.ci/api/v1/merchant";
const FETCH_TIMEOUT_MS = 15_000;

// ── Catalogue serveur des formules (source de vérité anti-fraude) ────
// DOIT rester aligné avec src/lib/subscription.js et _shared/paytech.ts.
export const PLANS: Record<string, { months: number; amount: number }> = {
  "1m":  { months: 1,  amount: 200 },   // Prix de test (min GeniusPay = 200 FCFA)
  "3m":  { months: 3,  amount: 18659 },
  "1an": { months: 12, amount: 75000 },
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

  let parsed: { success?: boolean; data?: { reference?: string; checkout_url?: string; payment_url?: string }; message?: string; error?: { code?: string; message?: string } };
  try {
    parsed = (await res.json()) as typeof parsed;
  } catch {
    return { ok: false, error: `GeniusPay a répondu ${res.status} (non-JSON ; montant < 200 FCFA ou clés invalides ?)` };
  }

  const data = parsed.data;
  const checkoutUrl = data?.checkout_url || data?.payment_url;
  if (!parsed.success || !data?.reference || !checkoutUrl) {
    return { ok: false, error: parsed.error?.message || parsed.message || `GeniusPay a répondu success=${parsed.success}` };
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
