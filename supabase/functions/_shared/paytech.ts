// Adaptateur PayTech pour Edge Functions Deno.
// Référence API PayTech SN : https://doc.intech.sn/doc_paytech.php

const PAYTECH_API_URL = "https://paytech.sn/api";
const FETCH_TIMEOUT_MS = 15_000;

export type InitiatePayTechParams = {
  paymentId: string; // notre UUID (ref_command)
  itemName: string;
  itemPrice: number;
  commandName: string;
  ipnUrl: string;
  successUrl: string;
  cancelUrl: string;
};

export type InitiatePayTechResult =
  | { ok: true; token: string; redirectUrl: string }
  | { ok: false; error: string };

async function paytechFetch(path: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${PAYTECH_API_URL}${path}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Initialise un paiement hébergé PayTech. Renvoie l'URL de redirection. */
export async function initiatePayTechPayment(
  params: InitiatePayTechParams,
  apiKey: string,
  apiSecret: string,
  isTest = true
): Promise<InitiatePayTechResult> {
  const body = {
    item_name: params.itemName,
    item_price: params.itemPrice,
    currency: "XOF",
    ref_command: params.paymentId,
    command_name: params.commandName,
    env: isTest ? "test" : "prod",
    ipn_url: params.ipnUrl,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    custom_field: JSON.stringify({ paymentId: params.paymentId })
  };

  let res: Response;
  try {
    res = await paytechFetch("/payment/request-payment", {
      method: "POST",
      headers: {
        "API_KEY": apiKey,
        "API_SECRET": apiSecret,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: `Erreur réseau PayTech : ${(err as Error).message}` };
  }

  let parsed: { success?: number; token?: string; redirect_url?: string; error?: string[] | string };
  try {
    parsed = (await res.json()) as typeof parsed;
  } catch {
    return { ok: false, error: `PayTech a répondu ${res.status} (non-JSON)` };
  }

  if (parsed.success !== 1 || !parsed.token || !parsed.redirect_url) {
    const errorMsg = Array.isArray(parsed.error) ? parsed.error.join(", ") : (parsed.error || `PayTech a répondu success=${parsed.success}`);
    return { ok: false, error: errorMsg };
  }

  return {
    ok: true,
    token: parsed.token,
    redirectUrl: parsed.redirect_url,
  };
}

/** SHA-256 hex d'un message (utilisé pour vérifier l'IPN PayTech). */
export async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparaison à temps constant de deux chaînes hex de même longueur. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Catalogue serveur des formules (source de vérité anti-fraude) ────
export const PLANS: Record<string, { months: number; amount: number }> = {
  "1m": { months: 1, amount: 150 }, // Prix de test temporaire à 150 FCFA
  "3m": { months: 3, amount: 12000 },
  "6m": { months: 6, amount: 20000 },
};
