import { Component, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { GoogleMap } from '@capacitor/google-maps';
import { Direccion } from 'src/app/models/direccion.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { isPlatform } from '@ionic/angular';

@Component({
  selector: 'app-confirmar-direccion',
  templateUrl: './confirmar-direccion.component.html',
  styleUrls: ['./confirmar-direccion.component.scss'],
})
export class ConfirmarDireccionComponent implements OnInit, AfterViewInit, OnDestroy {

  userLocation: { lat: number; lng: number } | null = null;
  isLoading: boolean = true;
  map!: GoogleMap | google.maps.Map;
  webMap: google.maps.Map | null = null;
  hasMapError: boolean = false;

  // Business location will be loaded from Firebase
  private businessLocation: { lat: number; lng: number } | null = null;

  private readonly MAX_DELIVERY_DISTANCE_KM = 5;
  distanceFromBusiness: number = 0;
  isWithinDeliveryRange: boolean = false;

  // Servicios inyectados
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  constructor() { }

  async ngOnInit() {
    await this.loadBusinessLocation();
    await this.loadUserAddress();
  }

  async ngAfterViewInit() {
    // Delay para asegurar que el DOM esté listo, especialmente en Android
    setTimeout(async () => {
      if (this.userLocation) {
        await this.initializeMap();
      } else {
        this.isLoading = false;
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  async destroyMap() {
    try {
      if (this.map && typeof (this.map as GoogleMap).destroy === 'function') {
        await (this.map as GoogleMap).destroy();
        this.map = undefined as any;
      }
    } catch (error) {
      console.log('Error al destruir el mapa:', error);
    }
  }

  // Load business location from Firebase
  async loadBusinessLocation() {
    try {
      this.firebaseSvc.getCollectionData('direccionNegocio').subscribe(businessLocations => {
        if (businessLocations && businessLocations.length > 0) {
          const businessLocation = businessLocations[0];
          console.log('Business Location from Firebase:', businessLocation);
          this.businessLocation = {
            lat: parseFloat(businessLocation['geopoint']._lat),
            lng: parseFloat(businessLocation['geopoint']._long)
          };
          console.log('Business Location loaded:', this.businessLocation);
          
          // Recalculate distance if user location is already loaded
          if (this.userLocation) {
            this.calculateDistanceFromBusiness();
          }
        } else {
          console.error('No business location found in Firebase');
        }
      });
    } catch (error) {
      console.error('Error loading business location:', error);
    }
  }

  // Calculate distance from business to user location
  private calculateDistanceFromBusiness() {
    if (this.businessLocation && this.userLocation) {
      this.distanceFromBusiness = this.calculateDistance(
        this.businessLocation,
        this.userLocation
      );
      console.log('Distance user:', this.userLocation, 'km');
      
      this.isWithinDeliveryRange = this.distanceFromBusiness <= this.MAX_DELIVERY_DISTANCE_KM;
      
      console.log('Distance from business:', this.distanceFromBusiness, 'km');
      console.log('Within delivery range:', this.isWithinDeliveryRange);
    }
  }

  // Cargar la dirección del usuario desde localStorage
  async loadUserAddress() {
    try {
      // This gets the REGISTERED address from localStorage "direccion", not current GPS
      const direcciones: Direccion[] = this.utilsSvc.getFromLocalStorage("direccion") || [];
      
      if (direcciones.length > 0) {
        const geopoint = direcciones[0].geopoint;
        this.userLocation = {
          lat: (geopoint as any)._lat || geopoint.latitude,
          lng: (geopoint as any)._long || geopoint.longitude,
        };
        
        console.log('User Location loaded:', this.userLocation);
        
        // Calculate distance if business location is already loaded
        if (this.businessLocation) {
          this.calculateDistanceFromBusiness();
        }
      } else {
        console.log('No se encontró dirección del usuario');
        this.userLocation = null;
      }
    } catch (error) {
      console.error('Error al cargar la dirección del usuario:', error);
      this.userLocation = null;
    }
  }

  // Calculate distance between two coordinates using Haversine formula
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Inicializar el mapa
  async initializeMap() {
    this.isLoading = true;
    this.hasMapError = false;
    
    try {
      if (this.userLocation) {
        // Siempre usar Capacitor Google Maps para mejor compatibilidad
        await this.initializeCapacitorMap();
      }
    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
      this.hasMapError = true;
      this.utilsSvc.presentToast({
        message: 'Error al cargar el mapa',
        duration: 2000,
        color: 'danger',
        icon: 'warning-outline',
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Inicializar mapa para móvil (Capacitor)
  async initializeCapacitorMap() {
    if (!this.userLocation) return;

    try {
      // Destruir mapa anterior si existe
      await this.destroyMap();

      const apiKey = 'AIzaSyB5Zq3Y9PdVBkxPkG2FMF69Ti4zA0ZKjEE';
      const mapRef = document.getElementById('confirmMap');
      
      if (!mapRef) {
        throw new Error('No se encontró el elemento del mapa');
      }

      console.log('Creando mapa con ubicación:', this.userLocation);

      const mymap = await GoogleMap.create({
        id: 'confirm-map-modal',
        element: mapRef,
        apiKey: apiKey,
        config: {
          center: this.userLocation,
          zoom: 16,
          gestureHandling: 'none',
          zoomControl: false,
          disableDefaultUI: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        },
      });

      this.map = mymap;
      
      // Esperar un poco antes de agregar el marcador
      setTimeout(async () => {
        try {
          await mymap.addMarker({
            coordinate: this.userLocation!,
            draggable: false,
          });
          console.log('Marcador agregado exitosamente');
        } catch (markerError) {
          console.error('Error al agregar marcador:', markerError);
        }
      }, 500);

      console.log('Mapa Capacitor inicializado exitosamente');
    } catch (error) {
      console.error('Error al inicializar mapa Capacitor:', error);
      throw error;
    }
  }

  // Inicializar mapa para web
  async initializeWebMap() {
    if (!this.userLocation) return;

    try {
      // Verificar si Google Maps está disponible
      if (typeof google === 'undefined') {
        await this.loadGoogleMapsScript();
      }
      
      const mapElement = document.getElementById('confirmMap');
      if (!mapElement) {
        throw new Error('No se encontró el elemento del mapa');
      }

      this.webMap = new google.maps.Map(mapElement, {
        center: this.userLocation,
        zoom: 16,
        gestureHandling: 'none',
        zoomControl: false,
        disableDefaultUI: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      this.map = this.webMap;

      // Crear marcador fijo
      new google.maps.Marker({
        position: this.userLocation,
        map: this.webMap,
        draggable: false,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#22c55e">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32)
        }
      });

      console.log('Mapa Web inicializado exitosamente');
    } catch (error) {
      console.error('Error al crear el mapa web:', error);
      throw error;
    }
  }

  // Cargar el script de Google Maps
  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB5Zq3Y9PdVBkxPkG2FMF69Ti4zA0ZKjEE&libraries=places';
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Error al cargar Google Maps'));
      
      document.head.appendChild(script);
    });
  }

  // Modificar dirección - navegar a la página de dirección
  async modifyAddress() {
    try {
      this.dismiss();
      // Esperar un poco para que se cierre el modal antes de navegar
      setTimeout(() => {
        this.utilsSvc.routerLink('main/direccion');
      }, 300);
    } catch (error) {
      console.error('Error al navegar a modificar dirección:', error);
    }
  }

  // Confirmar dirección y continuar al pago
  async confirmAddress() {
    if (!this.userLocation) {
      this.utilsSvc.presentToast({
        message: 'No hay dirección para confirmar',
        duration: 2000,
        color: 'warning',
        icon: 'warning-outline',
      });
      return;
    }

    if (!this.businessLocation) {
      this.utilsSvc.presentToast({
        message: 'No se pudo cargar la ubicación del negocio',
        duration: 2000,
        color: 'warning',
        icon: 'warning-outline',
      });
      return;
    }

    // Validate delivery range
    if (!this.isWithinDeliveryRange) {
      this.utilsSvc.presentToast({
        message: `Tu ubicación está a ${this.distanceFromBusiness}km. El rango máximo de entrega es ${this.MAX_DELIVERY_DISTANCE_KM}km`,
        duration: 4000,
        color: 'danger',
        icon: 'warning-outline',
      });
      return;
    }

    try {
      // Guardar la dirección confirmada y distancia en localStorage
      this.utilsSvc.saveInLocalStorage('deliveryAddress', this.userLocation);
      this.utilsSvc.saveInLocalStorage('deliveryDistance', this.distanceFromBusiness);
      
      this.utilsSvc.presentToast({
        message: 'Dirección confirmada exitosamente',
        duration: 1500,
        color: 'success',
        icon: 'checkmark-circle-outline',
      });

      // Cerrar el modal y continuar al pago
      this.dismiss(true);
      
    } catch (error) {
      console.error('Error al confirmar dirección:', error);
      this.utilsSvc.presentToast({
        message: 'Error al confirmar la dirección',
        duration: 2000,
        color: 'danger',
        icon: 'alert-circle-outline',
      });
    }
  }

  // Cerrar el modal
  dismiss(confirmed: boolean = false) {
    this.utilsSvc.dismissModal(confirmed);
  }
}
