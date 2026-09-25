import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { FlightService } from '../flight/flight.service';
import { FlightMetrics, FlightStatus, SeatClass, SeatStatus } from '@davivienda/shared';

describe('MetricsService (Live Aggregations & Telemetry)', () => {
  let service: MetricsService;
  let flightService: Partial<Record<keyof FlightService, jest.Mock>>;

  const mockFlight = {
    id: 'DV-204',
    flightNumber: 'DV-204',
    airline: 'Davivienda Air',
    aircraftModel: 'Airbus A320neo',
    originCity: 'Bogotá',
    originCode: 'BOG',
    destinationCity: 'Medellín',
    destinationCode: 'MDE',
    departureTime: new Date().toISOString(),
    arrivalTime: new Date().toISOString(),
    durationMinutes: 55,
    basePrice: 280000,
    currency: 'COP',
    status: FlightStatus.ON_TIME,
    totalSeats: 4,
    availableSeatsCount: 2,
    cabinLayout: {
      rows: 1,
      columns: ['A', 'B', 'C', 'D'],
      aisleAfterColumn: ['B'],
      exitRows: [],
      businessRows: [1],
    },
  };

  const mockSeats = [
    {
      id: '01A',
      flightId: 'DV-204',
      row: 1,
      column: 'A',
      seatNumber: '01A',
      seatClass: SeatClass.BUSINESS,
      price: 300000,
      isExitRow: false,
      status: SeatStatus.BOOKED,
      bookingReference: 'DV-TEST1',
    },
    {
      id: '01B',
      flightId: 'DV-204',
      row: 1,
      column: 'B',
      seatNumber: '01B',
      seatClass: SeatClass.BUSINESS,
      price: 300000,
      isExitRow: false,
      status: SeatStatus.LOCKED,
      lockedByUserId: 'user_123',
    },
    {
      id: '01C',
      flightId: 'DV-204',
      row: 1,
      column: 'C',
      seatNumber: '01C',
      seatClass: SeatClass.BUSINESS,
      price: 200000,
      isExitRow: false,
      status: SeatStatus.AVAILABLE,
    },
    {
      id: '01D',
      flightId: 'DV-204',
      row: 1,
      column: 'D',
      seatNumber: '01D',
      seatClass: SeatClass.BUSINESS,
      price: 200000,
      isExitRow: false,
      status: SeatStatus.AVAILABLE,
    },
  ];

  beforeEach(async () => {
    const flightServiceMock = {
      getFlightById: jest.fn().mockResolvedValue(mockFlight),
      getSeatsForFlight: jest.fn().mockResolvedValue(mockSeats),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: FlightService,
          useValue: flightServiceMock,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    flightService = module.get(FlightService);
  });

  it('debe estar definido e inicializar el Subject reactivo', () => {
    expect(service).toBeDefined();
    expect(service.metricsUpdated$).toBeDefined();
  });

  describe('getMetricsForFlight', () => {
    it('debe calcular métricas exactas: asientos disponibles, bloqueados, ocupados e ingresos estimados', async () => {
      const metrics = await service.getMetricsForFlight('DV-204');

      expect(flightService.getFlightById).toHaveBeenCalledWith('DV-204');
      expect(flightService.getSeatsForFlight).toHaveBeenCalledWith('DV-204');

      expect(metrics.flightId).toBe('DV-204');
      expect(metrics.flightNumber).toBe('DV-204');
      expect(metrics.totalSeats).toBe(4);
      expect(metrics.bookedSeats).toBe(1);
      expect(metrics.lockedSeats).toBe(1);
      expect(metrics.availableSeats).toBe(2);

      // Ocupación: (1 booked + 1 locked) / 4 = 50%
      expect(metrics.occupancyPercentage).toBe(50);

      // Ingresos estimados: 300000 (booked) + Math.round(300000 * 0.5) (locked) = 450000
      expect(metrics.revenueEstimated).toBe(450000);
      expect(metrics.lastUpdated).toBeGreaterThan(0);
    });

    it('debe retornar 0% de ocupación cuando un vuelo no tiene asientos', async () => {
      (flightService.getSeatsForFlight as any).mockResolvedValueOnce([]);

      const metrics = await service.getMetricsForFlight('DV-EMPTY');

      expect(metrics.totalSeats).toBe(0);
      expect(metrics.occupancyPercentage).toBe(0);
      expect(metrics.revenueEstimated).toBe(0);
    });
  });

  describe('notifyMetricsUpdated', () => {
    it('debe recalcular las métricas y emitir por el Subject reactivo metricsUpdated$', async () => {
      const emittedMetrics: FlightMetrics[] = [];
      const sub = service.metricsUpdated$.subscribe((m) => emittedMetrics.push(m));

      const result = await service.notifyMetricsUpdated('DV-204');

      expect(result).toBeDefined();
      expect(result.flightId).toBe('DV-204');
      expect(emittedMetrics.length).toBe(1);
      expect(emittedMetrics[0].flightId).toBe('DV-204');
      expect(emittedMetrics[0].revenueEstimated).toBe(450000);

      sub.unsubscribe();
    });

    it('debe propagar y loguear el error si flightService falla', async () => {
      (flightService.getFlightById as any).mockRejectedValueOnce(
        new Error('Vuelo no encontrado'),
      );

      await expect(service.notifyMetricsUpdated('DV-INVALID')).rejects.toThrow(
        'Vuelo no encontrado',
      );
    });
  });
});
