// Logique d'abonnement côté client (UX uniquement — la vérité fait foi côté
// serveur : prix dans l'Edge Function, activation via le webhook Moneroo).

// Formules prépayées. `amount` en francs XOF entiers. DOIT rester aligné avec
// le catalogue serveur dans supabase/functions/_shared/moneroo.ts (PLANS).
export const PLANS = [
  { id: '1m',  months: 1,  label: '1 mois', amount: 200,   cadence: 'tous les mois' },
  { id: '3m',  months: 3,  label: '3 mois', amount: 18659, cadence: 'tous les 3 mois', badge: 'Populaire' },
  { id: '1an', months: 12, label: '1 an',   amount: 75000, cadence: 'tous les ans', badge: 'Meilleure offre', best: true },
];

export const PLANS_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export function formatFcfa(amount) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}

// ── Multi-devises (affichage indicatif uniquement ; le paiement reste en XOF) ──
// L'euro est FIXE par la parité du FCFA (1 € = 655,957 FCFA). Le dollar est un
// taux fixe approximatif, ajustable ici sans clé API.
export const CURRENCY_RATES = { XOF: 1, EUR: 1 / 655.957, USD: 1 / 600 };
export const CURRENCIES = [
  { code: 'XOF', symbol: 'FCFA' },
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
];

export function convertFromXof(amountXof, code) {
  return Number(amountXof) * (CURRENCY_RATES[code] ?? 1);
}

export function formatMoney(amountXof, code = 'XOF') {
  const symbol = (CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]).symbol;
  const value = convertFromXof(amountXof, code);
  if (code === 'XOF') return `${Math.round(value).toLocaleString('fr-FR')} ${symbol}`;
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

// ── Palier (gratuit vs abonné) ──
// Un imprimeur est "abonné" tant que son abonnement (incluant la période de grâce de 2 jours) ou sa période d'essai n'est pas expiré.
// Les comptes de démonstration ont un accès complet.
export function isSubscriber(printer) {
  if (!printer || printer.isMock) return true;
  
  const state = getSubscriptionState(printer);
  return state.hasAccess;
}

export const FREE_LIMITS = {
  maxServices: 3, maxPortfolio: 3, maxProducts: 2, canSocialLinks: false, canSeeStats: false,
};
const PRO_LIMITS = {
  maxServices: Infinity, maxPortfolio: Infinity, maxProducts: Infinity, canSocialLinks: true, canSeeStats: true,
};

export function getTierLimits(printer) {
  return isSubscriber(printer) ? PRO_LIMITS : FREE_LIMITS;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Calcule l'état d'abonnement d'un imprimeur.
 * @returns {{ status: 'trial'|'active'|'expired', hasAccess: boolean,
 *   isTrial: boolean, endsAt: Date|null, daysLeft: number, planId: string|null, isGracePeriod: boolean }}
 */
export function getSubscriptionState(printer) {
  // Les comptes de démonstration (sandbox local) ont un accès complet.
  if (!printer || printer.isMock) {
    return { status: 'active', hasAccess: true, isTrial: false, endsAt: null, daysLeft: Infinity, planId: null, isGracePeriod: false };
  }

  const now = Date.now();
  const GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000; // 2 jours de grâce / intervalle
  const trialEndsAt = printer.trial_ends_at ? new Date(printer.trial_ends_at) : null;
  const subEndsAt = printer.subscription_ends_at ? new Date(printer.subscription_ends_at) : null;

  // Accès actif si formule + 2 jours de grâce n'est pas expirée
  const subActive = !!subEndsAt && (subEndsAt.getTime() + GRACE_PERIOD_MS) > now;
  const trialActive = !!trialEndsAt && trialEndsAt.getTime() > now;

  let status, endsAt;
  if (subActive) {
    status = 'active';
    endsAt = subEndsAt;
  } else if (trialActive) {
    status = 'trial';
    endsAt = trialEndsAt;
  } else {
    status = 'expired';
    endsAt = subEndsAt || trialEndsAt;
  }

  const hasAccess = subActive || trialActive;
  
  // Si en période de grâce, on compte jusqu'à la fin de la grâce, sinon fin d'essai/abonnement
  const targetTime = subActive ? (subEndsAt.getTime() + GRACE_PERIOD_MS) : (endsAt ? endsAt.getTime() : now);
  const daysLeft = hasAccess ? Math.max(0, Math.ceil((targetTime - now) / DAY_MS)) : 0;

  return {
    status,
    hasAccess,
    isTrial: status === 'trial',
    endsAt,
    daysLeft,
    planId: printer.subscription_plan || null,
    isGracePeriod: subActive && subEndsAt.getTime() <= now // Indique si on est dans la période de grâce
  };
}
