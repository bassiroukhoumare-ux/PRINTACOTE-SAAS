// Adaptateur Moneroo pour Edge Functions Deno.
// Porté depuis le skill izisaas (examples/moneroo.ts), simplifié pour un
// usage mono-compte (la clé secrète vit dans les secrets de la fonction,
// pas en BYOK chiffré). Réf API : https://docs.moneroo.io/
//
// Crypto via Web Crypto (crypto.subtle) — disponible dans le runtime Deno.

const MONEROO_API_URL = "https://api.moneroo.io";
const FETCH_TIMEOUT_MS = 15_000;

export type InitiatePaymentParams = {
  amount: number; // entier, plus petite unité. XOF/XAF = francs entiers
  currency: "XOF" | "XAF" | "USD" | "EUR" | string;
  description: string;
  returnUrl: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
};

export type InitiatePaymentResult =
  | { ok: true; providerTransactionId: string; checkoutUrl: string }
  | { ok: false; error: string };

function splitName(
  full: string | undefined,
  fallbackEmail: string,
): { first: string; last: string } {
  const v = (full ?? "").trim();
  if (!v) {
    const local = fallbackEmail.split("@")[0] || "Customer";
    return { first: local, last: "-" };
  }
  const parts = v.split(/\s+/);
  return { first: parts[0]!, last: parts.slice(1).join(" ") || "-" };
}

async function monerooFetch(path: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${MONEROO_API_URL}${path}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Initialise un paiement hébergé Moneroo. Renvoie l'URL de checkout. */
export async function initiatePayment(
  params: InitiatePaymentParams,
  secretKey: string,
): Promise<InitiatePaymentResult> {
  const { first, last } = splitName(params.customerName, params.customerEmail);

  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: params.currency,
    description: params.description.slice(0, 200),
    return_url: params.returnUrl,
    customer: {
      email: params.customerEmail,
      first_name: first,
      last_name: last,
      ...(params.customerPhone ? { phone: params.customerPhone } : {}),
    },
    // Moneroo refuse les valeurs de metadata non-string (422) → tout en string.
    metadata: Object.fromEntries(
      Object.entries(params.metadata ?? {})
        .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
        .map(([k, v]) => [k, String(v)]),
    ),
  };

  let res: Response;
  try {
    res = await monerooFetch("/v1/payments/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: `Erreur réseau Moneroo : ${(err as Error).message}` };
  }

  let parsed: { data?: { id?: string; checkout_url?: string }; message?: string };
  try {
    parsed = (await res.json()) as typeof parsed;
  } catch {
    return { ok: false, error: `Moneroo a répondu ${res.status} (non-JSON)` };
  }

  if (!res.ok || !parsed.data?.id || !parsed.data?.checkout_url) {
    return { ok: false, error: parsed.message || `Moneroo a répondu ${res.status}` };
  }

  return {
    ok: true,
    providerTransactionId: parsed.data.id,
    checkoutUrl: parsed.data.checkout_url,
  };
}

/** Re-vérifie le statut d'un paiement (défense en profondeur côté webhook). */
export async function verifyPayment(
  paymentId: string,
  secretKey: string,
): Promise<{ status: string; amount?: number; currency?: string } | null> {
  let res: Response;
  try {
    res = await monerooFetch(
      `/v1/payments/${encodeURIComponent(paymentId)}/verify`,
      { method: "GET", headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" } },
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as {
    data?: { status?: string; amount?: number | string; currency?: { code?: string } | string };
  } | null;
  if (!json?.data?.status) return null;

  const currency =
    typeof json.data.currency === "string" ? json.data.currency : json.data.currency?.code;

  return {
    status: String(json.data.status).toLowerCase(),
    amount: typeof json.data.amount === "string" ? parseInt(json.data.amount, 10) : json.data.amount,
    currency,
  };
}

export type NormalizedEvent = {
  providerTransactionId: string;
  paymentId?: string; // notre UUID (metadata.paymentId)
  status: "completed" | "failed";
  failureReason?: string;
  reportedAmount?: number;
};

/** Normalise le payload webhook Moneroo. Renvoie null pour payment.initiated. */
export function parseMonerooEvent(body: unknown): NormalizedEvent | null {
  const b = body as { event?: string; data?: Record<string, unknown> } | null;
  if (!b?.event || !b.data) return null;

  const data = b.data;
  const id = data.id as string | undefined;
  if (!id) return null;

  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const paymentId = typeof metadata.paymentId === "string" ? metadata.paymentId : undefined;
  const reportedAmount =
    typeof data.amount === "number"
      ? data.amount
      : typeof data.amount === "string"
        ? parseInt(data.amount, 10)
        : undefined;

  if (b.event === "payment.success") {
    return { providerTransactionId: id, paymentId, status: "completed", reportedAmount };
  }
  if (b.event === "payment.failed" || b.event === "payment.cancelled") {
    return {
      providerTransactionId: id,
      paymentId,
      status: "failed",
      failureReason: typeof data.status === "string" ? (data.status as string) : b.event,
      reportedAmount,
    };
  }
  return null; // payment.initiated → ignoré
}

// ── Crypto helpers (Web Crypto) ──────────────────────────────────────

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA256 hex du message avec la clé. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(sig);
}

/** SHA-256 hex (utilisé pour l'id de dédup synthétique). */
export async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return toHex(buf);
}

/** Comparaison à temps constant de deux chaînes hex de même longueur. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Vérifie la signature webhook Moneroo : hex(HMAC_SHA256(rawBody, webhookSecret))
 * comparé en temps constant à l'en-tête X-Moneroo-Signature.
 */
export async function verifyMonerooSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  return timingSafeEqual(signatureHeader.trim().toLowerCase(), expected.toLowerCase());
}

// ── Catalogue serveur des formules (source de vérité anti-fraude) ────
// On NE fait JAMAIS confiance au montant envoyé par le client : on lit
// toujours le prix ici à partir de l'identifiant de formule.
export const PLANS: Record<string, { months: number; amount: number }> = {
  "1m": { months: 1, amount: 5000 },
  "3m": { months: 3, amount: 12000 },
  "6m": { months: 6, amount: 20000 },
};
