import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { RedisService, LockData } from '../redis/redis.service';
import { Subject } from 'rxjs';

export interface SeatLockResult {
  success: boolean;
  flightId: string;
  seatId: string;
  lockedByUserId: string;
  lockedUntil: number; // epoch ms
  remainingSeconds: number;
}

export interface SeatExpirationEvent {
  flightId: string;
  seatId: string;
  seatNumber: string;
  reason: 'EXPIRED' | 'USER_UNLOCKED' | 'BOOKED' | 'DISCONNECTED';
}

@Injectable()
export class SeatLockService implements OnModuleDestroy {
  private readonly logger = new Logger(SeatLockService.name);
  private readonly expirationTimers = new Map<string, NodeJS.Timeout>();

  // Stream reactivo de expiraciones / liberaciones para el WebSocket Gateway
  public readonly seatReleased$ = new Subject<SeatExpirationEvent>();

  constructor(private readonly redisService: RedisService) {}

  onModuleDestroy() {
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    this.expirationTimers.clear();
  }

  /**
   * Intenta adquirir un bloqueo atómico sobre un asiento con TTL en segundos (default 300s / 5min).
   * Lanza ConflictException si ya está bloqueado por otro usuario (anti double-booking).
   */
  async acquireLock(
    flightId: string,
    seatId: string,
    seatNumber: string,
    userId: string,
    ttlSeconds = 300,
  ): Promise<SeatLockResult> {
    const lockKey = this.buildKey(flightId, seatId);
    const now = Date.now();
    const ttlMs = ttlSeconds * 1000;
    const lockedUntil = now + ttlMs;

    const lockData: LockData = {
      userId,
      lockedAt: now,
      lockedUntil,
    };

    // 1. Ejecutar SET NX PX atómico en Redis
    const acquired = await this.redisService.setNxPx(
      lockKey,
      JSON.stringify(lockData),
      ttlMs,
    );

    if (!acquired) {
      // Verificar si el lock actual ya pertenece al mismo usuario
      const existing = await this.getLock(flightId, seatId);
      if (existing && existing.userId === userId) {
        // Mismo usuario: refrescar vigencia
        const remainingMs = await this.redisService.getRemainingTtlMs(lockKey);
        return {
          success: true,
          flightId,
          seatId,
          lockedByUserId: userId,
          lockedUntil: existing.lockedUntil,
          remainingSeconds: Math.ceil(remainingMs / 1000),
        };
      }

      this.logger.warn(
        `[DOUBLE-BOOKING PREVENTED] Conflicto en vuelo ${flightId}, asiento ${seatId} intentado por ${userId}`,
      );
      throw new ConflictException(
        `El asiento ${seatNumber} ya se encuentra bloqueado u ocupado por otro usuario.`,
      );
    }

    // 2. Programar notificación autónoma de expiración
    this.scheduleExpirationNotice(flightId, seatId, seatNumber, ttlMs);

    this.logger.log(
      `✓ Lock concedido: Vuelo ${flightId} | Asiento ${seatNumber} (${seatId}) -> Usuario ${userId} (TTL: ${ttlSeconds}s)`,
    );

    return {
      success: true,
      flightId,
      seatId,
      lockedByUserId: userId,
      lockedUntil,
      remainingSeconds: ttlSeconds,
    };
  }

  /**
   * Libera voluntariamente un bloqueo (ej. usuario hace clic de nuevo en su asiento para deseleccionarlo).
   */
  async releaseLock(
    flightId: string,
    seatId: string,
    seatNumber: string,
    userId?: string,
    reason: 'EXPIRED' | 'USER_UNLOCKED' | 'BOOKED' | 'DISCONNECTED' = 'USER_UNLOCKED',
  ): Promise<boolean> {
    const lockKey = this.buildKey(flightId, seatId);

    // Validación estricta de autorización: Si el desbloqueo es manual por usuario, requerir userId y verificar propiedad
    if (reason === 'USER_UNLOCKED') {
      if (!userId) {
        this.logger.warn(
          `[SECURITY] Intento de desbloqueo USER_UNLOCKED rechazado sin userId: Vuelo ${flightId}, Asiento ${seatNumber}`,
        );
        return false;
      }
      const current = await this.getLock(flightId, seatId);
      if (current && current.userId !== userId) {
        this.logger.warn(
          `[SECURITY] Intento no autorizado de liberar lock: Usuario ${userId} intentó liberar asiento de ${current.userId}`,
        );
        return false;
      }
    } else if (userId) {
      const current = await this.getLock(flightId, seatId);
      if (current && current.userId !== userId) {
        this.logger.warn(
          `[SECURITY] Intento no autorizado de liberar lock: Usuario ${userId} intentó liberar asiento de ${current.userId}`,
        );
        return false;
      }
    }

    this.clearExpirationTimer(lockKey);
    await this.redisService.del(lockKey);

    // Emitir evento reactivo para que el Gateway notifique a todos los clientes
    this.seatReleased$.next({
      flightId,
      seatId,
      seatNumber,
      reason,
    });

    this.logger.log(
      `✓ Lock liberado: Vuelo ${flightId} | Asiento ${seatNumber} (${reason})`,
    );
    return true;
  }

  /**
   * Obtiene la información del bloqueo actual si existe y sigue vigente.
   */
  async getLock(flightId: string, seatId: string): Promise<LockData | null> {
    const lockKey = this.buildKey(flightId, seatId);
    const raw = await this.redisService.get(lockKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as LockData;
    } catch {
      return null;
    }
  }

  /**
   * Verifica si un asiento está disponible (no bloqueado y vigente).
   */
  async isSeatLocked(flightId: string, seatId: string): Promise<boolean> {
    const lock = await this.getLock(flightId, seatId);
    return lock !== null && lock.lockedUntil > Date.now();
  }

  private buildKey(flightId: string, seatId: string): string {
    return `seat:lock:${flightId}:${seatId}`;
  }

  private scheduleExpirationNotice(
    flightId: string,
    seatId: string,
    seatNumber: string,
    ttlMs: number,
  ) {
    const lockKey = this.buildKey(flightId, seatId);
    this.clearExpirationTimer(lockKey);

    const timer = setTimeout(async () => {
      this.expirationTimers.delete(lockKey);
      this.logger.log(
        `[TTL EXPIRED] Asiento ${seatNumber} (${seatId}) en vuelo ${flightId} expiró automáticamente.`,
      );

      this.seatReleased$.next({
        flightId,
        seatId,
        seatNumber,
        reason: 'EXPIRED',
      });
    }, ttlMs);

    this.expirationTimers.set(lockKey, timer);
  }

  private clearExpirationTimer(lockKey: string) {
    if (this.expirationTimers.has(lockKey)) {
      clearTimeout(this.expirationTimers.get(lockKey));
      this.expirationTimers.delete(lockKey);
    }
  }
}
