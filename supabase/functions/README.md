# Edge Functions — Abonnements Moneroo

Deux fonctions gèrent les abonnements prépayés :

- `moneroo-checkout` — initialise un paiement Moneroo (appelée depuis le dashboard).
- `moneroo-webhook` — reçoit la confirmation de paiement et active l'abonnement.

## Prérequis

1. Installer la CLI Supabase puis se lier au projet :
   ```bash
   supabase login
   supabase link --project-ref <ref-du-projet>
   ```
2. Exécuter la migration SQL `setup_subscription.sql` dans l'éditeur SQL Supabase
   (après `setup_database.sql`).

## Secrets à définir

```bash
supabase secrets set MONEROO_SECRET_KEY="<clé secrète Moneroo>"
supabase secrets set MONEROO_WEBHOOK_SECRET="<webhook secret Moneroo>"
supabase secrets set SITE_URL="https://printacote.com"
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés
automatiquement par la plateforme — ne pas les redéfinir.

## Déploiement

```bash
supabase functions deploy moneroo-checkout
supabase functions deploy moneroo-webhook --no-verify-jwt
```

(`config.toml` fixe déjà `verify_jwt = false` pour le webhook ; le flag
`--no-verify-jwt` est une ceinture-bretelles.)

## Configuration côté Moneroo

Dashboard Moneroo → **Developers → Webhooks**, ajouter l'URL :

```
https://<ref-du-projet>.supabase.co/functions/v1/moneroo-webhook
```

et copier le **webhook secret** généré dans `MONEROO_WEBHOOK_SECRET`.

## Test en bac à sable

Moneroo utilise une clé de test (même URL `api.moneroo.io`). Cartes de test :
`4242 4242 4242 4242` (succès), `4000 0000 0000 0002` (refus). Mobile money :
n'importe quel numéro, code OTP simulé `123456`.

Vérifier qu'un abonnement n'est accordé qu'**une seule fois** même si le webhook
est rejoué (dédup `processed_events` + garde `WHERE status = 'pending'`).

---

## GeniusPay (passerelle active)

GeniusPay est la passerelle proposée côté front. Les fonctions Moneroo/PayTech
restent déployables mais ne sont plus invoquées par l'UI.

### Secrets (jamais commités)

```bash
supabase secrets set GENIUSPAY_API_KEY="pk_sandbox_xxx"
supabase secrets set GENIUSPAY_API_SECRET="sk_sandbox_xxx"
supabase secrets set GENIUSPAY_WEBHOOK_SECRET="whsec_xxx"
# SITE_URL déjà défini ; sinon :
supabase secrets set SITE_URL="https://printacote.com"
```

Passage en production : remplacer `pk_sandbox_`/`sk_sandbox_` par `pk_live_`/`sk_live_`.

### Déploiement

```bash
supabase functions deploy geniuspay-checkout
supabase functions deploy geniuspay-webhook
```

### Webhook GeniusPay

Dans le dashboard GeniusPay (ou via `POST /webhooks`), enregistrer l'URL :

```
https://<ref-du-projet>.supabase.co/functions/v1/geniuspay-webhook
```

abonnée à `payment.success`, `payment.failed`, `payment.cancelled`, `payment.expired`.
Le secret renvoyé (`whsec_...`) doit correspondre à `GENIUSPAY_WEBHOOK_SECRET`.

### Vérification

Lancer un paiement de test (plan 1 mois, 150 FCFA) depuis l'onglet « Facturation »
du dashboard, payer en sandbox, puis vérifier que `subscription_payments` passe
`pending → completed` et que `printers.subscription_ends_at` est prolongé. Re-livrer
le webhook (bouton « Tester ») doit répondre `deduped` sans double prolongation.
