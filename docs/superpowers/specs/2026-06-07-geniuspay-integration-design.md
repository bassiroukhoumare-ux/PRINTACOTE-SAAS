# Design — Intégration de la passerelle de paiement GeniusPay

Date : 2026-06-07
Branche : `feat/connexion-google-onboarding` (à dériver vers une branche dédiée)

## Contexte et objectif

Brancher **GeniusPay** (https://geniuspay.ci) comme passerelle de paiement pour les
abonnements des imprimeurs Printacote. L'infra d'abonnement existe déjà (modèle prépayé
7 j d'essai + formules 1/3/6 mois, tables `subscription_payments` / `processed_events`,
activation idempotente `complete_subscription_payment`) et supporte déjà deux passerelles
(Moneroo, PayTech) selon un patron checkout + webhook par passerelle.

GeniusPay est une **3ᵉ passerelle clonée sur ce patron**.

### Décisions de cadrage (validées avec l'utilisateur)

1. **GeniusPay seule** est activée côté front. Moneroo/PayTech restent dans le code mais
   ne sont plus proposés (pas de modal de choix de passerelle).
2. **Le paywall reste désactivé** pour l'instant (état du commit `b5d8a9a`). On branche le
   paiement sans bloquer l'accès au dashboard. La réactivation du paywall est une étape
   ultérieure, hors périmètre.
3. **Pas de page de tarifs publique.** L'abonnement reste dans le dashboard via le
   `SubscriptionPanel` existant.
4. Tarif de test : plan **1 mois = 150 FCFA** (valeur de test, à remonter en prod).

## API GeniusPay (extrait pertinent)

- Base URL : `https://geniuspay.ci/api/v1/merchant`
- Auth (headers) : `X-API-Key` (`pk_...`), `X-API-Secret` (`sk_...`) — **le secret reste
  côté serveur uniquement**.
- **Créer un paiement** : `POST /payments`
  - Body : `amount` (XOF, min 200), `currency` (`XOF`), `description`, `customer{...}`,
    `success_url`, `error_url`, `metadata{}` (clé/valeur, renvoyées dans webhooks + GET).
  - En **omettant `payment_method`** → page de checkout hébergée GeniusPay (le client
    choisit Wave / Orange / MTN / Moov / carte).
  - Réponse `data` : `{ id, reference, amount, status: "pending", checkout_url, payment_url,
    expires_at }` (lien valable 24 h).
- **Récupérer un paiement** (re-query) : `GET /payments/{reference}`
  - Réponse `data` : `{ reference, status, metadata }`.
- **Webhook** (notification serveur→serveur) :
  - Headers : `X-Webhook-Signature` (HMAC-SHA256), `X-Webhook-Timestamp` (Unix),
    `X-Webhook-Event` (ex. `payment.success`), `X-Webhook-Environment`.
  - Signature : `HMAC-SHA256(timestamp + "." + json_payload, webhook_secret)`,
    clé `whsec_...`. Protection anti-rejeu : rejeter si `|now - timestamp| > 300 s`.
  - Payload : `{ id, event, timestamp, data{ object, id, reference, amount, currency,
    status, payment_method, provider, metadata{...} }, environment }`.
  - Événements : `payment.success`, `payment.failed`, `payment.cancelled`,
    `payment.expired`, etc.
- Statuts transaction : `pending`, `processing`, `completed`, `failed`, `cancelled`,
  `refunded`.

## Architecture

### Nouveaux fichiers

1. **`supabase/functions/_shared/geniuspay.ts`** — adaptateur Deno :
   - `PLANS` : catalogue serveur (prix faisant foi) — `{ '1m': {months:1, amount:150},
     '3m': {months:3, amount:12000}, '6m': {months:6, amount:20000} }` (aligné sur
     `src/lib/subscription.js`).
   - `initiateGeniusPayPayment(params, apiKey, apiSecret)` → `POST /payments` (sans
     `payment_method`), renvoie `{ ok, reference, checkoutUrl }` ou `{ ok:false, error }`.
     Timeout 15 s via `AbortController` (comme PayTech).
   - `getGeniusPayPayment(reference, apiKey, apiSecret)` → `GET /payments/{reference}`
     (re-query de confirmation côté webhook).
   - `verifyGeniusPaySignature(timestamp, rawBody, signature, secret)` → HMAC-SHA256 via
     `crypto.subtle`, comparaison en temps constant (réutilise `timingSafeEqual`).

2. **`supabase/functions/geniuspay-checkout/index.ts`** — calqué sur `paytech-checkout` :
   - `OPTIONS`/CORS, `POST` only.
   - Authentifie l'imprimeur via JWT (décodage direct, `verify_jwt = true` côté gateway).
   - Lit `plan` du body, **prix lu côté serveur** depuis `PLANS` (anti-fraude).
   - Récupère le profil imprimeur (service role).
   - Insère une ligne `subscription_payments` `pending` (`provider: 'geniuspay'`) **avant**
     l'appel passerelle ; l'`id` (UUID) sert d'identifiant de corrélation.
   - Appelle `initiateGeniusPayPayment` avec :
     - `metadata: { payment_id: <UUID>, owner_id, plan }`
     - `success_url: ${SITE_URL}/dashboard?payment=return&pid=<UUID>`
     - `error_url: ${SITE_URL}/dashboard?payment=cancel&pid=<UUID>`
   - Stocke `provider_transaction_id = reference` GeniusPay + `checkout_url`.
   - Renvoie `{ checkoutUrl, paymentId }`.

3. **`supabase/functions/geniuspay-webhook/index.ts`** — calqué sur `paytech-webhook` :
   - `POST` only, **lit le corps brut** (`req.text()`) avant tout parse (nécessaire pour la
     signature).
   - Vérifie la signature HMAC (`X-Webhook-Signature` + `X-Webhook-Timestamp`) → 401 sinon.
   - Vérifie la fenêtre anti-rejeu 5 min → 400 si trop ancien.
   - Parse le payload ; ignore les événements non terminaux (ne traite que
     `payment.success` ; `payment.failed`/`cancelled`/`expired` → marque la ligne `failed`).
   - **Déduplication** via `processed_events` (`provider:'geniuspay'`,
     `event_id: payload.id`) → 200 `deduped` si déjà vu.
   - Retrouve la ligne via `metadata.payment_id` (notre UUID) ; fallback sur `reference`.
   - **Anti-altération du montant** : compare `data.amount` à `payment.amount`.
   - **Re-query de confirmation** : `getGeniusPayPayment(reference)` → exige
     `status === 'completed'` avant activation (le webhook seul n'active pas).
   - Active via `complete_subscription_payment(p_payment_id, p_tx_id: reference)`
     (idempotent, déjà agnostique de la passerelle).
   - Renvoie toujours 200 sur les cas « connus mais non activables » (dédoublonnage,
     inconnu) pour éviter les retries inutiles de GeniusPay.

### Fichiers modifiés

4. **`supabase/config.toml`** — ajouter :
   ```toml
   [functions.geniuspay-checkout]
   verify_jwt = true
   [functions.geniuspay-webhook]
   verify_jwt = false
   ```

5. **`src/components/SubscriptionPanel.jsx`** — remplacer l'invocation
   `supabase.functions.invoke('moneroo-checkout', …)` par `'geniuspay-checkout'`. Retirer /
   masquer tout choix de passerelle (GeniusPay seule). Conserver la redirection vers
   `checkoutUrl` et le polling au retour (`/dashboard?payment=return`).

6. **`src/lib/subscription.js`** — `PLANS` reste la source UX ; vérifier l'alignement exact
   avec le catalogue serveur GeniusPay (mêmes `id`/`months`/`amount`).

7. **`supabase/functions/README.md`** — documenter les secrets et le déploiement GeniusPay.

### Secrets (jamais commités — `supabase secrets set`)

- `GENIUSPAY_API_KEY` = `pk_sandbox_...`
- `GENIUSPAY_API_SECRET` = `sk_sandbox_...`
- `GENIUSPAY_WEBHOOK_SECRET` = `whsec_...`
- `GENIUSPAY_ENV` = `sandbox` | `live` (défaut `sandbox`)
- Réutilise `SITE_URL` déjà en place.
- Fournis par la plateforme : `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`.

## Flux de données

```
Dashboard → invoke('geniuspay-checkout', { plan })
  → Edge checkout : JWT ok → prix serveur → INSERT subscription_payments
        (id=UUID, status=pending, provider='geniuspay', plan, months, amount)
     → POST /payments { amount, currency:XOF, description, success_url, error_url,
                        metadata:{ payment_id:UUID, owner_id, plan } }
     → reçoit { reference, checkout_url } → UPDATE (provider_transaction_id=reference,
        checkout_url)
     → renvoie { checkoutUrl }
  → redirection client vers checkout_url (Wave / Orange / MTN / Moov / carte)
  → retour /dashboard?payment=return → le dashboard re-poll les données

GeniusPay → POST geniuspay-webhook
  → vérif signature HMAC(timestamp + "." + body, whsec) + timestamp < 5 min
  → si event != payment.success → marque failed/ignore → 200
  → dédup processed_events(payload.id) → 200 si déjà traité
  → retrouve ligne via metadata.payment_id → contrôle montant
  → GET /payments/{reference} (re-query) → exige status=completed
  → complete_subscription_payment(UUID, reference) [idempotent] → 200
```

## Sécurité

- `sk_...` et `whsec_...` **uniquement** en secrets Edge Functions, jamais côté client ni
  dans un fichier commité.
- Prix **toujours** lu côté serveur (jamais celui envoyé par le client).
- Webhook : signature HMAC + fenêtre anti-rejeu 5 min + dédup + **re-query** avant
  activation. Comparaison de signature en temps constant.
- Activation idempotente (passe à `completed` seulement si `pending`).

## Tests / vérification (pas de suite de tests automatisée dans le projet)

Vérification manuelle en sandbox :
1. Déployer les 2 fonctions + déposer les secrets sandbox.
2. Créer le webhook GeniusPay pointant sur `…/functions/v1/geniuspay-webhook`, abonné à
   `payment.success` (+ `failed`/`cancelled`/`expired`).
3. Depuis le dashboard, lancer un paiement de test (150 FCFA) → checkout GeniusPay →
   payer en sandbox → vérifier la redirection retour.
4. Vérifier en base : `subscription_payments` passe `pending → completed`, et le
   `printers.subscription_ends_at` est prolongé.
5. Re-livrer le même webhook (bouton « Tester ») → vérifier l'idempotence (pas de double
   prolongation, réponse `deduped`).

## Hors périmètre

- Réactivation du paywall / blocage d'accès.
- Page de tarifs publique.
- Retrait du code Moneroo/PayTech (conservé, simplement non proposé).
- Remboursements / cashout.
- Passage en clés `live` (à faire quand la sandbox est validée).
