import { createClient } from 'redis';
import { redisHost, redisPort } from './config';

let client: any;
let isConnected = false;

export const connect = async () => {
  if (isConnected) return;

  try {
    client = createClient({
      url: `redis://${redisHost}:${redisPort}`,
    });

    client.on('error', (err: any) => {
      console.error('Redis Client Error', err);
      isConnected = false;
    });

    await client.connect();
    isConnected = true;
    console.log('Redis connected');
  } catch (e) {
    console.warn('Redis unavailable, continuing without cache');
    isConnected = false;
  }
};

export const get = async (key: string | number) => {
  try {
    if (!isConnected) return null;
    const res = await client.get(key);
    return res ? JSON.parse(res) : null;
  } catch (e) {
    console.warn('Redis get failed, treating as cache miss');
    return null;
  }
};

export const set = async (
  key: string | number,
  value: any,
  ttlSeconds?: number
) => {
  try {
    if (!isConnected) return;

    if (ttlSeconds) {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } else {
      await client.set(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn('Redis set failed, skipping cache write');
  }
};

export const disconnect = async () => {
  try {
    if (client && isConnected) {
      await client.disconnect();
      isConnected = false;
    }
  } catch (e) {
    console.warn('Redis disconnect failed');
  }
};

export const del = async (key: string | number) => {
  try {
    if (!isConnected) return;
    await client.del(key);
  } catch (e) {
    console.warn('Redis delete failed, skipping cache invalidation');
  }
};

