import { VAULT, REDIS } from './constants';
import * as redis from './redisConnect';
import { redisTTLSeconds } from './config';

const DEFAULT_REDIS_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const ttlSeconds =
  typeof redisTTLSeconds === 'number' && Number.isFinite(redisTTLSeconds) && redisTTLSeconds > 0
    ? redisTTLSeconds
    : DEFAULT_REDIS_TTL_SECONDS;

/**
 * Fetch RSA private key using key-id (kid)
 *
 * Lookup order:
 * 1. Redis (shared cache, TTL-based)
 * 2. Vault (authoritative source)
 */
export default async function getPrivateKeyFromVault(kid: string,vaultProvider: any): Promise<string> {
  if (!kid) {
    throw new Error('KID_MISSING');
  }

  /**
   * =====================================================
   * 1️. Redis cache
   * =====================================================
   */
  try {
    const redisKey = `${REDIS.REDIS_KEY}:${kid}`;
    const cached = await redis.get(redisKey);

    if (cached?.privateKey) {
      return cached.privateKey;
    }
  } catch (e) {
    // Redis failure should NEVER break request flow
    console.warn(`Redis lookup failed for private key kid=${kid}`);
  }

  /**
   * =====================================================
   * 2️. Vault (source of truth)
   * =====================================================
   */
  try {
    if (!vaultProvider) throw new Error('VAULT_PROVIDER_NOT_INITIALIZED');
    const path = `${VAULT.RSA_KEYS_BASE_PATH}/${kid}`;
    const result = await vaultProvider.read(path);
    const secret = result?.data?.data || result?.data || result;

    const privateKey: string | undefined = secret?.privateKey;

    if (!privateKey) {
      throw new Error(`PRIVATE_KEY_NOT_FOUND:${kid}`);
    }

    /**
     * =====================================================
     * 3️. Cache in Redis (best-effort)
     * =====================================================
     */
    try {
      const redisKey = `${REDIS.REDIS_KEY}:${kid}`;
      await redis.set(
        redisKey,
        { privateKey },
        ttlSeconds
      );
    } catch {
      // Cache failure is non-fatal
    }

    return privateKey;
  } catch (err) {
    /**
     * Common causes:
     * - Key rotated and removed
     * - Invalid kid sent by client
     * - Vault permission issue
     */
    console.error(`Vault private key fetch failed for kid=${kid}`, err);

    // Standardized error for middleware
    throw new Error('INVALID_KEY');
  }
}
