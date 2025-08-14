import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { GoogleMap } from '@capacitor/google-maps';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { GoogleMapsService } from 'src/app/services/google-maps.service';
import { GeolocationService } from 'src/app/services/geolocation.service';
import { Direccion } from 'src/app/models/direccion.model';
import { GeoPoint } from '@angular/fire/firestore';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-direccion-superadmin',
  templateUrl: './direccion-superadmin.page.html',
  styleUrls: ['./direccion-superadmin.page.scss'],
})
export class DireccionSuperadminPage implements AfterViewInit {

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  user = {} as User;  // Objeto que almacena los datos del usuario
  map!: GoogleMap | google.maps.Map;  // Instancia del mapa de Google (Capacitor o Web)
  webMap: google.maps.Map | null = null;  // Instancia específica del mapa web
  webMarker: google.maps.Marker | null = null;  // Marcador para el mapa web
  markerId: string | null = null;  // Guarda el ID del marcador en el mapa
  selectedLocation: { lat: number; lng: number } | null = null;  // Guarda la ubicación seleccionada (lat, lng)
  isDireccionVacia: boolean = false;  // Bandera para verificar si la dirección está vacía
  direccion: Direccion[] = [];  // Array que almacena las direcciones del usuario
  buttonTitle: string;  // Título del botón dependiendo si hay o no dirección
  isLoading: boolean = true;  // Estado de carga del mapa

  // Servicios inyectados
  firebaseSvc = inject(FirebaseService);  // Servicio para manejar Firebase
  utilsSvc = inject(UtilsService);  // Servicio utilitario para funciones comunes
  googleMapsSvc = inject(GoogleMapsService);  // Servicio para Google Maps
  geolocationSvc = inject(GeolocationService);  // Servicio para geolocalización
  platform = inject(Platform);  // Servicio para detectar la plataforma

  constructor() { }

  // Método que se ejecuta después de que la vista está completamente cargada
  async ngAfterViewInit() {
    this.isLoading = true;
    
    // Verificación de permisos de geolocalización
    const permissions = await this.geolocationSvc.checkPermissions();
    if (permissions.location !== 'granted') {
      const permission = await this.geolocationSvc.requestPermissions();
      if (permission.location !== 'granted') {
        this.isLoading = false;
        this.utilsSvc.presentToast({
          message: 'Permisos de ubicación requeridos para usar el mapa',
          duration: 3000,
          color: 'warning',
          icon: 'warning-outline',
        });
        return;
      }
    }

    // Cargar direcciones desde Firebase para actualizar el localStorage
    await this.loadDireccionesFromFirebase();

    // Verifica si la dirección está vacía para establecer el título del botón
    this.isDireccionVacia = this.checkIfDireccionIsEmpty();
    this.buttonTitle = this.isDireccionVacia ? 'Agregar Ubicación' : 'Actualizar Ubicación';

    try {
      if (this.googleMapsSvc.isMobile()) {
        // Renderizado para aplicaciones móviles (Capacitor)
        await this.initializeCapacitorMap();
      } else {
        // Renderizado para navegadores web
        await this.initializeWebMap();
      }
    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
      this.utilsSvc.presentToast({
        message: 'Error al cargar el mapa. Verifica tu conexión a internet.',
        duration: 3000,
        color: 'danger',
        icon: 'warning-outline',
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Método para cargar direcciones desde Firebase y actualizar localStorage
  async loadDireccionesFromFirebase() {
    try {
      // Para superadmin, usar la colección principal de direcciones del negocio
      const collectionPath = `direccionNegocio`;
      console.log('Cargando direcciones desde Firebase (SuperAdmin):', collectionPath);
      
      // Obtener direcciones de Firebase
      const direccionesObservable = this.firebaseSvc.getCollectionData(collectionPath, []);
      
      // Convertir Observable a Promise para obtener los datos una sola vez
      const direcciones = await new Promise<any[]>((resolve) => {
        const subscription = direccionesObservable.subscribe({
          next: (data) => {
            subscription.unsubscribe();
            resolve(data);
          },
          error: (error) => {
            console.error('Error al cargar direcciones:', error);
            subscription.unsubscribe();
            resolve([]);
          }
        });
      });

      console.log('Direcciones obtenidas de Firebase (SuperAdmin):', direcciones);
      
      // Actualizar el localStorage
      this.direccion = direcciones;
      this.utilsSvc.setElementInLocalstorage("direccion", this.direccion);
      
      console.log('localStorage actualizado con direcciones (SuperAdmin):', this.direccion);
      
    } catch (error) {
      console.error('Error al cargar direcciones desde Firebase:', error);
    }
  }

  // Inicializa el mapa para aplicaciones móviles (Capacitor)
  async initializeCapacitorMap() {
    const apiKey = 'AIzaSyB5Zq3Y9PdVBkxPkG2FMF69Ti4zA0ZKjEE';
    const mapRef = document.getElementById('map');

    let initialCoords: { lat: number; lng: number };

    if (this.isDireccionVacia) {
      const position = await this.geolocationSvc.getCurrentPosition();
      initialCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } else {
      const coords = this.getCoordinatesFromDireccion();
      if (coords) {
        initialCoords = coords;
      } else {
        // Fallback a ubicación actual si no hay datos válidos
        const position = await this.geolocationSvc.getCurrentPosition();
        initialCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      }
    }

    const mymap = await GoogleMap.create({
      id: 'my-map',
      element: mapRef,
      apiKey: apiKey,
      config: {
        center: initialCoords,
        zoom: this.isDireccionVacia ? 15 : 16,
        styles: this.googleMapsSvc.getMapStyles(),  // Aplicar estilos personalizados
      },
    });

    this.map = mymap;

    // Agrega un marcador movible
    this.markerId = await mymap.addMarker({
      coordinate: initialCoords,
      draggable: true,
    });

    // Evento que se activa cuando el marcador es movido
    mymap.setOnMarkerDragEndListener((event) => {
      this.selectedLocation = {
        lat: event.latitude,
        lng: event.longitude,
      };
      console.log('Ubicación actualizada (móvil):', this.selectedLocation);
    });
  }

  // Inicializa el mapa para navegadores web
  async initializeWebMap() {
    try {
      await this.googleMapsSvc.loadGoogleMapsAPI();
      await this.createWebMap();
    } catch (error) {
      console.error('Error al cargar Google Maps:', error);
      this.utilsSvc.presentToast({
        message: 'Error al cargar el mapa. Verifica tu conexión a internet.',
        duration: 3000,
        color: 'danger',
        icon: 'warning-outline',
      });
    }
  }

  // Crea el mapa web usando Google Maps JavaScript API
  async createWebMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    let initialCoords: { lat: number; lng: number };
    
    if (this.isDireccionVacia) {
      try {
        const position = await this.geolocationSvc.getCurrentPosition();
        initialCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (error) {
        // Coordenadas por defecto si no se puede obtener la ubicación
        initialCoords = this.googleMapsSvc.getDefaultCoordinates();
      }
    } else {
      const coords = this.getCoordinatesFromDireccion();
      if (coords) {
        initialCoords = coords;
      } else {
        // Fallback a coordenadas por defecto si no hay coordenadas válidas
        initialCoords = this.googleMapsSvc.getDefaultCoordinates();
      }
    }

    this.webMap = new google.maps.Map(mapElement, {
      center: initialCoords,
      zoom: this.isDireccionVacia ? 15 : 16,
      styles: this.googleMapsSvc.getMapStyles(),  // Aplicar estilos personalizados
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
    });

    this.map = this.webMap;

    // Crear marcador arrastrable
    this.webMarker = new google.maps.Marker({
      position: initialCoords,
      map: this.webMap,
      draggable: true,
      animation: google.maps.Animation.DROP,
      icon: this.googleMapsSvc.getCustomMarkerIcon('#22c55e'), // Verde
    });

    // Evento cuando se arrastra el marcador
    this.webMarker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        this.selectedLocation = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        console.log('Ubicación actualizada (web):', this.selectedLocation);
      }
    });

    // Evento de clic en el mapa para mover el marcador
    this.webMap.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng && this.webMarker) {
        this.webMarker.setPosition(event.latLng);
        // Agregar animación de rebote cuando se mueve el marcador
        this.webMarker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => {
          if (this.webMarker) {
            this.webMarker.setAnimation(null);
          }
        }, 1400);
        
        this.selectedLocation = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        console.log('Ubicación actualizada por clic (web):', this.selectedLocation);
      }
    });
  }

  // Función que obtiene las coordenadas desde la dirección, manejando diferentes formatos
  getCoordinatesFromDireccion(): { lat: number; lng: number } | null {
    const direccionData = this.dir();
    if (!direccionData || direccionData.length === 0) return null;
    
    const geopoint = direccionData[0].geopoint;
    // Maneja tanto el formato Firebase (_lat, _long) como el formato estándar (latitude, longitude)
    return {
      lat: (geopoint as any)._lat || geopoint.latitude,
      lng: (geopoint as any)._long || geopoint.longitude,
    };
  }

  // Función que obtiene la dirección desde el almacenamiento local
  dir(): Direccion[] {
    return this.utilsSvc.getFromLocalStorage("direccion") || [];  // Devuelve un array vacío si no existe
  }

  // Función que verifica si la dirección está vacía
  checkIfDireccionIsEmpty(): boolean {
    const direccion = this.dir();
    return !direccion || direccion.length === 0;  // Devuelve true si está vacía o es un array vacío
  }

  // Función que obtiene la información del usuario desde el almacenamiento local
  userInfo(): User {
    return this.utilsSvc.getFromLocalStorage("user");
  }

  // Función para guardar la ubicación seleccionada
  async saveLocation() {
    console.log('=== INICIANDO PROCESO DE GUARDADO (SUPERADMIN) ===');
    console.log('isDireccionVacia:', this.isDireccionVacia);
    console.log('direccion en localStorage:', this.dir());
    
    // Si no se ha seleccionado una ubicación, obtiene la ubicación actual o la del marcador
    if (!this.selectedLocation) {
      console.log('No hay selectedLocation, obteniendo ubicación...');
      
      if (this.googleMapsSvc.isMobile()) {
        // Para móvil, intentar obtener ubicación actual
        try {
          const position = await this.geolocationSvc.getCurrentPosition();
          this.selectedLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('Ubicación obtenida (móvil):', this.selectedLocation);
        } catch (error) {
          console.error('Error al obtener ubicación móvil:', error);
          this.utilsSvc.presentToast({
            message: 'Error al obtener la ubicación actual',
            duration: 2000,
            color: 'danger',
            icon: 'warning-outline',
          });
          return;
        }
      } else {
        // Para web, usar la posición del marcador
        if (this.webMarker) {
          const position = this.webMarker.getPosition();
          if (position) {
            this.selectedLocation = {
              lat: position.lat(),
              lng: position.lng(),
            };
            console.log('Ubicación obtenida del marcador web:', this.selectedLocation);
          }
        }
      }
    }

    if (!this.selectedLocation) {
      console.log('ERROR: No se pudo obtener ninguna ubicación');
      this.utilsSvc.presentToast({
        message: 'Por favor, selecciona una ubicación en el mapa',
        duration: 2000,
        color: 'warning',
        icon: 'location-outline',
      });
      return;
    }

    console.log('Ubicación final para guardar:', this.selectedLocation);

    const geopoint = new GeoPoint(
      this.selectedLocation.lat,
      this.selectedLocation.lng
    );

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Si ya existe una dirección, actualiza la dirección
      if (!this.isDireccionVacia && this.dir().length > 0) {
        console.log('=== ACTUALIZANDO DIRECCIÓN EXISTENTE (SUPERADMIN) ===');
        const direccionf = {
          geopoint: geopoint
        };
        
        let path = `direccionNegocio/${this.dir()[0].id}`;
        console.log('Path de actualización:', path);
        await this.firebaseSvc.updateUserDireccion(path, direccionf);

        // Recargar direcciones después de actualizar
        await this.loadDireccionesFromFirebase();

        this.utilsSvc.presentToast({
          message: `La ubicación se ha actualizado correctamente`,
          duration: 1500,
          color: 'success',
          icon: 'checkmark-circle-outline',
        });

      } else {
        console.log('=== AGREGANDO NUEVA DIRECCIÓN (SUPERADMIN) ===');
        const direccionf = {
          geopoint: geopoint
        };

        let path = `direccionNegocio`;
        console.log('Path de nueva dirección:', path);
        await this.firebaseSvc.adddireccion(path, direccionf);
        
        // Recargar direcciones después de agregar
        await this.loadDireccionesFromFirebase();

        this.utilsSvc.presentToast({
          message: `La ubicación se ha registrado correctamente`,
          duration: 1500,
          color: 'success',
          icon: 'checkmark-circle-outline',
        });
      }

      // Actualizar el estado después de guardar
      this.isDireccionVacia = this.checkIfDireccionIsEmpty();
      this.buttonTitle = this.isDireccionVacia ? 'Agregar Ubicación' : 'Actualizar Ubicación';

    } catch (error) {
      console.error('❌ Error al guardar la ubicación:', error);
      this.utilsSvc.presentToast({
        message: `Error al guardar la ubicación: ${error.message || error}`,
        duration: 3000,
        color: 'danger',
        icon: 'alert-circle-outline',
      });
    } finally {
      loading.dismiss();
      console.log('=== PROCESO DE GUARDADO FINALIZADO (SUPERADMIN) ===');
    }
  }

  // Método para centrar el mapa en la ubicación actual
  async centerOnCurrentLocation() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const position = await this.geolocationSvc.getCurrentPosition();
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      if (this.googleMapsSvc.isMobile() && this.map instanceof GoogleMap) {
        // Para móvil (Capacitor)
        await this.map.setCamera({
          coordinate: coords,
          zoom: 16,
          animate: true,
        });
        
        if (this.markerId) {
          await this.map.removeMarker(this.markerId);
        }
        this.markerId = await this.map.addMarker({
          coordinate: coords,
          draggable: true,
        });
      } else if (this.webMap && this.webMarker) {
        // Para web
        this.webMap.setCenter(coords);
        this.webMap.setZoom(16);
        this.webMarker.setPosition(coords);
        // Actualizar el icono para asegurar que sea verde
        this.webMarker.setIcon(this.googleMapsSvc.getCustomMarkerIcon('#22c55e'));
      }

      this.selectedLocation = coords;
      
      this.utilsSvc.presentToast({
        message: 'Mapa centrado en tu ubicación actual',
        duration: 1500,
        color: 'primary',
        icon: 'navigate-circle-outline',
      });
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      this.utilsSvc.presentToast({
        message: 'No se pudo obtener tu ubicación actual',
        duration: 2000,
        color: 'warning',
        icon: 'warning-outline',
      });
    } finally {
      loading.dismiss();
    }
  }
}
