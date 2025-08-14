import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { GoogleMap } from '@capacitor/google-maps';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { GoogleMapsService } from 'src/app/services/google-maps.service';
import { GeolocationService } from 'src/app/services/geolocation.service';
import { Direccion } from 'src/app/models/direccion.model';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-direccion',
  templateUrl: './direccion.page.html',
  styleUrls: ['./direccion.page.scss'],
})
export class DireccionPage implements AfterViewInit {
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
    
    console.log('=== INICIANDO CARGA DE MAPA ===');
    console.log('Plataforma:', this.platform.platforms());
    console.log('Es móvil:', this.googleMapsSvc.isMobile());
    console.log('Es Android:', this.platform.is('android'));
    
    try {
      // Verificación de permisos de geolocalización
      const permissions = await this.geolocationSvc.checkPermissions();
      if (permissions.location !== 'granted') {
        const permission = await this.geolocationSvc.requestPermissions();
        if (permission.location !== 'granted') {
          console.error('Permisos de ubicación denegados');
          this.isLoading = false;
          return;
        }
      }

      // Cargar direcciones desde Firebase para actualizar el localStorage
      await this.loadDireccionesFromFirebase();

      // Verifica si la dirección está vacía para establecer el título del botón
      this.isDireccionVacia = this.checkIfDireccionIsEmpty();
      this.buttonTitle = this.isDireccionVacia ? 'Agregar Ubicación' : 'Actualizar Ubicación';

      // Esperar un poco más en Android para asegurar que todo esté listo
      if (this.platform.is('android')) {
        console.log('Detectado Android, esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (this.googleMapsSvc.isMobile()) {
        // Renderizado para aplicaciones móviles (Capacitor)
        await this.initializeCapacitorMap();
      } else {
        // Renderizado para navegadores web
        await this.initializeWebMap();
      }
      
    } catch (error) {
      console.error('Error en ngAfterViewInit:', error);
      this.utilsSvc.presentToast({
        message: `Error al cargar el mapa: ${error.message || error}`,
        duration: 5000,
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
      const userInfo = this.userInfo();
      if (!userInfo || !userInfo.uid) {
        console.log('No hay usuario autenticado');
        return;
      }

      const collectionPath = `users/${userInfo.uid}/Address`;
      console.log('Cargando direcciones desde Firebase:', collectionPath);
      
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

      console.log('Direcciones obtenidas de Firebase:', direcciones);
      
      // Actualizar el localStorage
      this.direccion = direcciones;
      this.utilsSvc.setElementInLocalstorage("direccion", this.direccion);
      
      console.log('localStorage actualizado con direcciones:', this.direccion);
      
    } catch (error) {
      console.error('Error al cargar direcciones desde Firebase:', error);
    }
  }

  // Inicializa el mapa para aplicaciones móviles (Capacitor)
  async initializeCapacitorMap() {
    try {
      console.log('=== INICIALIZANDO MAPA CAPACITOR ===');
      
      const apiKey = 'AIzaSyB5Zq3Y9PdVBkxPkG2FMF69Ti4zA0ZKjEE';
      const mapRef = document.getElementById('map');
      
      if (!mapRef) {
        throw new Error('Elemento del mapa no encontrado');
      }

      console.log('Elemento del mapa encontrado:', mapRef);
      console.log('Dimensiones del elemento:', {
        width: mapRef.offsetWidth,
        height: mapRef.offsetHeight,
        clientWidth: mapRef.clientWidth,
        clientHeight: mapRef.clientHeight
      });
      
      let initialCoords: { lat: number; lng: number };
      
      if (this.isDireccionVacia) {
        console.log('Obteniendo ubicación actual...');
        try {
          const position = await this.geolocationSvc.getCurrentPosition();
          initialCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('Ubicación actual obtenida:', initialCoords);
        } catch (error) {
          console.warn('Error obteniendo ubicación, usando coordenadas por defecto');
          // Coordenadas por defecto (Ciudad de México)
          initialCoords = { lat: 19.4326, lng: -99.1332 };
        }
      } else {
        const coords = this.getCoordinatesFromDireccion();
        if (coords) {
          initialCoords = coords;
          console.log('Usando coordenadas guardadas:', initialCoords);
        } else {
          // Fallback a ubicación actual si no hay coordenadas válidas
          try {
            const position = await this.geolocationSvc.getCurrentPosition();
            initialCoords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
          } catch (error) {
            initialCoords = { lat: 19.4326, lng: -99.1332 };
          }
        }
      }

      console.log('Coordenadas iniciales:', initialCoords);
      console.log('Creando mapa con configuración:', {
        id: 'my-map',
        element: mapRef,
        apiKey: apiKey ? 'PRESENTE' : 'FALTA',
        config: {
          center: initialCoords,
          zoom: this.isDireccionVacia ? 15 : 16
        }
      });

      // Asegurar que el elemento tenga dimensiones
      if (mapRef.offsetHeight === 0 || mapRef.offsetWidth === 0) {
        mapRef.style.height = '100vh';
        mapRef.style.width = '100vw';
        console.log('Forzando dimensiones del mapa');
      }

      const mymap = await GoogleMap.create({
        id: 'my-map',
        element: mapRef,
        apiKey: apiKey,
        config: {
          center: initialCoords,
          zoom: this.isDireccionVacia ? 15 : 16,
          styles: [], // Simplificar estilos temporalmente
          // Configuraciones básicas
          gestureHandling: 'greedy',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        },
      });

      console.log('✅ Mapa creado exitosamente', mymap);
      this.map = mymap;
      
      // Verificar que el mapa esté visible
      setTimeout(() => {
        console.log('Verificando visibilidad del mapa después de 2 segundos...');
        console.log('Estado del elemento mapa:', {
          display: getComputedStyle(mapRef).display,
          visibility: getComputedStyle(mapRef).visibility,
          opacity: getComputedStyle(mapRef).opacity,
          zIndex: getComputedStyle(mapRef).zIndex
        });
      }, 2000);
      
      // Agrega un marcador movible
      console.log('Agregando marcador...');
      this.markerId = await mymap.addMarker({
        coordinate: initialCoords,
        draggable: true,
      });
      console.log('✅ Marcador agregado:', this.markerId);

      // Evento que se activa cuando el marcador es movido
      mymap.setOnMarkerDragEndListener((event) => {
        this.selectedLocation = {
          lat: event.latitude,
          lng: event.longitude,
        };
        console.log('Ubicación actualizada (móvil):', this.selectedLocation);
      });

      // Evento de clic en el mapa para mover el marcador
      mymap.setOnMapClickListener(async (event) => {
        console.log('Clic en mapa:', event);
        if (this.markerId) {
          await mymap.removeMarker(this.markerId);
        }
        this.markerId = await mymap.addMarker({
          coordinate: {
            lat: event.latitude,
            lng: event.longitude,
          },
          draggable: true,
        });
        this.selectedLocation = {
          lat: event.latitude,
          lng: event.longitude,
        };
        console.log('Marcador movido por clic (móvil):', this.selectedLocation);
      });

      console.log('✅ Mapa completamente inicializado');
      
    } catch (error) {
      console.error('❌ Error inicializando mapa Capacitor:', error);
      console.error('Detalles del error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Mostrar error específico al usuario
      this.utilsSvc.presentToast({
        message: `Error específico: ${error.message}`,
        duration: 5000,
        color: 'danger',
        icon: 'warning-outline',
      });
      
      throw error;
    }
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
    console.log('=== INICIANDO PROCESO DE GUARDADO ===');
    console.log('isDireccionVacia:', this.isDireccionVacia);
    console.log('direccion en localStorage:', this.dir());
    console.log('userInfo:', this.userInfo());
    
    // Verificar que hay un usuario autenticado
    const userInfo = this.userInfo();
    if (!userInfo || !userInfo.uid) {
      console.error('ERROR: No hay usuario autenticado');
      this.utilsSvc.presentToast({
        message: 'Error: Usuario no autenticado',
        duration: 2000,
        color: 'danger',
        icon: 'warning-outline',
      });
      return;
    }
    
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

    // Crear objeto de dirección con el formato correcto para Firebase
    const direccionf = {
      geopoint: {
        _lat: this.selectedLocation.lat,
        _long: this.selectedLocation.lng
      }
    };

    console.log('Objeto direccionf creado:', direccionf);

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Si ya existe una dirección, actualiza la dirección
      if (!this.isDireccionVacia && this.dir().length > 0) {
        console.log('=== ACTUALIZANDO DIRECCIÓN EXISTENTE ===');
        const direccionExistente = this.dir()[0];
        let path = `users/${userInfo.uid}/Address/${direccionExistente.id}`;
        console.log('Path de actualización:', path);
        console.log('Datos a actualizar:', direccionf);
        
        await this.firebaseSvc.updateUserDireccion(path, direccionf);
        console.log('✅ Ubicación actualizada exitosamente en Firebase');
        
        this.utilsSvc.presentToast({
          message: `La ubicación se ha actualizado correctamente`,
          duration: 1500,
          color: 'success',
          icon: 'checkmark-circle-outline',
        });

      } else {
        console.log('=== AGREGANDO NUEVA DIRECCIÓN ===');
        let path = `users/${userInfo.uid}/Address`;
        console.log('Path de nueva dirección:', path);
        console.log('Datos a agregar:', direccionf);
        
        const result = await this.firebaseSvc.adddireccion(path, direccionf);
        console.log('✅ Nueva ubicación agregada exitosamente en Firebase. Resultado:', result);
        
        this.utilsSvc.presentToast({
          message: `La ubicación se ha registrado correctamente`,
          duration: 1500,
          color: 'success',
          icon: 'checkmark-circle-outline',
        });
      }

      // Actualizar el localStorage después de guardar en Firebase
      console.log('Actualizando localStorage después de guardar...');
      await this.loadDireccionesFromFirebase();
      
      // Actualizar el estado de la página
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
      console.log('=== PROCESO DE GUARDADO FINALIZADO ===');
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

