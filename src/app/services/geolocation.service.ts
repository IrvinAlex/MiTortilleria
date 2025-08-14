import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: number;
}

export interface GeolocationPermissions {
  location: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  constructor(private platform: Platform) {}

  // Verifica los permisos de geolocalización
  async checkPermissions(): Promise<GeolocationPermissions> {
    if (this.platform.is('capacitor')) {
      // Para móvil (Capacitor)
      return await Geolocation.checkPermissions();
    } else {
      // Para web (API nativa del navegador)
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ location: 'denied' });
          return;
        }

        // En web, verificamos si los permisos están disponibles
        if ('permissions' in navigator) {
          navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            const status = result.state as 'granted' | 'denied' | 'prompt';
            resolve({ location: status });
          }).catch(() => {
            // Si no se puede verificar, asumimos que necesita permisos
            resolve({ location: 'prompt' });
          });
        } else {
          // Navegadores antiguos, asumimos que necesita permisos
          resolve({ location: 'prompt' });
        }
      });
    }
  }

  // Solicita permisos de geolocalización
  async requestPermissions(): Promise<GeolocationPermissions> {
    if (this.platform.is('capacitor')) {
      // Para móvil (Capacitor)
      return await Geolocation.requestPermissions();
    } else {
      // Para web, intentamos obtener la ubicación para activar el prompt de permisos
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ location: 'denied' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          () => {
            resolve({ location: 'granted' });
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              resolve({ location: 'denied' });
            } else {
              resolve({ location: 'prompt' });
            }
          },
          { timeout: 5000 }
        );
      });
    }
  }

  // Obtiene la posición actual
  async getCurrentPosition(options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }): Promise<GeolocationPosition> {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options
    };

    if (this.platform.is('capacitor')) {
      // Para móvil (Capacitor)
      const position = await Geolocation.getCurrentPosition(defaultOptions);
      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        },
        timestamp: position.timestamp
      };
    } else {
      // Para web (API nativa del navegador)
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalización no disponible en este navegador'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude || undefined,
                altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
                heading: position.coords.heading || undefined,
                speed: position.coords.speed || undefined,
              },
              timestamp: position.timestamp
            });
          },
          (error) => {
            let errorMessage = 'Error al obtener la ubicación';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Permisos de ubicación denegados';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Ubicación no disponible';
                break;
              case error.TIMEOUT:
                errorMessage = 'Tiempo de espera agotado para obtener la ubicación';
                break;
            }
            reject(new Error(errorMessage));
          },
          defaultOptions
        );
      });
    }
  }

  // Verifica si la geolocalización está disponible
  isAvailable(): boolean {
    if (this.platform.is('capacitor')) {
      return true; // Capacitor maneja la disponibilidad
    } else {
      return 'geolocation' in navigator;
    }
  }
}
