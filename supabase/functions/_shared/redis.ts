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
