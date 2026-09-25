import { ConflictException } from '@nestjs/common';
import { SeatLockService } from './seat-lock.service';
import { RedisService } from '../redis/redis.service';

describe('SeatLockService (Atomic Concurrency & Anti-Double Booking)', () => {
  let service: SeatLockService;
  let redisService: RedisService;

  beforeEach(async () => {
    redisService = new RedisService();
    // No llamamos a onModuleInit para usar el In-Memory atomic fallback directamente
    service = new SeatLockService(redisService);
  });

  afterEach(async () => {
    service.onModuleDestroy();
    await redisService.onModuleDestroy();
  });

  it('debe adquirir un lock atómico exitosamente para un asiento disponible', async () => {
    const result = await service.acquireLock('DV-204', '12B', '12B', 'user_1', 300);

    expect(result.success).toBe(true);
    expect(result.flightId).toBe('DV-204');
    expect(result.seatId).toBe('12B');
    expect(result.lockedByUserId).toBe('user_1');
    expect(result.remainingSeconds).toBe(300);
  });

  it('debe RECHAZAR con ConflictException si un segundo usuario intenta bloquear el mismo asiento (Anti Double-Booking)', async () => {
    // Usuario 1 adquiere el lock primero
    await service.acquireLock('DV-204', '12B', '12B', 'user_1', 300);

    // Usuario 2 intenta adquirir el lock sobre el mismo asiento exactamente
    await expect(
      service.acquireLock('DV-204', '12B', '12B', 'user_2', 300),
    ).rejects.toThrow(ConflictException);
  });

  it('debe permitir liberar voluntariamente un asiento bloqueado', async () => {
    await service.acquireLock('DV-204', '14A', '14A', 'user_1', 300);
    const released = await service.releaseLock('DV-204', '14A', '14A', 'user_1');

    expect(released).toBe(true);

    // Tras liberarlo, un segundo usuario SÍ puede adquirirlo
    const resultUser2 = await service.acquireLock('DV-204', '14A', '14A', 'user_2', 300);
    expect(resultUser2.success).toBe(true);
    expect(resultUser2.lockedByUserId).toBe('user_2');
  });

  it('debe prevenir que un usuario libere el asiento de otro usuario', async () => {
    await service.acquireLock('DV-204', '15C', '15C', 'user_1', 300);

    const released = await service.releaseLock('DV-204', '15C', '15C', 'user_intruder');
    expect(released).toBe(false);

    // Sigue perteneciendo a user_1
    const lock = await service.getLock('DV-204', '15C');
    expect(lock?.userId).toBe('user_1');
  });

  it('debe rechazar USER_UNLOCKED si no se envía userId para evitar omisión de autorización (Anti-Bypass IDOR)', async () => {
    await service.acquireLock('DV-204', '15C', '15C', 'user_1', 300);

    // Intento de liberar sin userId
    const released = await service.releaseLock('DV-204', '15C', '15C', undefined, 'USER_UNLOCKED');
    expect(released).toBe(false);

    // El asiento sigue protegido con lock de user_1
    const lock = await service.getLock('DV-204', '15C');
    expect(lock?.userId).toBe('user_1');
  });

  it('debe manejar condiciones de carrera concurrentes simuladas con Promise.all (solo 1 ganador)', async () => {
    const seatId = '08D';
    const users = ['user_A', 'user_B', 'user_C', 'user_D', 'user_E'];

    // 5 usuarios disparando la petición al mismo tiempo
    const results = await Promise.allSettled(
      users.map((userId) => service.acquireLock('DV-204', seatId, seatId, userId, 300)),
    );

    const successful = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Estrictamente 1 éxito y 4 rechazos
    expect(successful.length).toBe(1);
    expect(rejected.length).toBe(4);
  });
});
