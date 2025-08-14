import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TORTILLERIA_THEME_STYLES } from '../interfaces/map.interface';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private readonly API_KEY = 'AIzaSyB5Zq3Y9PdVBkxPkG2FMF69Ti4zA0ZKjEE';

  constructor(private platform: Platform) {}

  // Estilos personalizados del mapa (tema personalizado para Tortillería)
  getMapStyles() {
    return TORTILLERIA_THEME_STYLES;
  }

  // Carga la API de Google Maps para web
  loadGoogleMapsAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google && (window as any).google.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Error al cargar Google Maps API'));
      
      document.head.appendChild(script);
    });
  }

  // Obtiene un icono personalizado para el marcador (tema tortillería)
  getCustomMarkerIcon(color: string = '#22c55e'): google.maps.Icon {
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
            </filter>
          </defs>
          <circle cx="20" cy="20" r="16" fill="${color}" stroke="#fff" stroke-width="3" filter="url(#shadow)"/>
          <circle cx="20" cy="20" r="8" fill="#fff"/>
          <circle cx="20" cy="20" r="4" fill="${color}"/>
        </svg>
      `),
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20),
    };
  }

  // Verifica si la plataforma es web
  isWeb(): boolean {
    return !this.platform.is('capacitor');
  }

  // Verifica si la plataforma es móvil
  isMobile(): boolean {
    return this.platform.is('capacitor');
  }

  // Obtiene coordenadas por defecto (Ciudad de México)
  getDefaultCoordinates(): { lat: number; lng: number } {
    return { lat: 19.4326, lng: -99.1332 };
  }
}
