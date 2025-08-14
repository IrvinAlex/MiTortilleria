export interface Direccion {
    id: string; // Identificador único de la dirección
    geopoint: {
      latitude: number;
      longitude: number;
    }; // Campo para las coordenadas geográficas
  }
  