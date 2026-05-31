// Logique d'abonnement côté client (UX uniquement — la vérité fait foi côté
// serveur : prix dans l'Edge Function, activation via le webhook Moneroo).

// Formules prépayées. `amount` en francs XOF entiers. DOIT rester aligné avec
// le catalogue serveur dans supabase/functions/_shared/moneroo.ts (PLANS).
export const PLANS = [
  { id: '1m', months: 1, label: '1 mois', amount: 150 },
  { id: '3m', months: 3, label: '3 mois', amount: 12000, badge: 'Économisez 20%' },
  { id: '6m', months: 6, label: '6 mois', amount: 20000, badge: 'Meilleure offre', best: true },
];

export const PLANS_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export function formatFcfa(amount) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Calcule l'état d'abonnement d'un imprimeur.
 * @returns {{ status: 'trial'|'active'|'expired', hasAccess: boolean,
 *   isTrial: boolean, endsAt: Date|null, daysLeft: number, planId: string|null }}
 */
export function getSubscriptionState(printer) {
  // Les comptes de démonstration (sandbox local) ont un accès complet.
  if (!printer || printer.isMock) {
    return { status: 'active', hasAccess: true, isTrial: false, endsAt: null, daysLeft: Infinity, planId: null };
  }

  const now = Date.now();
  const trialEndsAt = printer.trial_ends_at ? new Date(printer.trial_ends_at) : null;
  const subEndsAt = printer.subscription_ends_at ? new Date(printer.subscription_ends_at) : null;

  const subActive = !!subEndsAt && subEndsAt.getTime() > now;
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
  const daysLeft = hasAccess && endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - now) / DAY_MS)) : 0;

  return {
    status,
    hasAccess,
    isTrial: status === 'trial',
    endsAt,
    daysLeft,
    planId: printer.subscription_plan || null,
  };
}
