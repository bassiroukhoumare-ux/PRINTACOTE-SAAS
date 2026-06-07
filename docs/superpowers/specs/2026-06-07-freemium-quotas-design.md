# Design — Système freemium par quotas + facturation contextuelle

Date : 2026-06-07
Branche : `feat/paiement-geniuspay` (continue le travail GeniusPay)

## Contexte et objectif

GeniusPay est branché et fonctionne (cf. `2026-06-07-geniuspay-integration-design.md`).
On ajoute par-dessus un **modèle freemium par quotas** : tout imprimeur s'inscrit et
utilise la plateforme librement, mais avec des **limites**. La grille d'abonnement
n'apparaît **que** lorsqu'il atteint un quota ou touche une fonction réservée. Un abonnement
(paiement ponctuel GeniusPay) lève toutes les limites.

### Décisions de cadrage (validées)

1. **Aucune notion d'essai affichée** : pas de bannière « période d'essai », pas de compte à
   rebours, pas de désactivation. Le profil gratuit reste actif **indéfiniment**.
2. **Gate par quotas** (gratuit) :
   - Services : **3 max**
   - Portfolio : **3 max**
   - Produits boutique : **2 max**
   - Liens réseaux sociaux : **réservés aux abonnés**
   - Stats visites / clics WhatsApp : **réservées aux abonnés**
3. **Déclenchement contextuel** : la page de facturation (overlay réutilisant
   `SubscriptionPanel`) surgit **uniquement** quand un gratuit tente de dépasser un quota ou
   clique sur une fonction verrouillée.
4. **Rappel à 7 jours** : si non abonné 7 j après l'inscription, envoyer **un e-mail
   (Resend)** + une **notification in-app** invitant à s'abonner. Pas de désactivation.
5. **Formules** (paiement ponctuel, prix par période, renouvellement manuel) :
   `1m = 200 F` (valeur de test), `3m = 18 659 F`, `1an (12 mois) = 75 000 F`.
6. **Multi-devises (affichage seul)** : sélecteur FCFA / € / $ ; € exact via la parité fixe
   1 € = 655,957 FCFA, $ à taux fixe configurable. **Le paiement reste en FCFA.**

## Architecture

### Source de vérité : `src/lib/subscription.js`

Helpers ajoutés / modifiés :

```js
// Catalogue (aligné avec _shared/geniuspay.ts)
export const PLANS = [
  { id: '1m',  months: 1,  label: '1 mois', amount: 200,   cadence: 'tous les mois' },
  { id: '3m',  months: 3,  label: '3 mois', amount: 18659, cadence: 'tous les 3 mois', badge: 'Populaire' },
  { id: '1an', months: 12, label: '1 an',   amount: 75000, cadence: 'tous les ans', badge: 'Meilleure offre', best: true },
];

// Taux de change FIXES (affichage indicatif uniquement)
export const CURRENCY_RATES = { XOF: 1, EUR: 1 / 655.957, USD: 1 / 600 };
export const CURRENCIES = [
  { code: 'XOF', symbol: 'FCFA' },
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
];
export function convertFromXof(amountXof, code) { return amountXof * CURRENCY_RATES[code]; }
export function formatMoney(amountXof, code = 'XOF') { /* arrondi + symbole + locale fr-FR */ }

// Statut abonné (les comptes mock = abonnés)
export function isSubscriber(printer) {
  if (!printer || printer.isMock) return true;
  return !!printer.subscription_ends_at && new Date(printer.subscription_ends_at) > new Date();
}

// Limites du palier courant
export const FREE_LIMITS = { maxServices: 3, maxPortfolio: 3, maxProducts: 2, canSocialLinks: false, canSeeStats: false };
const PRO_LIMITS = { maxServices: Infinity, maxPortfolio: Infinity, maxProducts: Infinity, canSocialLinks: true, canSeeStats: true };
export function getTierLimits(printer) { return isSubscriber(printer) ? PRO_LIMITS : FREE_LIMITS; }
```

`getSubscriptionState` (existant) reste utilisé par `SubscriptionPanel` pour afficher
l'état (« abonnement actif jusqu'au… »). La logique de gating repose désormais sur
`isSubscriber` / `getTierLimits`, **pas** sur l'essai.

### Catalogue serveur : `supabase/functions/_shared/geniuspay.ts`

```ts
export const PLANS: Record<string, { months: number; amount: number }> = {
  "1m":  { months: 1,  amount: 200 },   // Prix de test
  "3m":  { months: 3,  amount: 18659 },
  "1an": { months: 12, amount: 75000 },
};
```

Le plan `6m` est supprimé. `complete_subscription_payment` utilise déjà
`make_interval(months => v_payment.months)` → 12 mois pour `1an`, rien d'autre à changer.

### Overlay de facturation contextuel

- Nouveau composant `src/components/UpgradeOverlay.jsx` : plein écran, fond sombre,
  message contextuel passé en prop (`reason`), puis `<SubscriptionPanel ... />`. Bouton
  fermer. Réutilisé pour tous les déclencheurs.
- `DashboardPage.jsx` :
  - état `upgradeReason` (string | null) ;
  - fonction `requireUpgrade(reason)` → `setUpgradeReason(reason)` ;
  - rend `{upgradeReason && <UpgradeOverlay reason={upgradeReason} onClose={...} printerData user showToast />}` ;
  - calcule `const limits = getTierLimits(printerData)` et passe `limits` + `requireUpgrade`
    aux sous-composants concernés.

### Application des quotas (sous-composants dashboard)

Chaque composant reçoit `limits` + `requireUpgrade` en props.

- `DashboardServices.jsx` (`handleAddService`, et le bouton « Ajouter ») : si
  `services.length >= limits.maxServices` → `requireUpgrade('services')` au lieu d'ouvrir le
  formulaire / d'insérer. Idem garde-fou dans `handleAddService`.
- `DashboardPortfolio.jsx` : si `portfolio.length >= limits.maxPortfolio` →
  `requireUpgrade('portfolio')`.
- `DashboardMarketplace.jsx` (`handleAddProduct`, bouton « Ajouter un produit ») : si
  `products.length >= limits.maxProducts` → `requireUpgrade('produits')`.
- `DashboardProfile.jsx` : les trois champs `facebook` / `instagram` / `tiktok` sont rendus
  derrière un cadenas si `!limits.canSocialLinks` (overlay « Réservé aux abonnés » + bouton
  qui appelle `requireUpgrade('social')`). À l'enregistrement, ces champs ne sont pas
  soumis pour un gratuit (sécurité : on n'écrase pas, on ignore).
- `DashboardOverview.jsx` : les cartes « Visites » et « Clics WhatsApp » sont floutées
  (`blur` + cadenas) si `!limits.canSeeStats`, avec bouton `requireUpgrade('stats')`.

> Note d'honnêteté technique : l'application est **côté client** (UX). La vraie barrière
> monétisable est le quota produits (table `products`) et la visibilité. Pour la v1 on
> reste côté client (cohérent avec le reste du projet qui écrit via RLS propriétaire) ;
> un durcissement par trigger SQL est listé en « évolutions possibles », non requis.

### `SubscriptionPanel.jsx`

- Affiche les **3 formules** `PLANS` avec : prix dans la devise sélectionnée, libellé de
  cadence (« facturé tous les mois / 3 mois / ans »), et une mention claire « Paiement
  unique pour la période — renouvellement manuel, rappel avant expiration ».
- **Sélecteur de devise** FCFA / € / $ (état local `currency`) qui reformate tous les prix
  via `formatMoney`. Le paiement déclenché reste en FCFA (inchangé côté checkout).
- Accepte une prop optionnelle `reason` pour afficher le message contextuel quand il est
  rendu dans l'`UpgradeOverlay`.

## Phase 2 — Rappel à 7 jours (module indépendant)

### SQL (`setup_subscription_reminder.sql`, nouveau)

```sql
ALTER TABLE printers ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
```

### Edge Function `subscription-reminder` (cron)

- Déployée `verify_jwt = false`, déclenchée par pg_cron (ou un appel planifié).
- Sélectionne (service role) les printers tels que :
  `now() >= trial_ends_at` (= inscription + 7 j) ET `reminder_sent_at IS NULL` ET non abonné
  (`subscription_ends_at IS NULL OR subscription_ends_at < now()`).
- Pour chacun : envoie un e-mail via **Resend** (clé `RESEND_API_KEY` déjà en place) +
  insère une notification in-app (même mécanisme que les notifications existantes), puis
  `UPDATE printers SET reminder_sent_at = now()`.
- Planification : `cron.schedule('subscription-reminder', '0 9 * * *', ...)` via pg_net
  appelant la fonction, OU directement une fonction SQL `send_subscription_reminders()`
  selon ce qui colle le mieux à l'infra de notification existante (`setup_notification.sql`).

> La Phase 2 sera détaillée/figée au moment du plan, après inspection de l'infra de
> notification réellement déployée (la fonction `send-trial-email` existe côté Supabase mais
> n'est pas dans le repo). Phase 1 (gating + pricing + devises) est livrable seule.

## Flux

```
Gratuit ajoute un 4e service → DashboardServices voit services.length >= 3
  → requireUpgrade('services') → UpgradeOverlay (message + SubscriptionPanel)
  → l'imprimeur choisit une formule → geniuspay-checkout (inchangé) → paiement FCFA
  → webhook active subscription_ends_at → isSubscriber()=true → limites levées

Cron quotidien (9h) → printers (inscription+7j, non abonnés, non relancés)
  → e-mail Resend + notification in-app → reminder_sent_at = now()
```

## Découpage d'implémentation

- **Plan A (Phase 1)** — Pricing + devises + gating + overlay. Frontend + petit catalogue
  serveur. Livrable seul, c'est le cœur de la monétisation.
- **Plan B (Phase 2)** — Rappel 7 j (SQL + Edge Function + cron). Indépendant, vient après.

## Vérification (pas de tests automatisés dans le projet)

`npm run lint` + `npm run build`, puis test manuel :
1. Compte gratuit : ajouter 3 services OK, le 4ᵉ ouvre l'overlay de facturation.
2. Idem portfolio (4ᵉ) et produits (3ᵉ).
3. Champs sociaux + cartes stats verrouillés pour un gratuit, déverrouillés pour un abonné
   (ou un compte mock).
4. Sélecteur de devise : les prix se reconvertissent (€ exact, $ approx), paiement en FCFA.
5. Après paiement sandbox, `isSubscriber` devient vrai → limites levées.

## Hors périmètre

- Désactivation / cutoff temporel du compte.
- Badge « Pro », campagnes publicitaires (plateforme / TikTok / Facebook).
- Prélèvement automatique récurrent (impossible avec GeniusPay / Mobile Money).
- Facturation réelle en devises étrangères.
- Durcissement serveur des quotas par trigger SQL (évolution possible, non requise v1).
