import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export interface LockData {
  userId: string;
  lockedAt: number;
  lockedUntil: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  // Fallback en memoria de alta fidelidad si Redis no está levantado localmente
  private readonly inMemoryStore = new Map<string, { value: string; expiresAt: number }>();
  private readonly inMemoryTimers = new Map<string, NodeJS.Timeout>();

  async onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;

    try {
      this.client = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null, // No bloquear si Redis no está activo
        lazyConnect: true,
      });

      await this.client.connect();
      this.isConnected = true;
      this.logger.log(`✓ Conectado exitosamente a Redis en ${host}:${port}`);
    } catch (err) {
      this.isConnected = false;
      this.logger.warn(
        `Redis no disponible en ${host}:${port}. Activando In-Memory Atomic Fallback con TTL para desarrollo local.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
    for (const timer of this.inMemoryTimers.values()) {
      clearTimeout(timer);
    }
    this.inMemoryTimers.clear();
  }

  /**
   * Ejecuta la operación atómica SET NX PX (Set if Not eXists with Millisecond Precision TTL).
   * Garantiza prevención de race conditions a nivel de milisegundo.
   */
  async setNxPx(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.set(key, value, 'PX', ttlMs, 'NX');
        return result === 'OK';
      } catch (error) {
        this.logger.error(`Error en Redis setNxPx para ${key}, usando fallback: ${error}`);
      }
    }

    // Atomic Fallback en memoria síncrono en el Event Loop
    const now = Date.now();
    const existing = this.inMemoryStore.get(key);

    if (existing && existing.expiresAt > now) {
      return false; // Ya existe y no ha expirado
    }

    // Limpiar timer previo si existiera
    if (this.inMemoryTimers.has(key)) {
      clearTimeout(this.inMemoryTimers.get(key));
    }

    this.inMemoryStore.set(key, { value, expiresAt: now + ttlMs });

    const timer = setTimeout(() => {
      this.inMemoryStore.delete(key);
      this.inMemoryTimers.delete(key);
    }, ttlMs);

    this.inMemoryTimers.set(key, timer);
    return true;
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (error) {
        this.logger.error(`Error en Redis get para ${key}: ${error}`);
      }
    }

    const item = this.inMemoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      this.inMemoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async del(key: string): Promise<boolean> {
    if (this.inMemoryTimers.has(key)) {
      clearTimeout(this.inMemoryTimers.get(key));
      this.inMemoryTimers.delete(key);
    }
    this.inMemoryStore.delete(key);

    if (this.isConnected && this.client) {
      try {
        const count = await this.client.del(key);
        return count > 0;
      } catch (error) {
        this.logger.error(`Error en Redis del para ${key}: ${error}`);
      }
    }

    return true;
  }

  async getRemainingTtlMs(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        const pttl = await this.client.pttl(key);
        return pttl > 0 ? pttl : 0;
      } catch (error) {
        this.logger.error(`Error en Redis pttl: ${error}`);
      }
    }

    const item = this.inMemoryStore.get(key);
    if (!item) return 0;
    const remaining = item.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }
}
