# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Langue

Réponds toujours en français. Tout le texte destiné à l'utilisateur (explications, résumés, questions, mises à jour de statut, messages de commit, descriptions de PR) doit être rédigé en français.

Le code, les identifiants, les chemins de fichiers, les noms de commandes et les jetons techniques restent dans leur langue d'origine. Les commentaires dans le code restent dans la langue déjà utilisée dans le fichier environnant.

## Commandes

```bash
npm run dev      # serveur de dev Vite
npm run build    # build de production -> dist/
npm run preview  # prévisualise le build
npm run lint     # ESLint sur tout le projet
```

Il n'y a pas de suite de tests dans ce projet.

## Vue d'ensemble

Printacote est une SPA React 19 + Vite qui met en relation les imprimeurs locaux (Sénégal) avec leurs clients. Backend entièrement géré par **Supabase** (auth, base Postgres, storage). Stylisation via **Tailwind CSS v3** ; animations via **GSAP** ; icônes **lucide-react**.

### Routing (pas de react-router)

Le routing est **fait maison** dans [src/App.jsx](src/App.jsx) : un état `page` (useState) sélectionne quelle page rendre, et deux dictionnaires `pageToPath` / `pathToPage` synchronisent cet état avec `window.history.pushState` + l'événement `popstate`. Pour ajouter une route : ajouter l'entrée dans les deux dictionnaires **et** la condition de rendu `{page === '...' && <Page setPage={setPage} />}`. Les pages reçoivent `setPage` pour naviguer — il n'y a pas de `<Link>`.

Le dashboard est une sous-navigation interne pilotée par l'état `activeTab` dans [src/pages/DashboardPage.jsx](src/pages/DashboardPage.jsx) (onglets : `overview`, `profile`, `services`, `portfolio` + marketplace). DashboardPage charge les données de l'imprimeur une fois et passe `printerData` + un callback `onUpdate`/`fetchPrinterData` à chaque sous-composant de [src/pages/dashboard/](src/pages/dashboard/).

### Authentification — attention au mode mock

Deux mécanismes d'auth coexistent et **le mock a priorité sur Supabase** :

1. **Supabase Auth** standard (`signInWithPassword`, `onAuthStateChange`).
2. **Session mock** : une entrée `localStorage['mock_user_session']`. Dans [src/App.jsx](src/App.jsx), tant que cette clé existe, `onAuthStateChange` est ignoré et l'utilisateur mock est restauré au démarrage. Utilisée par le flux de récupération OTP de [src/pages/LoginPage.jsx](src/pages/LoginPage.jsx).

Le flux de récupération de mot de passe par OTP tente d'abord `supabase.auth.verifyOtp`, puis retombe sur un mode **démo local** (code généré côté client, stocké dans localStorage, expiration 60 s, limite de 2 requêtes) si la fonction SQL `send_recovery_email` n'est pas installée. Le changement de mot de passe forcé après récupération est géré via le flag `forcePasswordChange` (localStorage) dans DashboardPage.

### Données (Supabase Postgres)

Le schéma vit dans [setup_database.sql](setup_database.sql) (à exécuter manuellement dans Supabase) :
- `printers` — profil imprimeur, lié à `auth.users` via `owner_id` ; contient des compteurs `views`/`clicks` et des colonnes JSONB redondantes (`services`, `portfolio`, `reviews`). `status` par défaut `'Désactivé'`.
- `services`, `portfolio`, `products` — tables enfants référençant `printers(id)`.

**RLS activée** sur toutes les tables : lecture publique, écriture restreinte au propriétaire (`auth.uid() = owner_id`). Fonctions Postgres notables : `handle_new_user` (trigger création profil), `increment_printer_views` / `increment_printer_clicks` (appelées via `supabase.rpc(...)`), `send_recovery_email`. Les notifications produits sont dans [setup_notification.sql](setup_notification.sql).

### Abonnements & paiements (Moneroo)

Modèle **prépayé** (Moneroo ne fait pas de prélèvement récurrent) : 7 jours d'essai à l'inscription, puis formules 1/3/6 mois (5 000 / 12 000 / 20 000 FCFA) payées en une fois. Le paiement prolonge l'accès ; renouvellement manuel.

- **SQL** : [setup_subscription.sql](setup_subscription.sql) ajoute des colonnes à `printers` (`trial_ends_at`, `subscription_status`, `subscription_ends_at`, `subscription_plan`), les tables `subscription_payments` et `processed_events`, et les fonctions `complete_subscription_payment` (activation idempotente) + `expire_overdue_subscriptions` (cron facultatif). `handle_new_user` initialise l'essai de 7 jours.
- **Edge Functions** (Deno) dans [supabase/functions/](supabase/functions/) : `moneroo-checkout` (init paiement, **prix lu côté serveur** — jamais celui du client) et `moneroo-webhook` (vérif HMAC `X-Moneroo-Signature`, dédup, re-query, activation). Le webhook est en `verify_jwt = false` ([config.toml](supabase/config.toml)). Déploiement & secrets : voir [supabase/functions/README.md](supabase/functions/README.md).
- **Frontend** : [src/lib/subscription.js](src/lib/subscription.js) (`getSubscriptionState`, catalogue `PLANS` — doit rester aligné avec le catalogue serveur dans [_shared/moneroo.ts](supabase/functions/_shared/moneroo.ts)), [src/components/SubscriptionPanel.jsx](src/components/SubscriptionPanel.jsx) (grille + `supabase.functions.invoke('moneroo-checkout')` → redirection). Dans [DashboardPage.jsx](src/pages/DashboardPage.jsx) : paywall plein écran si `!hasAccess`, bannière de compte à rebours en essai, onglet « Facturation ». Au retour de Moneroo (`/dashboard?payment=return`), le dashboard rafraîchit les données en boucle pour capter l'activation par le webhook. Les comptes mock ont un accès complet.

### Storage

Les uploads (logos, couvertures, portfolio, produits) vont tous dans le bucket Supabase **`public-assets`**, avec un chemin préfixé par l'id de l'imprimeur (`${printerData.id}/...`), puis `getPublicUrl` pour récupérer l'URL stockée en base.

### Variables d'environnement

Dans `.env` (préfixe `VITE_` obligatoire pour l'exposition côté client) :
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RESEND_API_KEY`. Le client Supabase est instancié dans [src/lib/supabase.js](src/lib/supabase.js).

## Conventions de design (cf. [gemini.md](gemini.md))

- Système de design « Luxe de Minuit » : couleurs Tailwind personnalisées `primary`/`dark` = `#3D0B37` (aubergine), `accent`/`background` = `#F5F5DC` (beige lin) — voir [tailwind.config.js](tailwind.config.js).
- Rayons généreux (`rounded-[2rem]` / `rounded-[4rem]`) et overlay de bruit (`noise-overlay`, filtre SVG injecté dans [index.html](index.html)).
- Toute nouvelle animation doit utiliser `gsap.context()`.
- Polices chargées via Google Fonts dans `index.html` (Inter, Playfair Display, etc.).
- Conversion rapide : liens directs WhatsApp / téléphone. Préférer les intégrations sans clé API (ex. carte via iframe OpenStreetMap).

## Notes

- Les fichiers `patch_dashboard.{js,cjs}` et `update_app.patch` sont des scripts de migration ponctuels et historiques — pas du code applicatif actif.
- `.gitignore` n'ignore que `node_modules` ; ne pas committer `.env`.
