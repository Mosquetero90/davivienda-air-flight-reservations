export interface Country {
  code: string; // ej: "CO"
  name: string; // ej: "Colombia"
  currency: string; // ej: "COP"
  cities?: City[];
}

export interface City {
  id: string; // ej: "bogota"
  name: string; // ej: "Bogotá"
  countryCode: string; // ej: "CO"
  country?: Country;
  airports?: Airport[];
}

export interface Airport {
  iataCode: string; // ej: "BOG"
  name: string; // ej: "Aeropuerto Internacional El Dorado"
  cityId: string; // ej: "bogota"
  city?: City;
}

export interface CreateCityDto {
  id?: string;
  name: string;
  countryCode: string;
}

export interface CreateAirportDto {
  iataCode: string;
  name: string;
  cityId: string;
}
