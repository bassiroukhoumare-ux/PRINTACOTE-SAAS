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
