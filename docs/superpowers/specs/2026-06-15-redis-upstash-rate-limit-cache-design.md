# Intégration Redis (Upstash) — Rate limiting + Cache

**Date** : 2026-06-15
**Statut** : conçu, en attente de relecture
**Approche retenue** : B — phasé par valeur

## Contexte & contraintes

Printacote est une SPA React 19 + Vite. Le frontend parle à Supabase **en direct**
(client JS dans le navigateur). Le backend serveur disponible se limite aux
**Edge Functions Deno** (`supabase/functions/`).

Deux contraintes structurantes :

1. **Redis ne peut pas s'intercaler dans un appel navigateur → Supabase.** Pour qu'un
   cache serve, la lecture doit passer par une Edge Function (« Redis d'abord, Supabase ensuite »).
2. **Le secret Redis ne doit jamais finir dans le bundle.** Tout ce qui est préfixé
   `VITE_` (ou inclus dans le build) est lisible par n'importe quel visiteur. Le token
   Upstash vit donc **uniquement** en secret d'Edge Function (`Deno.env`).

> ⚠️ Le token Upstash fourni a été exposé en clair lors de la conception. Il doit être
> **régénéré dans la console Upstash** une fois l'intégration en place.

## Principe non négociable

**Redis ne doit jamais casser l'app.** Toute opération Redis est encapsulée dans un `try/catch` :

- **Cache en erreur** → on lit Supabase directement (comportement identique à un cache miss).
- **Rate limit en erreur** → **fail-open** (on laisse passer la requête) + log serveur. On ne
  bloque jamais un vrai utilisateur parce qu'Upstash est indisponible.

## 1. Brique partagée — `supabase/functions/_shared/redis.ts`

Client Upstash via REST (adapté à Deno/serverless), exposant :

- `redis` — instance client Upstash, lit `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
  depuis `Deno.env`.
- `rateLimit(key, { max, windowSec })` → `{ allowed: boolean, remaining: number }`.
  Implémentation : `INCR` de la clé, puis `EXPIRE` au premier hit (fenêtre fixe simple,
  sans dépendance externe lourde). En cas d'erreur Redis : retourne `{ allowed: true }`.
- `withCache(key, ttlSec, fetcher)` → renvoie la valeur cachée (JSON parsé) si présente ;
  sinon exécute `fetcher()`, stocke le résultat (`SET` + `EX ttlSec`) et le renvoie.
  En cas d'erreur Redis : exécute et renvoie `fetcher()` sans cacher.

## 2. Phase 1 — Rate limiting (2 Edge Functions)

> **Correction de conception (constat code) :** tous les emails partent déjà côté serveur
> via des fonctions Postgres + `pg_net` → Resend (la clé vit dans la table `secure_configs`,
> pas dans `VITE_RESEND_API_KEY` qui est inutilisée). Il n'y a **aucun envoi d'email côté
> client** à intercepter → la fonction `send-email` initialement prévue est **supprimée**.
> Le seul email déclenché par une action utilisateur est la récupération, couverte par
> `recovery-request`.

Le frontend remplace les appels directs par `supabase.functions.invoke('<fn>')`.

| Fonction | Clé de limite | Limite | `verify_jwt` |
|---|---|---|---|
| `recovery-request` | `rl:recovery:<email>` + `rl:recovery:ip:<ip>` | 3 / 15 min par email · 10 / h par IP | `false` |
| `support-message` | `rl:support:<userId>` | 5 / min · 30 / h | `true` |

Détails :

- **`recovery-request`** : reçoit `{ email }`, applique les deux limites, puis appelle la RPC
  `send_recovery_email` **côté serveur via la clé service role** (génère le code, envoie l'email).
  En cas de dépassement → `429` avec message explicite.
  **Blindage (anti-contournement)** : on `REVOKE EXECUTE` sur `send_recovery_email` pour les rôles
  `anon` et `authenticated`. Ainsi un appel `supabase.rpc('send_recovery_email')` direct depuis le
  navigateur échoue ; seule l'Edge Function (service role, qui ignore le REVOKE) peut la déclencher.
  Le rate limit devient donc **effectif**, pas seulement cosmétique.
- **`support-message`** : reçoit `{ message }`, identifie l'imprimeur via le JWT Supabase,
  applique la limite, puis insère dans `admin_messages` (`direction = 'printer_to_admin'`)
  avec la clé service role.

L'IP est lue depuis les en-têtes de la requête (`x-forwarded-for`).

## 3. Phase 2 — Cache (2 Edge Functions)

| Fonction | Source | Clé Redis | TTL | Accès |
|---|---|---|---|---|
| `printers-list` | table `printers` (lecture publique) | `cache:printers:list` | 120 s | `verify_jwt=false` |
| `admin-stats` | RPC `admin_get_global_stats` | `cache:admin:stats` | 300 s | `verify_jwt=false` + header `x-admin-token` |

- **`printers-list`** : enveloppe la lecture publique des imprimeurs dans `withCache`. Le
  frontend (accueil / marketplace) appelle cette fonction au lieu de la requête directe.
- **`admin-stats`** : l'espace admin n'est **pas** authentifié via Supabase (mot de passe en
  dur côté front). Une Edge Function publique exposerait les stats globales à tout le monde.
  Elle est donc protégée par un **secret partagé** `ADMIN_API_TOKEN` (secret EF), comparé à
  l'en-tête `x-admin-token` envoyé par `AdminPage.jsx`. Si absent/incorrect → `401`.

**Invalidation** : TTL seul en phase 2 (simple et suffisant). Invalidation active
(suppression de clé sur écriture) repoussée à une itération ultérieure si besoin.

## 4. Config & secrets

```bash
supabase secrets set \
  UPSTASH_REDIS_REST_URL=... \
  UPSTASH_REDIS_REST_TOKEN=... \
  ADMIN_API_TOKEN=<valeur générée aléatoirement>
```

Ajouter les 4 fonctions dans `supabase/config.toml` avec leur `verify_jwt` respectif
(cf. tableaux ci-dessus), en suivant le format des fonctions `*-checkout` / `*-webhook`
existantes.

## 5. Modifications frontend

| Emplacement | Avant | Après |
|---|---|---|
| `LoginPage.jsx` (récupération) | `supabase.rpc('send_recovery_email')` direct | `invoke('recovery-request')` |
| `DashboardPage.jsx` (Contact Support) | insert direct `admin_messages` | `invoke('support-message')` |
| `PrintersPage.jsx` (liste publique) | requête directe `printers` | `invoke('printers-list')` |
| `AdminPage.jsx` (vue d'ensemble) | `rpc('admin_get_global_stats')` | `invoke('admin-stats')` + header `x-admin-token` |

## 6. Hors périmètre (Phase 3, ultérieure)

- Cache du **profil imprimeur public** et du **catalogue produits / portfolio** — déclenché
  seulement si la latence ajoutée par le passage en Edge Function se justifie.
- Invalidation active du cache sur écriture.

## Critères de succès

- Le token Upstash n'apparaît dans aucun fichier `VITE_`/bundle.
- Une panne Upstash ne bloque ni les connexions, ni les lectures (fail-open + cache bypass).
- Les 3 flux rate-limités renvoient `429` au-delà du seuil et fonctionnent normalement en-deçà.
- `printers-list` et `admin-stats` servent depuis Redis dans la fenêtre de TTL (cache hit vérifiable).
- `admin-stats` refuse (`401`) toute requête sans `x-admin-token` valide.
