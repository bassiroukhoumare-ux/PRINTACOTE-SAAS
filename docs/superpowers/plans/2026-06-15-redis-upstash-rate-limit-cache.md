# Intégration Redis (Upstash) — Rate limiting + Cache — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter Redis (Upstash) à Printacote pour rate-limiter le flux de récupération et la messagerie support, et mettre en cache la liste publique des imprimeurs et les stats admin — le tout via des Edge Functions Deno, sans jamais exposer le secret Redis côté client.

**Architecture:** Une brique partagée `_shared/redis.ts` (client Upstash REST + helpers `rateLimit` et `withCache`, tous fail-safe). Quatre Edge Functions Deno l'utilisent. Le frontend remplace ses appels Supabase directs par `supabase.functions.invoke(...)` pour les opérations concernées. Une migration SQL `REVOKE` empêche de contourner le rate limit de récupération.

**Tech Stack:** Deno (Edge Functions Supabase), `@upstash/redis` (client REST via esm.sh), React 19 + Vite (frontend), Postgres (Supabase).

**Note sur les tests :** ce projet n'a **pas** de suite de tests JS (cf. CLAUDE.md). On introduit des tests unitaires **Deno** (`deno test`) uniquement pour la brique pure `_shared/redis.ts` (logique testable hors réseau via un faux client Redis). Les Edge Functions et le câblage frontend sont vérifiés manuellement (`deno check`, `supabase functions serve` + `curl`, `npm run build`/`npm run lint`, et test manuel dans le navigateur), comme le reste du projet.

**Prérequis avant exécution :**
- Deno installé (`deno --version`) et Supabase CLI (`supabase --version`).
- Les secrets seront posés en fin de plan (Task 7). Pour tester en local : créer un fichier `supabase/functions/.env` (déjà ignoré ? sinon NE PAS committer) avec `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_API_TOKEN`.

---

## Structure des fichiers

**Créés :**
- `supabase/functions/_shared/redis.ts` — client Upstash + `rateLimit` + `withCache`
- `supabase/functions/_shared/redis_test.ts` — tests unitaires Deno de la brique
- `supabase/functions/recovery-request/index.ts` — EF rate-limit récupération
- `supabase/functions/support-message/index.ts` — EF rate-limit messagerie support
- `supabase/functions/printers-list/index.ts` — EF cache liste imprimeurs publique
- `supabase/functions/admin-stats/index.ts` — EF cache stats globales admin
- `setup_redis_revoke.sql` — REVOKE EXECUTE sur `send_recovery_email`

**Modifiés :**
- `supabase/functions/_shared/cors.ts` — autoriser l'en-tête `x-admin-token`
- `supabase/config.toml` — 4 nouveaux blocs `[functions.*]`
- `src/pages/LoginPage.jsx` — récupération via `invoke('recovery-request')`
- `src/pages/DashboardPage.jsx` — support via `invoke('support-message')`
- `src/pages/PrintersPage.jsx` — liste via `invoke('printers-list')`
- `src/pages/AdminPage.jsx` — stats via `invoke('admin-stats')`

---

## Task 1 : Brique partagée `_shared/redis.ts` (TDD)

**Files:**
- Create: `supabase/functions/_shared/redis.ts`
- Test: `supabase/functions/_shared/redis_test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `supabase/functions/_shared/redis_test.ts` :

```ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { rateLimit, withCache } from "./redis.ts";

// Faux client Redis en mémoire, suffisant pour la logique.
function fakeRedis() {
  const store = new Map<string, unknown>();
  return {
    store,
    async incr(key: string) {
      const v = (Number(store.get(key)) || 0) + 1;
      store.set(key, v);
      return v;
    },
    async expire(_key: string, _sec: number) {/* no-op en mémoire */},
    async get(key: string) {
      return store.has(key) ? store.get(key) : null;
    },
    async set(key: string, value: unknown, _opts?: { ex?: number }) {
      store.set(key, value);
      return "OK";
    },
  };
}

// Client qui échoue systématiquement, pour vérifier le fail-open / bypass.
const throwingRedis = {
  incr() { throw new Error("redis down"); },
  expire() { throw new Error("redis down"); },
  get() { throw new Error("redis down"); },
  set() { throw new Error("redis down"); },
};

Deno.test("rateLimit autorise sous le seuil", async () => {
  const r = fakeRedis();
  const a = await rateLimit(r, "k", { max: 2, windowSec: 60 });
  assertEquals(a.allowed, true);
  assertEquals(a.remaining, 1);
  const b = await rateLimit(r, "k", { max: 2, windowSec: 60 });
  assertEquals(b.allowed, true);
  assertEquals(b.remaining, 0);
});

Deno.test("rateLimit bloque au-delà du seuil", async () => {
  const r = fakeRedis();
  await rateLimit(r, "k", { max: 1, windowSec: 60 });
  const blocked = await rateLimit(r, "k", { max: 1, windowSec: 60 });
  assertEquals(blocked.allowed, false);
});

Deno.test("rateLimit fail-open si Redis échoue", async () => {
  const res = await rateLimit(throwingRedis, "k", { max: 1, windowSec: 60 });
  assertEquals(res.allowed, true);
});

Deno.test("withCache renvoie la valeur cachée sans rappeler fetcher", async () => {
  const r = fakeRedis();
  let calls = 0;
  const fetcher = () => { calls++; return Promise.resolve({ n: 42 }); };
  const first = await withCache(r, "c", 60, fetcher);
  const second = await withCache(r, "c", 60, fetcher);
  assertEquals(first, { n: 42 });
  assertEquals(second, { n: 42 });
  assertEquals(calls, 1);
});

Deno.test("withCache exécute fetcher si Redis échoue (bypass)", async () => {
  let calls = 0;
  const fetcher = () => { calls++; return Promise.resolve({ n: 7 }); };
  const res = await withCache(throwingRedis, "c", 60, fetcher);
  assertEquals(res, { n: 7 });
  assertEquals(calls, 1);
});
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run : `deno test supabase/functions/_shared/redis_test.ts --allow-net --allow-env`
Expected : FAIL — `Module not found "./redis.ts"` (le fichier n'existe pas encore).

- [ ] **Step 3 : Implémenter la brique**

Créer `supabase/functions/_shared/redis.ts` :

```ts
// Brique partagée Redis (Upstash, REST). Utilisée par les Edge Functions.
// Principe : Redis ne doit JAMAIS casser l'app -> tout est en try/catch.
//   - cache en erreur  = on exécute le fetcher (comme un miss)
//   - rate-limit en erreur = fail-open (on laisse passer) + log
import { Redis } from "https://esm.sh/@upstash/redis@1.34.3";

// Interface minimale pour permettre l'injection d'un faux client dans les tests.
export interface RedisLike {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
}

let _client: Redis | null = null;

// Client paresseux : instancié au 1er appel, jamais à l'import (tests sans réseau).
export function getRedis(): Redis {
  if (!_client) {
    const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
    if (!url || !token) {
      throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN manquants");
    }
    _client = new Redis({ url, token });
  }
  return _client;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

// Fenêtre fixe simple : INCR puis EXPIRE au 1er hit.
export async function rateLimit(
  redis: RedisLike,
  key: string,
  { max, windowSec }: { max: number; windowSec: number },
): Promise<RateLimitResult> {
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return { allowed: count <= max, remaining: Math.max(0, max - count) };
  } catch (err) {
    console.error("rateLimit error (fail-open):", err);
    return { allowed: true, remaining: max };
  }
}

// Cache lecture : renvoie la valeur cachée, sinon exécute fetcher, stocke, renvoie.
export async function withCache<T>(
  redis: RedisLike,
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached !== null && cached !== undefined) return cached as T;
  } catch (err) {
    console.error("cache get error (bypass):", err);
  }
  const fresh = await fetcher();
  try {
    await redis.set(key, fresh, { ex: ttlSec });
  } catch (err) {
    console.error("cache set error (ignored):", err);
  }
  return fresh;
}
```

- [ ] **Step 4 : Lancer les tests pour les voir passer**

Run : `deno test supabase/functions/_shared/redis_test.ts --allow-net --allow-env`
Expected : PASS — 5 tests passés (`ok`).

- [ ] **Step 5 : Commit**

```bash
git add supabase/functions/_shared/redis.ts supabase/functions/_shared/redis_test.ts
git commit -m "feat(redis): brique partagee Upstash (rateLimit + withCache, fail-safe)"
```

---

## Task 2 : Edge Function `recovery-request` + REVOKE + frontend

**Files:**
- Create: `supabase/functions/recovery-request/index.ts`
- Create: `setup_redis_revoke.sql`
- Modify: `supabase/config.toml`
- Modify: `src/pages/LoginPage.jsx:213-260` (bloc d'appel `send_recovery_email`)

- [ ] **Step 1 : Écrire l'Edge Function**

Créer `supabase/functions/recovery-request/index.ts` :

```ts
// Edge Function : demande de code de récupération, rate-limitée.
// Rate limit : 3 / 15 min par email + 10 / h par IP.
// Puis appelle la RPC send_recovery_email via service role (qui ignore le REVOKE).
// Secrets : UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.
// Fournis par la plateforme : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getRedis, rateLimit } from "../_shared/redis.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  let email: string, recovery_code: string, client_ip: string, client_location: string, client_device: string;
  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
    recovery_code = String(body.recovery_code || "");
    client_ip = String(body.client_ip || "Inconnu");
    client_location = String(body.client_location || "Inconnue");
    client_device = String(body.client_device || "");
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }
  if (!email || !recovery_code) return json({ error: "Paramètres manquants" }, 400);

  // IP réelle (derrière le proxy Supabase).
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0";

  // Rate limit : par email puis par IP.
  const redis = getRedis();
  const byEmail = await rateLimit(redis, `rl:recovery:${email}`, { max: 3, windowSec: 15 * 60 });
  if (!byEmail.allowed) {
    return json({ error: "Trop de demandes pour cette adresse. Réessayez plus tard." }, 429);
  }
  const byIp = await rateLimit(redis, `rl:recovery:ip:${ip}`, { max: 10, windowSec: 60 * 60 });
  if (!byIp.allowed) {
    return json({ error: "Trop de demandes depuis ce réseau. Réessayez plus tard." }, 429);
  }

  // Appel RPC via service role (contourne le REVOKE anon/authenticated).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await admin.rpc("send_recovery_email", {
    email_to: email,
    recovery_code,
    client_ip,
    client_location,
    client_device,
  });
  if (error) {
    // On renvoie le message brut pour que le front distingue "email inexistant".
    return json({ error: error.message }, 400);
  }
  return json({ ok: true });
});
```

- [ ] **Step 2 : Vérifier la compilation Deno**

Run : `deno check supabase/functions/recovery-request/index.ts`
Expected : aucune erreur de type (sortie vide / `Check ... ok`).

- [ ] **Step 3 : Écrire la migration REVOKE**

Créer `setup_redis_revoke.sql` :

```sql
-- Blindage du rate limit de récupération : interdire l'appel direct de
-- send_recovery_email depuis le navigateur (rôles anon / authenticated).
-- Seule l'Edge Function recovery-request, qui utilise la clé service_role
-- (laquelle ignore ce REVOKE), pourra encore déclencher l'envoi.
-- À exécuter manuellement dans l'éditeur SQL Supabase.

REVOKE EXECUTE ON FUNCTION public.send_recovery_email(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM anon, authenticated;

-- Note : si une signature à 2 arguments existe encore en base, la révoquer aussi :
-- REVOKE EXECUTE ON FUNCTION public.send_recovery_email(TEXT, TEXT) FROM anon, authenticated;
```

- [ ] **Step 4 : Déclarer la fonction dans config.toml**

Modifier `supabase/config.toml` — ajouter à la fin :

```toml
# Récupération de mot de passe : appelée avant login -> pas de JWT.
# La sécurité repose sur le rate limit Redis + le REVOKE de la RPC.
[functions.recovery-request]
verify_jwt = false
```

- [ ] **Step 5 : Recâbler le frontend (LoginPage)**

Dans `src/pages/LoginPage.jsx`, remplacer le bloc `try { ... } catch` qui appelle
`supabase.rpc('send_recovery_email', ...)` (l'appel 7 args + fallback 2 args, ~lignes 213-249)
par un appel à l'Edge Function :

```jsx
        let emailSent = false;
        let rpcErrorMessage = '';

        try {
            const { data, error: fnError } = await supabase.functions.invoke('recovery-request', {
                body: {
                    email,
                    recovery_code: code,
                    client_ip: clientIp,
                    client_location: clientLocation,
                    client_device: deviceDetails,
                },
            });
            if (!fnError && data?.ok) {
                emailSent = true;
            } else {
                // functions.invoke encapsule l'erreur HTTP ; on récupère le message serveur si dispo.
                rpcErrorMessage = data?.error || fnError?.message || "Échec de l'envoi du code.";
            }
        } catch (err) {
            console.warn("recovery-request error:", err.message);
            rpcErrorMessage = err.message;
        }
```

Le reste du flux (`if (emailSent) { ... setRecoveryCode(code); ... }` et la gestion
`rpcErrorMessage.includes("existe pas")`) reste inchangé.

- [ ] **Step 6 : Vérifier le build frontend**

Run : `npm run build`
Expected : build réussi, aucune erreur.

- [ ] **Step 7 : Vérification manuelle locale (optionnelle mais recommandée)**

Avec les secrets dans `supabase/functions/.env` :
Run : `supabase functions serve recovery-request --no-verify-jwt --env-file supabase/functions/.env`
Puis dans un autre terminal, 4 appels rapides :
```bash
for i in 1 2 3 4; do curl -s -X POST http://localhost:54321/functions/v1/recovery-request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@exemple.com","recovery_code":"123456"}'; echo; done
```
Expected : les 3 premiers renvoient une réponse (ok ou erreur métier « email inexistant »),
le 4e renvoie `{"error":"Trop de demandes ..."}` avec status 429.

- [ ] **Step 8 : Commit**

```bash
git add supabase/functions/recovery-request/index.ts setup_redis_revoke.sql \
  supabase/config.toml src/pages/LoginPage.jsx
git commit -m "feat(recovery): Edge Function rate-limitee + REVOKE RPC + cablage front"
```

---

## Task 3 : Edge Function `support-message` + frontend

**Files:**
- Create: `supabase/functions/support-message/index.ts`
- Modify: `supabase/config.toml`
- Modify: `src/pages/DashboardPage.jsx:1682-1690` (insert `admin_messages`)

- [ ] **Step 1 : Écrire l'Edge Function**

Créer `supabase/functions/support-message/index.ts` :

```ts
// Edge Function : message support imprimeur -> admin, rate-limité.
// Rate limit : 5 / min + 30 / h par utilisateur. verify_jwt = true.
// Insère dans admin_messages (direction printer_to_admin) via service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getRedis, rateLimit } from "../_shared/redis.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  // Identifier l'utilisateur via le JWT (la gateway l'a déjà validé : verify_jwt=true).
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  let userId: string | null = null;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.sub) userId = payload.sub;
    }
  } catch (err) {
    console.error("Erreur de décodage JWT:", err);
  }
  if (!userId) return json({ error: "Non authentifié" }, 401);

  let subject: string, content: string;
  try {
    const body = await req.json();
    subject = String(body.subject || "").trim();
    content = String(body.content || "").trim();
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }
  if (!content) return json({ error: "Message vide" }, 400);

  // Rate limit : par utilisateur (rafale + horaire).
  const redis = getRedis();
  const perMin = await rateLimit(redis, `rl:support:min:${userId}`, { max: 5, windowSec: 60 });
  if (!perMin.allowed) return json({ error: "Trop de messages. Patientez une minute." }, 429);
  const perHour = await rateLimit(redis, `rl:support:hour:${userId}`, { max: 30, windowSec: 60 * 60 });
  if (!perHour.allowed) return json({ error: "Limite horaire de messages atteinte." }, 429);

  // Retrouver l'imprimeur du user puis insérer (service role).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: printer, error: pErr } = await admin
    .from("printers").select("id").eq("owner_id", userId).single();
  if (pErr || !printer) return json({ error: "Profil imprimeur introuvable" }, 404);

  const { error: insErr } = await admin.from("admin_messages").insert({
    printer_id: printer.id,
    subject,
    content,
    direction: "printer_to_admin",
  });
  if (insErr) return json({ error: "Enregistrement du message impossible" }, 500);

  return json({ ok: true });
});
```

- [ ] **Step 2 : Vérifier la compilation Deno**

Run : `deno check supabase/functions/support-message/index.ts`
Expected : aucune erreur de type.

- [ ] **Step 3 : Déclarer la fonction dans config.toml**

Modifier `supabase/config.toml` — ajouter :

```toml
# Message support : imprimeur connecté -> JWT vérifié.
[functions.support-message]
verify_jwt = true
```

- [ ] **Step 4 : Recâbler le frontend (DashboardPage)**

Dans `src/pages/DashboardPage.jsx`, remplacer le bloc d'insert direct
(`if (printerData?.id && !printerData.isMock) { await supabase.from('admin_messages').insert({...}); fetchMyMessages(); }`,
~lignes 1682-1690) par :

```jsx
                                                // 2. Insérer via l'Edge Function rate-limitée
                                                if (printerData?.id && !printerData.isMock) {
                                                    const { data: msgRes, error: msgErr } = await supabase.functions.invoke('support-message', {
                                                        body: { subject, content: message },
                                                    });
                                                    if (msgErr || !msgRes?.ok) {
                                                        showToast(msgRes?.error || "Envoi du message impossible.", "error");
                                                        return;
                                                    }
                                                    fetchMyMessages();
                                                } else if (printerData?.isMock) {
```

(Le bloc `else if (printerData?.isMock) { ... }` qui suit reste inchangé.)

- [ ] **Step 5 : Vérifier le build frontend**

Run : `npm run build`
Expected : build réussi, aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add supabase/functions/support-message/index.ts supabase/config.toml src/pages/DashboardPage.jsx
git commit -m "feat(support): Edge Function messagerie rate-limitee + cablage front"
```

---

## Task 4 : Edge Function `printers-list` (cache) + frontend

**Files:**
- Create: `supabase/functions/printers-list/index.ts`
- Modify: `supabase/config.toml`
- Modify: `src/pages/PrintersPage.jsx:31-41` (fonction `fetchPrinters`)

- [ ] **Step 1 : Écrire l'Edge Function**

Créer `supabase/functions/printers-list/index.ts` :

```ts
// Edge Function : liste publique des imprimeurs, cachée 120 s dans Redis.
// verify_jwt = false (données publiques). Sur miss/erreur Redis -> lecture Supabase directe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getRedis, withCache } from "../_shared/redis.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const printers = await withCache(getRedis(), "cache:printers:list", 120, async () => {
    const { data, error } = await admin
      .from("printers").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

  return json({ printers });
});
```

- [ ] **Step 2 : Vérifier la compilation Deno**

Run : `deno check supabase/functions/printers-list/index.ts`
Expected : aucune erreur de type.

- [ ] **Step 3 : Déclarer la fonction dans config.toml**

Modifier `supabase/config.toml` — ajouter :

```toml
# Liste publique des imprimeurs (cache Redis) : pas de JWT.
[functions.printers-list]
verify_jwt = false
```

- [ ] **Step 4 : Recâbler le frontend (PrintersPage)**

Dans `src/pages/PrintersPage.jsx`, remplacer le corps de `fetchPrinters` :

```jsx
    const fetchPrinters = async () => {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('printers-list');
        if (!error && data?.printers) {
            setPrinters(data.printers);
        }
        setLoading(false);
    };
```

- [ ] **Step 5 : Vérifier le build frontend**

Run : `npm run build`
Expected : build réussi, aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add supabase/functions/printers-list/index.ts supabase/config.toml src/pages/PrintersPage.jsx
git commit -m "feat(cache): Edge Function liste imprimeurs (TTL 120s) + cablage front"
```

---

## Task 5 : Edge Function `admin-stats` (cache) + CORS + frontend

**Files:**
- Create: `supabase/functions/admin-stats/index.ts`
- Modify: `supabase/functions/_shared/cors.ts`
- Modify: `supabase/config.toml`
- Modify: `src/pages/AdminPage.jsx:292` (appel `admin_get_global_stats`)

- [ ] **Step 1 : Autoriser l'en-tête x-admin-token dans CORS**

Modifier `supabase/functions/_shared/cors.ts` :

```ts
// En-têtes CORS partagés par les Edge Functions appelées depuis le navigateur.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

- [ ] **Step 2 : Écrire l'Edge Function**

Créer `supabase/functions/admin-stats/index.ts` :

```ts
// Edge Function : stats globales admin, cachées 300 s dans Redis.
// verify_jwt = false MAIS protégée par l'en-tête x-admin-token == ADMIN_API_TOKEN
// (vérifié à CHAQUE appel, y compris sur cache hit). L'EF calcule les stats
// elle-même via service role (mêmes agrégats que le fallback d'AdminPage).
// Secrets : UPSTASH_*, ADMIN_API_TOKEN. Plateforme : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getRedis, withCache } from "../_shared/redis.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Garde : jeton admin partagé, vérifié sur CHAQUE requête.
  const expected = Deno.env.get("ADMIN_API_TOKEN");
  const provided = req.headers.get("x-admin-token");
  if (!expected || provided !== expected) {
    return json({ error: "Non autorisé" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const stats = await withCache(getRedis(), "cache:admin:stats", 300, async () => {
    const [printersRes, productsRes] = await Promise.all([
      admin.from("printers").select("id, services, portfolio, views, clicks"),
      admin.from("products").select("id", { count: "exact", head: true }),
    ]);
    const printers = printersRes.data ?? [];
    return {
      totalPrinters: printers.length,
      totalServices: printers.reduce((acc, p) => acc + (p.services?.length || 0), 0),
      totalPortfolio: printers.reduce((acc, p) => acc + (p.portfolio?.length || 0), 0),
      totalProducts: productsRes.count || 0,
      totalViews: printers.reduce((acc, p) => acc + (p.views || 0), 0),
      totalClicks: printers.reduce((acc, p) => acc + (p.clicks || 0), 0),
    };
  });

  return json({ stats });
});
```

- [ ] **Step 3 : Vérifier la compilation Deno**

Run : `deno check supabase/functions/admin-stats/index.ts`
Expected : aucune erreur de type.

- [ ] **Step 4 : Déclarer la fonction dans config.toml**

Modifier `supabase/config.toml` — ajouter :

```toml
# Stats globales admin (cache Redis) : pas de JWT, gardée par x-admin-token.
[functions.admin-stats]
verify_jwt = false
```

- [ ] **Step 5 : Recâbler le frontend (AdminPage)**

Dans `src/pages/AdminPage.jsx`, le bloc `if (activeTab === 'overview') { ... }` (~ligne 292) :
remplacer l'appel `supabase.rpc('admin_get_global_stats', { p_token: token })` par l'Edge Function.
Le jeton envoyé est `import.meta.env.VITE_ADMIN_API_TOKEN` (valeur = `ADMIN_API_TOKEN`, à ajouter
au `.env` frontend). Garder le fallback existant (calcul direct) en cas d'erreur.

```jsx
            if (activeTab === 'overview') {
                const { data, error } = await supabase.functions.invoke('admin-stats', {
                    headers: { 'x-admin-token': import.meta.env.VITE_ADMIN_API_TOKEN || '' },
                });
                if (error || !data?.stats) {
                    console.warn("admin-stats EF failed, falling back to direct table queries:", error?.message);

                    const [printersRes, productsRes] = await Promise.all([
                        supabase.from('printers').select('id, services, portfolio, views, clicks'),
                        supabase.from('products').select('id', { count: 'exact', head: true })
                    ]);

                    const printersList = printersRes.data || [];

                    const calculatedStats = {
                        totalPrinters: printersList.length,
                        totalServices: printersList.reduce((acc, p) => acc + (p.services?.length || 0), 0),
                        totalPortfolio: printersList.reduce((acc, p) => acc + (p.portfolio?.length || 0), 0),
                        totalProducts: productsRes.count || 0,
                        totalViews: printersList.reduce((acc, p) => acc + (p.views || 0), 0),
                        totalClicks: printersList.reduce((acc, p) => acc + (p.clicks || 0), 0)
                    };
                    setStats(calculatedStats);
                } else {
                    setStats(data.stats);
                }
            } else if (activeTab === 'printers' || activeTab === 'services' || activeTab === 'portfolio') {
```

> Note : `VITE_ADMIN_API_TOKEN` est, comme le mot de passe admin actuel, présent côté client —
> ce n'est pas plus solide que le modèle existant, ça empêche seulement le scraping anonyme des stats.

- [ ] **Step 6 : Vérifier le build frontend**

Run : `npm run build`
Expected : build réussi, aucune erreur.

- [ ] **Step 7 : Commit**

```bash
git add supabase/functions/admin-stats/index.ts supabase/functions/_shared/cors.ts \
  supabase/config.toml src/pages/AdminPage.jsx
git commit -m "feat(cache): Edge Function stats admin (TTL 300s, garde x-admin-token) + cablage front"
```

---

## Task 6 : Lint global + vérification finale

**Files:** aucun nouveau (vérification).

- [ ] **Step 1 : Lint frontend**

Run : `npm run lint`
Expected : aucune nouvelle erreur introduite par les modifications.

- [ ] **Step 2 : Build frontend final**

Run : `npm run build`
Expected : build réussi.

- [ ] **Step 3 : Tests Deno de la brique**

Run : `deno test supabase/functions/_shared/redis_test.ts --allow-net --allow-env`
Expected : 5 tests PASS.

- [ ] **Step 4 : Commit (si lint a corrigé quelque chose)**

```bash
git add -A
git commit -m "chore: lint apres integration Redis" || echo "rien a committer"
```

---

## Task 7 : Déploiement & secrets (manuel, par l'utilisateur)

> Ces étapes touchent l'infrastructure de production. Elles sont listées pour
> mémoire mais à exécuter par l'utilisateur (bassirou) avec ses accès.

- [ ] **Step 1 : Poser les secrets des Edge Functions**

```bash
supabase secrets set \
  UPSTASH_REDIS_REST_URL="https://inviting-insect-109952.upstash.io" \
  UPSTASH_REDIS_REST_TOKEN="<NOUVEAU TOKEN REGENERE>" \
  ADMIN_API_TOKEN="<valeur aleatoire generee>"
```

- [ ] **Step 2 : Ajouter `VITE_ADMIN_API_TOKEN` au `.env` frontend** (même valeur que `ADMIN_API_TOKEN`) et rebuild/déployer le front.

- [ ] **Step 3 : Exécuter `setup_redis_revoke.sql`** dans l'éditeur SQL Supabase.

- [ ] **Step 4 : Déployer les fonctions**

```bash
supabase functions deploy recovery-request support-message printers-list admin-stats
```

- [ ] **Step 5 : RÉGÉNÉRER le token Upstash** dans la console Upstash (celui partagé lors de la conception est compromis) et remettre à jour le secret du Step 1.

---

## Notes de sécurité (rappel)

- Le secret Redis ne doit jamais être préfixé `VITE_` ni inclus au bundle.
- Le token Upstash partagé pendant la conception est **compromis** → régénération obligatoire (Task 7 Step 5).
- `VITE_ADMIN_API_TOKEN` n'est pas un vrai secret (côté client) : il ne renforce pas l'admin, il évite seulement l'accès anonyme aux stats.
