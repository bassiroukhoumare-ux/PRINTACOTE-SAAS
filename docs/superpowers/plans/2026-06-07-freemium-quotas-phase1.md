# Freemium par quotas — Plan d'implémentation (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limiter les comptes gratuits (3 services / 3 portfolio / 2 produits, liens sociaux + stats réservés aux abonnés) et faire surgir la page de facturation au moment où un quota est atteint, avec formules 200/18 659/75 000 F et affichage multi-devises.

**Architecture:** Toute la logique de palier vit dans `src/lib/subscription.js` (`isSubscriber`, `getTierLimits`, catalogue `PLANS`, conversion devises). `DashboardPage` calcule les limites et expose un callback `requireUpgrade(reason)` qui ouvre un overlay plein écran (`UpgradeOverlay`) réutilisant `SubscriptionPanel`. Les sous-composants du dashboard appliquent les quotas et appellent ce callback.

**Tech Stack:** React 19, Vite, Tailwind, lucide-react, Supabase Edge Functions (Deno).

**Pas de tests automatisés** dans le projet : chaque tâche se vérifie par `npm run lint` + `npm run build`, puis un test manuel global (Task 11).

**Périmètre :** Phase 1 uniquement. Le rappel e-mail à 7 jours (Phase 2) fera l'objet d'un plan séparé.

---

### Task 1 : Helpers de palier + catalogue + devises dans `subscription.js`

**Files:**
- Modify: `src/lib/subscription.js`

- [ ] **Step 1 : Remplacer le catalogue `PLANS`**

Remplacer le bloc `export const PLANS = [...]` (lignes ~6-10) par :

```js
export const PLANS = [
  { id: '1m',  months: 1,  label: '1 mois', amount: 200,   cadence: 'tous les mois' },
  { id: '3m',  months: 3,  label: '3 mois', amount: 18659, cadence: 'tous les 3 mois', badge: 'Populaire' },
  { id: '1an', months: 12, label: '1 an',   amount: 75000, cadence: 'tous les ans', badge: 'Meilleure offre', best: true },
];
```

- [ ] **Step 2 : Ajouter devises + helpers de palier**

Juste après la ligne `export const PLANS_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));`, ajouter :

```js
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
// Un imprimeur est "abonné" tant que son abonnement n'est pas expiré.
// Les comptes de démonstration ont un accès complet.
export function isSubscriber(printer) {
  if (!printer || printer.isMock) return true;
  return !!printer.subscription_ends_at && new Date(printer.subscription_ends_at) > new Date();
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
```

- [ ] **Step 3 : Vérifier le build**

Run : `npm run build`
Expected : build OK (`✓ built`).

- [ ] **Step 4 : Commit**

```bash
git add src/lib/subscription.js
git commit -m "feat: helpers de palier freemium + catalogue 1m/3m/1an + devises"
```

---

### Task 2 : Aligner le catalogue serveur GeniusPay

**Files:**
- Modify: `supabase/functions/_shared/geniuspay.ts`

- [ ] **Step 1 : Remplacer le catalogue `PLANS`**

Remplacer le bloc `export const PLANS ...` par :

```ts
export const PLANS: Record<string, { months: number; amount: number }> = {
  "1m":  { months: 1,  amount: 200 },   // Prix de test
  "3m":  { months: 3,  amount: 18659 },
  "1an": { months: 12, amount: 75000 },
};
```

- [ ] **Step 2 : Redéployer la fonction checkout (le catalogue est lu côté serveur)**

Run : `supabase functions deploy geniuspay-checkout --project-ref noohddkwlgszijenwsxr`
Expected : `Deployed Functions on project noohddkwlgszijenwsxr: geniuspay-checkout`

- [ ] **Step 3 : Commit**

```bash
git add supabase/functions/_shared/geniuspay.ts
git commit -m "feat: catalogue serveur GeniusPay aligné (1m/3m/1an)"
```

---

### Task 3 : `SubscriptionPanel` — 3 formules, cadence, sélecteur de devise, message contextuel

**Files:**
- Modify: `src/components/SubscriptionPanel.jsx`

- [ ] **Step 1 : Mettre à jour les imports**

Remplacer :

```javascript
import { PLANS, formatFcfa, getSubscriptionState } from '../lib/subscription';
```

par :

```javascript
import { PLANS, formatMoney, getSubscriptionState, CURRENCIES } from '../lib/subscription';
```

- [ ] **Step 2 : Ajouter l'état devise + accepter une prop `reason`**

Remplacer la signature + la première ligne d'état :

```javascript
const SubscriptionPanel = ({ printerData, user, showToast, dark = false }) => {
    const [loadingPlan, setLoadingPlan] = useState(null);
    const sub = getSubscriptionState(printerData);
```

par :

```javascript
const SubscriptionPanel = ({ printerData, user, showToast, dark = false, reason = null }) => {
    const [loadingPlan, setLoadingPlan] = useState(null);
    const [currency, setCurrency] = useState('XOF');
    const sub = getSubscriptionState(printerData);
```

- [ ] **Step 3 : Afficher le message contextuel + le sélecteur de devise**

Dans le bloc d'en-tête, remplacer :

```javascript
                <p className={`mt-3 text-base font-medium ${dark ? 'text-white/50' : 'text-dark/50'}`}>
                    Un paiement unique débloque l'accès complet à votre espace professionnel
                    pour toute la durée choisie. Sans engagement, sans renouvellement automatique.
                </p>
            </div>
```

par :

```javascript
                <p className={`mt-3 text-base font-medium ${dark ? 'text-white/50' : 'text-dark/50'}`}>
                    {reason || "Un paiement unique débloque l'accès complet à votre espace professionnel pour toute la durée choisie. Sans engagement, sans renouvellement automatique."}
                </p>

                <div className="mt-6 inline-flex rounded-2xl bg-dark/5 p-1">
                    {CURRENCIES.map((c) => (
                        <button
                            key={c.code}
                            type="button"
                            onClick={() => setCurrency(c.code)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                ${currency === c.code ? 'bg-primary text-white shadow' : 'text-dark/40 hover:text-dark/70'}`}
                        >
                            {c.symbol}
                        </button>
                    ))}
                </div>
            </div>
```

- [ ] **Step 4 : Afficher le prix dans la devise choisie + la cadence**

Remplacer le bloc prix :

```javascript
                            <div className="mb-6">
                                <h3 className="text-sm font-black uppercase tracking-widest opacity-70">{plan.label}</h3>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-4xl font-black tracking-tight">{plan.amount.toLocaleString('fr-FR')}</span>
                                    <span className="text-sm font-bold opacity-60">FCFA</span>
                                </div>
                                <p className="text-xs font-bold opacity-50 mt-1">
                                    soit ~{formatFcfa(monthly)}/mois
                                </p>
                            </div>
```

par :

```javascript
                            <div className="mb-6">
                                <h3 className="text-sm font-black uppercase tracking-widest opacity-70">{plan.label}</h3>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-4xl font-black tracking-tight">{formatMoney(plan.amount, currency)}</span>
                                </div>
                                <p className="text-xs font-bold opacity-50 mt-1">
                                    facturé {plan.cadence} · soit ~{formatMoney(monthly, currency)}/mois
                                </p>
                            </div>
```

- [ ] **Step 5 : Mettre à jour la mention de renouvellement sous la grille**

Remplacer le bloc bandeau GeniusPay :

```javascript
            <div className={`flex items-center justify-center gap-2 text-xs font-bold ${dark ? 'text-white/40' : 'text-dark/40'}`}>
                <ShieldCheck size={16} className="opacity-50" />
                Paiement sécurisé via GeniusPay — Mobile Money (Wave, Orange, MTN, Moov) & carte bancaire.
            </div>
```

par :

```javascript
            <div className={`space-y-2 text-center`}>
                <div className={`flex items-center justify-center gap-2 text-xs font-bold ${dark ? 'text-white/40' : 'text-dark/40'}`}>
                    <ShieldCheck size={16} className="opacity-50" />
                    Paiement sécurisé via GeniusPay — Mobile Money (Wave, Orange, MTN, Moov) & carte bancaire.
                </div>
                <p className={`text-[11px] font-medium ${dark ? 'text-white/30' : 'text-dark/30'}`}>
                    Paiement unique pour la période choisie · renouvellement manuel (rappel avant expiration) · prix affichés en {currency}, débité en FCFA.
                </p>
            </div>
```

- [ ] **Step 6 : Vérifier lint + build**

Run : `npm run lint`
Expected : pas de nouvelle erreur dans `SubscriptionPanel.jsx`.
Run : `npm run build`
Expected : build OK.

- [ ] **Step 7 : Commit**

```bash
git add src/components/SubscriptionPanel.jsx
git commit -m "feat: SubscriptionPanel 3 formules + cadence + sélecteur de devise"
```

---

### Task 4 : Composant `UpgradeOverlay`

**Files:**
- Create: `src/components/UpgradeOverlay.jsx`

- [ ] **Step 1 : Créer le composant**

```jsx
import React from 'react';
import { X } from 'lucide-react';
import SubscriptionPanel from './SubscriptionPanel';

// Overlay plein écran de facturation, déclenché quand un compte gratuit atteint
// un quota ou touche une fonction réservée. Réutilise SubscriptionPanel.
const REASONS = {
    services: "Vous avez atteint la limite de 3 services du compte gratuit. Abonnez-vous pour en ajouter sans limite.",
    portfolio: "Vous avez atteint la limite de 3 réalisations du compte gratuit. Abonnez-vous pour un portfolio illimité.",
    produits: "Vous avez atteint la limite de 2 produits du compte gratuit. Abonnez-vous pour une boutique illimitée.",
    social: "Les liens vers vos réseaux sociaux sont réservés aux abonnés. Abonnez-vous pour les activer.",
    stats: "Les statistiques de visites et de clics sont réservées aux abonnés. Abonnez-vous pour y accéder.",
};

const UpgradeOverlay = ({ reason, printerData, user, showToast, onClose }) => {
    const message = REASONS[reason] || "Passez à un abonnement pour débloquer toutes les fonctionnalités.";
    return (
        <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-dark/40 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-300">
            <div className="relative w-full max-w-5xl bg-background rounded-[3rem] p-8 md:p-12 my-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-11 h-11 bg-dark/5 hover:bg-dark/10 rounded-full flex items-center justify-center transition-colors z-10"
                    aria-label="Fermer"
                >
                    <X size={20} />
                </button>
                <SubscriptionPanel
                    printerData={printerData}
                    user={user}
                    showToast={showToast}
                    reason={message}
                />
            </div>
        </div>
    );
};

export default UpgradeOverlay;
```

- [ ] **Step 2 : Vérifier le build**

Run : `npm run build`
Expected : build OK.

- [ ] **Step 3 : Commit**

```bash
git add src/components/UpgradeOverlay.jsx
git commit -m "feat: UpgradeOverlay (facturation contextuelle)"
```

---

### Task 5 : `DashboardPage` — état d'upgrade, overlay, passage des limites

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1 : Importer le helper de limites + l'overlay**

Remplacer :

```javascript
import SubscriptionPanel from '../components/SubscriptionPanel';
import { getSubscriptionState } from '../lib/subscription';
```

par :

```javascript
import SubscriptionPanel from '../components/SubscriptionPanel';
import UpgradeOverlay from '../components/UpgradeOverlay';
import { getSubscriptionState, getTierLimits } from '../lib/subscription';
```

- [ ] **Step 2 : Ajouter l'état d'upgrade**

Juste après la ligne `const menuItems = [` … `];` (le tableau `menuItems`, vers la ligne 657), ajouter :

```javascript
    const [upgradeReason, setUpgradeReason] = useState(null);
    const requireUpgrade = (reason) => setUpgradeReason(reason);
    const limits = getTierLimits(printerData);
```

- [ ] **Step 3 : Passer `limits` + `requireUpgrade` aux sous-composants concernés**

Remplacer les lignes de rendu des onglets :

```javascript
                        {activeTab === 'overview' && <DashboardOverview printerData={printerData} setActiveTab={triggerTabWithModal} />}
                        {activeTab === 'profile' && <DashboardProfile printerData={printerData} onUpdate={fetchPrinterData} showToast={showToast} />}
                        {activeTab === 'services' && <DashboardServices printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} />}
                        {activeTab === 'portfolio' && <DashboardPortfolio printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} />}
                        {activeTab === 'marketplace' && <DashboardMarketplace printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} />}
```

par :

```javascript
                        {activeTab === 'overview' && <DashboardOverview printerData={printerData} setActiveTab={triggerTabWithModal} limits={limits} requireUpgrade={requireUpgrade} />}
                        {activeTab === 'profile' && <DashboardProfile printerData={printerData} onUpdate={fetchPrinterData} showToast={showToast} limits={limits} requireUpgrade={requireUpgrade} />}
                        {activeTab === 'services' && <DashboardServices printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} limits={limits} requireUpgrade={requireUpgrade} />}
                        {activeTab === 'portfolio' && <DashboardPortfolio printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} limits={limits} requireUpgrade={requireUpgrade} />}
                        {activeTab === 'marketplace' && <DashboardMarketplace printerData={printerData} onUpdate={fetchPrinterData} autoOpenModal={autoOpenModal} setAutoOpenModal={setAutoOpenModal} showToast={showToast} showConfirm={showConfirm} limits={limits} requireUpgrade={requireUpgrade} />}
```

- [ ] **Step 4 : Rendre l'overlay**

Juste avant la dernière balise fermante du composant (chercher le `</div>` final précédé du rendu principal, à l'intérieur du `return (...)`), ajouter le rendu conditionnel. Repère fiable : ajouter ce bloc **immédiatement après** la ligne du bloc `{activeTab === 'billing' && (...)}` n'est pas idéal (il est dans le flux). À la place, ajouter juste avant la fermeture du conteneur racine du `return`, par exemple après le composant de notifications. Insérer :

```javascript
            {upgradeReason && (
                <UpgradeOverlay
                    reason={upgradeReason}
                    printerData={printerData}
                    user={user}
                    showToast={showToast}
                    onClose={() => setUpgradeReason(null)}
                />
            )}
```

> Le placement exact : à l'intérieur du `return` principal du dashboard « complet » (pas l'écran d'onboarding ni le loader), comme dernier enfant du conteneur racine, au même niveau que les autres overlays/modales déjà présents. L'overlay est en `position: fixed z-[300]`, donc sa position dans l'arbre n'affecte pas le rendu.

- [ ] **Step 5 : Vérifier lint + build**

Run : `npm run lint`
Expected : pas de nouvelle erreur dans `DashboardPage.jsx`.
Run : `npm run build`
Expected : build OK.

- [ ] **Step 6 : Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: DashboardPage expose requireUpgrade + overlay + limites"
```

---

### Task 6 : Quota Services

**Files:**
- Modify: `src/pages/dashboard/DashboardServices.jsx`

- [ ] **Step 1 : Accepter les nouvelles props**

Remplacer la signature :

```javascript
const DashboardServices = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal, showToast, showConfirm }) => {
```

par :

```javascript
const DashboardServices = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal, showToast, showConfirm, limits, requireUpgrade }) => {
```

- [ ] **Step 2 : Garde-fou dans `handleAddService`**

Au tout début de `handleAddService`, juste après `e.preventDefault();`, insérer :

```javascript
        const count = printerData?.services?.length || 0;
        if (limits && count >= limits.maxServices) {
            setIsModalOpen(false);
            requireUpgrade?.('services');
            return;
        }
```

- [ ] **Step 3 : Garde-fou sur le bouton « Ajouter un service »**

Remplacer :

```javascript
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus size={20} /> Ajouter un service
                </button>
```

par :

```javascript
                <button 
                    onClick={() => {
                        const count = printerData?.services?.length || 0;
                        if (limits && count >= limits.maxServices) { requireUpgrade?.('services'); return; }
                        setIsModalOpen(true);
                    }}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus size={20} /> Ajouter un service
                </button>
```

- [ ] **Step 4 : Build + Commit**

Run : `npm run build` → Expected : build OK.

```bash
git add src/pages/dashboard/DashboardServices.jsx
git commit -m "feat: quota 3 services (compte gratuit)"
```

---

### Task 7 : Quota Portfolio

**Files:**
- Modify: `src/pages/dashboard/DashboardPortfolio.jsx`

- [ ] **Step 1 : Accepter les nouvelles props**

Remplacer la signature :

```javascript
const DashboardPortfolio = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal, showToast, showConfirm }) => {
```

par :

```javascript
const DashboardPortfolio = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal, showToast, showConfirm, limits, requireUpgrade }) => {
```

- [ ] **Step 2 : Ajouter un déclencheur d'ajout gardé**

Juste après la ligne `const [activeImage, setActiveImage] = useState(null);`, insérer :

```javascript
    const handleAddClick = () => {
        const count = printerData?.portfolio?.length || 0;
        if (limits && count >= limits.maxPortfolio) { requireUpgrade?.('portfolio'); return; }
        fileInputRef.current?.click();
    };
```

- [ ] **Step 3 : Brancher les deux boutons d'ajout sur `handleAddClick`**

Remplacer les deux occurrences de :

```javascript
                    onClick={() => fileInputRef.current?.click()}
```

(le bouton d'en-tête ligne ~148 et le bouton de l'état vide ligne ~183) par :

```javascript
                    onClick={handleAddClick}
```

> ⚠️ Ne PAS remplacer la ligne 13 `fileInputRef.current?.click();` (auto-ouverture d'onboarding) ni les boutons de visualisation/suppression. Utiliser `replace_all` est interdit ici — remplacer chaque bouton d'ajout individuellement en incluant assez de contexte.

- [ ] **Step 4 : Build + Commit**

Run : `npm run build` → Expected : build OK.

```bash
git add src/pages/dashboard/DashboardPortfolio.jsx
git commit -m "feat: quota 3 réalisations portfolio (compte gratuit)"
```

---

### Task 8 : Quota Produits (boutique)

**Files:**
- Modify: `src/pages/dashboard/DashboardMarketplace.jsx`

- [ ] **Step 1 : Accepter les nouvelles props**

Remplacer la signature :

```javascript
const DashboardMarketplace = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal, showToast, showConfirm }) => {
```

par :

```javascript
const DashboardMarketplace = ({ printerData, onUpdate, autoOpenModal, setAutoOpenModal, showToast, showConfirm, limits, requireUpgrade }) => {
```

- [ ] **Step 2 : Garde-fou en tête de `openAddModal`**

Au tout début de `openAddModal` (juste après `const openAddModal = () => {`), insérer :

```javascript
        if (limits && products.length >= limits.maxProducts) { requireUpgrade?.('produits'); return; }
```

> `products` est l'état chargé depuis la table `products` (ligne ~108 `setProducts(data)`), donc `products.length` reflète le nombre réel. `handleEditProduct` n'est PAS gardé (modifier un produit existant reste autorisé).

- [ ] **Step 3 : Build + Commit**

Run : `npm run build` → Expected : build OK.

```bash
git add src/pages/dashboard/DashboardMarketplace.jsx
git commit -m "feat: quota 2 produits boutique (compte gratuit)"
```

---

### Task 9 : Verrou liens réseaux sociaux

**Files:**
- Modify: `src/pages/dashboard/DashboardProfile.jsx`

- [ ] **Step 1 : Accepter les nouvelles props**

Remplacer la signature :

```javascript
const DashboardProfile = ({ printerData, onUpdate, showToast }) => {
```

par :

```javascript
const DashboardProfile = ({ printerData, onUpdate, showToast, limits, requireUpgrade }) => {
```

- [ ] **Step 2 : Ne pas enregistrer les liens sociaux pour un gratuit**

Dans `handleUpdate`, juste avant l'appel `.update(payload)` (ligne ~200), insérer une suppression conditionnelle des clés sociales :

```javascript
        if (limits && !limits.canSocialLinks) {
            delete payload.facebook;
            delete payload.instagram;
            delete payload.tiktok;
        }
```

> Si `payload` est construit autrement (vérifier le nom exact de l'objet passé à `.update(...)`), adapter le nom de variable. Le but : un compte gratuit n'écrit jamais ces 3 champs.

- [ ] **Step 3 : Verrouiller visuellement le bloc « Réseaux Sociaux »**

Remplacer l'ouverture du bloc social :

```javascript
                {/* Social Networks */}
                <div className="bg-white border border-dark/5 rounded-[3rem] p-10 space-y-6 shadow-xl shadow-dark/5">
                    <div className="flex items-center gap-3 mb-4">
                        <Globe size={18} className="text-primary" />
                        <h3 className="font-bold">Réseaux Sociaux</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
```

par :

```javascript
                {/* Social Networks */}
                <div className="bg-white border border-dark/5 rounded-[3rem] p-10 space-y-6 shadow-xl shadow-dark/5 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <Globe size={18} className="text-primary" />
                        <h3 className="font-bold">Réseaux Sociaux</h3>
                    </div>

                    {limits && !limits.canSocialLinks && (
                        <button
                            type="button"
                            onClick={() => requireUpgrade?.('social')}
                            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm text-center px-6"
                        >
                            <Lock size={28} className="text-primary" />
                            <span className="font-black text-dark">Réservé aux abonnés</span>
                            <span className="text-xs font-bold text-primary underline">Débloquer avec un abonnement</span>
                        </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
```

> `Lock` est déjà importé en haut de `DashboardProfile.jsx`.

- [ ] **Step 4 : Build + Commit**

Run : `npm run build` → Expected : build OK.

```bash
git add src/pages/dashboard/DashboardProfile.jsx
git commit -m "feat: liens réseaux sociaux réservés aux abonnés"
```

---

### Task 10 : Verrou statistiques (visites / clics)

**Files:**
- Modify: `src/pages/dashboard/DashboardOverview.jsx`

- [ ] **Step 1 : Accepter les nouvelles props**

Remplacer la signature :

```javascript
const DashboardOverview = ({ printerData, setActiveTab }) => {
```

par :

```javascript
const DashboardOverview = ({ printerData, setActiveTab, limits, requireUpgrade }) => {
```

- [ ] **Step 2 : Importer l'icône `Lock`**

Remplacer la ligne d'import lucide :

```javascript
import { Star, TrendingUp, MessageSquare, Eye, Loader2, QrCode, Download } from 'lucide-react';
```

par :

```javascript
import { Star, TrendingUp, MessageSquare, Eye, Loader2, QrCode, Download, Lock } from 'lucide-react';
```

- [ ] **Step 3 : Flouter les cartes Visites/Clics pour un gratuit**

Localiser le rendu des cartes stats (`{stats.map((stat, i) => (`, ligne ~349). Remplacer l'ouverture de la carte mappée pour superposer un verrou sur les deux premières cartes (Visites = i 0, Clics = i 1). Remplacer :

```javascript
                {stats.map((stat, i) => (
```

par :

```javascript
                {stats.map((stat, i) => {
                    const locked = limits && !limits.canSeeStats && (i === 0 || i === 1);
                    return (
```

Puis, juste APRÈS la balise ouvrante de la carte (le premier `<div ...>` enfant du `.map`), insérer le calque de verrou ; et fermer la fonction fléchée. Comme la structure exacte de la carte varie, appliquer ce patron : enrober le contenu de chaque carte d'un conteneur `relative`, et si `locked`, ajouter en overlay :

```jsx
                        {locked && (
                            <button
                                type="button"
                                onClick={() => requireUpgrade?.('stats')}
                                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-white/60 backdrop-blur-md text-center"
                            >
                                <Lock size={22} className="text-primary" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-primary">Abonnés</span>
                            </button>
                        )}
```

et remplacer la fermeture `))}` du `.map` par `);
                })}`.

> Implémentation concrète attendue : la carte stat racine doit être `position: relative` (ajouter `relative` à sa className si absent) pour que l'overlay `absolute inset-0` se superpose. Ne flouter QUE les cartes i===0 et i===1 (Visites, Clics) ; les autres cartes restent intactes.

- [ ] **Step 4 : Build + Commit**

Run : `npm run build` → Expected : build OK.

```bash
git add src/pages/dashboard/DashboardOverview.jsx
git commit -m "feat: stats visites/clics réservées aux abonnés"
```

---

### Task 11 : Vérification manuelle de bout en bout

**Files:** aucun (validation).

- [ ] **Step 1 : Lancer le dev**

Run : `npm run dev`
Expected : serveur Vite démarré.

- [ ] **Step 2 : Tester les quotas (compte gratuit réel, non abonné)**

- Services : ajouter 3 services OK ; au 4ᵉ clic « Ajouter un service » → l'overlay de facturation s'ouvre (message « limite de 3 services »).
- Portfolio : à la 4ᵉ tentative d'ajout → overlay (message portfolio).
- Boutique : au 3ᵉ produit → overlay (message produits).

- [ ] **Step 3 : Tester les fonctions verrouillées**

- Onglet Profil : le bloc « Réseaux Sociaux » est masqué par « Réservé aux abonnés » → clic ouvre l'overlay.
- Onglet Vue d'ensemble : les cartes « Visites Profil » et « Clics WhatsApp » sont floutées → clic ouvre l'overlay.

- [ ] **Step 4 : Tester le sélecteur de devise**

Dans l'overlay (ou l'onglet Facturation), basculer FCFA / € / $ : les prix se reconvertissent (200 F ≈ 0,30 € ≈ 0,33 $ ; 75 000 F ≈ 114,34 €). Le bouton « Souscrire » lance bien le checkout (paiement en FCFA).

- [ ] **Step 5 : Tester le palier abonné**

Avec un compte mock (`isMock`) ou un compte dont `subscription_ends_at` est dans le futur : aucun quota, aucun verrou (tout illimité, liens sociaux + stats visibles).

---

## Self-review (couverture spec)

- Quotas 3/3/2 → Tasks 6, 7, 8. ✓
- Liens sociaux réservés → Task 9. ✓
- Stats réservées → Task 10. ✓
- Page de facturation contextuelle → Tasks 4, 5. ✓
- Formules 200/18 659/75 000 + cadence → Tasks 1, 2, 3. ✓
- Multi-devises affichage → Tasks 1, 3. ✓
- `isSubscriber` / `getTierLimits` → Task 1. ✓
- Rappel 7 j → **Phase 2, plan séparé** (hors de ce plan).

## Notes

- Cohérence des prix : `src/lib/subscription.js` et `supabase/functions/_shared/geniuspay.ts` doivent rester alignés (1m=200, 3m=18659, 1an=75000 / 12 mois).
- Aucune désactivation de compte : on ne touche pas à `expire_overdue_subscriptions` ni au paywall plein écran (laissé désactivé).
- Le gating est côté client (UX) ; durcissement serveur hors périmètre v1.
