import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Flight,
  Seat,
  FlightMetrics,
  FlightStatus,
  CreateBookingDto,
  BookingResponseDto,
  Booking,
  City,
} from '@davivienda/shared';

@Injectable({
  providedIn: 'root',
})
export class FlightApiService {
  private readonly baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3000/api'
      : '/api';

  constructor(private readonly http: HttpClient) {}

  public getFlights(filters?: {
    origin?: string;
    destination?: string;
    date?: string;
  }): Observable<Flight[]> {
    let params = new HttpParams();
    if (filters?.origin) params = params.set('origin', filters.origin);
    if (filters?.destination) params = params.set('destination', filters.destination);
    if (filters?.date) params = params.set('date', filters.date);

    return this.http.get<Flight[]>(`${this.baseUrl}/flights`, { params });
  }

  public getFlightById(id: string): Observable<Flight> {
    return this.http.get<Flight>(`${this.baseUrl}/flights/${id}`);
  }

  public getSeatsForFlight(flightId: string): Observable<Seat[]> {
    return this.http.get<Seat[]>(`${this.baseUrl}/flights/${flightId}/seats`);
  }

  public getMetricsForFlight(flightId: string): Observable<FlightMetrics> {
    return this.http.get<FlightMetrics>(`${this.baseUrl}/flights/${flightId}/metrics`);
  }

  public createBooking(dto: CreateBookingDto): Observable<BookingResponseDto> {
    return this.http.post<BookingResponseDto>(`${this.baseUrl}/bookings`, dto);
  }

  public getBookingByPnr(pnr: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.baseUrl}/bookings/${pnr}`);
  }

  public updateFlightStatus(flightId: string, status: FlightStatus): Observable<Flight> {
    return this.http.patch<Flight>(`${this.baseUrl}/flights/${flightId}/status`, { status });
  }

  public createFlight(flightData: any): Observable<Flight> {
    return this.http.post<Flight>(`${this.baseUrl}/flights`, flightData);
  }

  public getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.baseUrl}/locations/cities`);
  }
}

