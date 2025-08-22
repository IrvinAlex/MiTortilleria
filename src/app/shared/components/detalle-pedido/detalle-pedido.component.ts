import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import 'hammerjs';
import {
  AfterViewInit,
  NgZone,
  OnDestroy,
} from '@angular/core';
import {
  Barcode,
  BarcodeFormat,
  BarcodeScanner,
  LensFacing,
  StartScanOptions,
} from '@capacitor-mlkit/barcode-scanning';
import { LoadingController, ModalController, Platform, ToastController,  AlertController  } from '@ionic/angular';
import html2canvas from 'html2canvas';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { BarcodeScanningModalComponent } from './barcode-scanning-modal.component';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';
import { Camera } from '@capacitor/camera';
import { where } from 'firebase/firestore';
import { UtilsService } from 'src/app/services/utils.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { User } from 'src/app/models/user.model';
import { Pedido } from 'src/app/models/pedido.model';
import { AsignarEntregaComponent } from 'src/app/shared/components/asignar-entrega/asignar-entrega.component';

declare var L: any;

@Component({
  selector: 'app-detalle-pedido',
  templateUrl: './detalle-pedido.component.html',
  styleUrls: ['./detalle-pedido.component.scss'],
})
export class DetallePedidoComponent implements OnInit, AfterViewInit {
  qrText = ''; // Texto para generar el código QR
  @Input() pedido: any; // Recibe el pedido actual
  @ViewChild('sliderButton', { static: false }) sliderButton!: ElementRef;
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  map: any;
  sliderValue: number = 0;
  showAnimation: boolean = false;
  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);
  rating: number = 3; // Default rating
  isMapReady = false;
  businessLocation: any = null;
  mapLoadError = false;
  showMapPreview = false;
  
  constructor(
    private loadingController: LoadingController, // Controlador para mostrar indicadores de carga
    private platform: Platform, // Detecta la plataforma (Capacitor, web, etc.)
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
  ) {}
  
  utilsSvc = inject(UtilsService);
  ngOnInit() { 
    console.log(this.pedido);
    // Ejemplo: Generar el valor dinámico de uid_pedido
    const valorDinamico = this.pedido.id; // Este valor puede venir de cualquier parte (formulario, función, etc.)

    // Construcción del objeto dinámico
    const objeto = {
      uid_pedido: valorDinamico
    };

    this.qrText = JSON.stringify(objeto); // Convierte el objeto a una cadena JSON

    // Inicializar detalle_pedido si no está definido
    if (!this.pedido.detalle_pedido) {
      this.pedido.detalle_pedido = [];
    }

    // Obtener detalles de los productos comprados
    const detallePromises = this.pedido.detalle_pedido.map(async (detalle: any) => {
      const detallePath = `productos/${detalle.uid_producto}`;
      try {
        let producto = await this.firebaseSvc.getDocument(detallePath);
        detalle.producto = producto;
      } catch (err) {
        console.error('Error al obtener detalles del producto:', err);
      }
    });

    // Esperar a que todas las promesas se resuelvan antes de continuar
    Promise.all(detallePromises).then(() => {
      console.log('Todos los detalles de productos han sido obtenidos:', this.pedido.detalle_pedido);
    }).catch(err => {
      console.error('Error al obtener detalles de productos:', err);
    });

    if (this.pedido.rating) {
      this.rating = this.pedido.rating;
    }

    // Load business location if delivery type is domicilio
    if (this.pedido.tipo_entrega?.toLowerCase() === 'domicilio') {
      this.loadBusinessLocation();
    }
  }
  
  ngAfterViewInit() {
    // Don't auto-load map, wait for user to request it
  }

  async loadBusinessLocation() {
    try {
      this.firebaseSvc.getCollectionData('direccionNegocio').subscribe(businessLocations => {
        if (businessLocations && businessLocations.length > 0) {
          this.businessLocation = businessLocations[0];
        }
      });
    } catch (error) {
      console.error('Error loading business location:', error);
    }
  }

  async loadMapPreview() {
    if (this.showMapPreview || !this.pedido.geopoint_entrega) return;
    
    this.showMapPreview = true;
    
    // Wait for DOM to update
    setTimeout(() => {
      this.loadLeafletMap();
    }, 100);
  }

  loadLeafletMap() {
    if (!this.mapContainer?.nativeElement || !this.pedido.geopoint_entrega) {
      this.mapLoadError = true;
      return;
    }

    try {
      // Load Leaflet CSS and JS if not already loaded
      this.loadLeafletAssets().then(() => {
        this.initializeLeafletMap();
      }).catch(error => {
        console.error('Error loading Leaflet:', error);
        this.mapLoadError = true;
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      this.mapLoadError = true;
    }
  }

  loadLeafletAssets(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof L !== 'undefined') {
        resolve();
        return;
      }

      // Load CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Leaflet'));
      document.head.appendChild(script);
    });
  }

  initializeLeafletMap() {
    try {
      const deliveryLocation = [
        this.pedido.geopoint_entrega.latitude,
        this.pedido.geopoint_entrega.longitude
      ];

      // Initialize map
      this.map = L.map(this.mapContainer.nativeElement, {
        center: deliveryLocation,
        zoom: 15,
        zoomControl: true,
        attributionControl: false
      });

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Add delivery location marker
      const deliveryIcon = L.divIcon({
        html: '<ion-icon name="home" style="color: #3880ff; font-size: 24px;"></ion-icon>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        className: 'custom-div-icon'
      });

      L.marker(deliveryLocation, { icon: deliveryIcon })
        .addTo(this.map)
        .bindPopup('Dirección de entrega');

      // Add business location if available
      if (this.businessLocation?.geopoint) {
        const businessLocation = [
          this.businessLocation.geopoint.latitude,
          this.businessLocation.geopoint.longitude
        ];

        const businessIcon = L.divIcon({
          html: '<ion-icon name="storefront" style="color: #10dc60; font-size: 24px;"></ion-icon>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          className: 'custom-div-icon'
        });

        L.marker(businessLocation, { icon: businessIcon })
          .addTo(this.map)
          .bindPopup('Tortillería Plata Jaimes');

        // Fit map to show both locations
        const group = L.featureGroup([
          L.marker(deliveryLocation),
          L.marker(businessLocation)
        ]);
        this.map.fitBounds(group.getBounds().pad(0.1));
      }

      // Force map to resize properly
      setTimeout(() => {
        this.map.invalidateSize();
        this.isMapReady = true;
      }, 200);

    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
      this.mapLoadError = true;
    }
  }

  openLocationInMaps() {
    if (!this.pedido.geopoint_entrega) return;

    const lat = this.pedido.geopoint_entrega.latitude;
    const lng = this.pedido.geopoint_entrega.longitude;
    
    // Create maps URL that works on both mobile and desktop
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    
    if (this.platform.is('capacitor')) {
      // On mobile, try to open native maps app
      window.open(mapsUrl, '_system');
    } else {
      // On web, open in new tab
      window.open(mapsUrl, '_blank');
    }
  }

  async onSliderChange() {
    if (this.sliderValue === 100) {
      const loading = await this.utilsSvc.loading();
      await loading.present();

      this.showAnimation = true;

      let path = `pedidos/${this.pedido.id}`;
      

      this.firebaseSvc.updateDocumet(path, {estatus: 'En preparación'}).then(async res => {
  
        setTimeout(() => {
          this.showAnimation = false;
          this.sliderValue = 0;
          this.pedido.estatus = 'En preparación';
          this.utilsSvc.dismissModal({ success: true });
        }, 3000);
  
  
      }).catch(error => {
  
  
        this.utilSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: 'primary',
          position: 'middle',
          icon: 'alert-circle-outline'
        })
  
      }).finally(() => {
        loading.dismiss();
      })
    }
  }

  getColorIcon(estatus: string): string {
    switch (estatus.toLowerCase()) {
      case 'cancelado':
        return 'danger';
      case 'entregado':
        return 'primary';
      default:
        return 'dark'; // Ícono por defecto
    }
  }

  captureScreen() {
    const element = document.getElementById('qrImage') as HTMLElement;

    html2canvas(element).then((canvas: HTMLCanvasElement) => {
      if (this.platform.is('capacitor')) this.shareImage(canvas);
      else this.dowloadImage(canvas);
    });
  }

  // Comparte una imagen generada
  async shareImage(canvas: HTMLCanvasElement) {
    const loading = await this.loadingController.create({ spinner: 'crescent' });
    await loading.present();

    const base64 = canvas.toDataURL();
    const path = 'qr.png';

    await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache }).then(async (res) => {
      let uri = res.uri;
      await Share.share({ url: uri });
      await Filesystem.deleteFile({ path, directory: Directory.Cache });
    }).finally(() => {
      loading.dismiss();
    });
  }

  // Descarga una imagen generada
  dowloadImage(canvas: HTMLCanvasElement) {
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'qr.png';
    link.click();
  }

  getStatusIcon(estatus: string): string {
    switch (estatus.toLowerCase()) {
      case 'pedido confirmado':
        return 'bag-check-outline';
      case 'en preparación':
        return 'refresh-circle-outline';
      case 'en espera de recolección':
          return 'time-outline';
      case 'entregado':
        return 'checkmark-done-outline';
      case 'cancelado':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline'; // Ícono por defecto
    }
  }

  async reorderProducts() {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Pedido',
      message: '¿Deseas agregar estos productos al carrito de compras?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Confirmar',
          handler: async () => {
            const cart = this.utilsSvc.getFromLocalStorage('carrito') || [];
            const user = this.utilsSvc.getFromLocalStorage('user');
            const existingCart = cart[0] || { uid_cliente: user.uid, detalle_carrito: [], total: 0 };

            this.pedido.detalle_pedido.forEach((detalle: any) => {
              const existingProductIndex = existingCart.detalle_carrito.findIndex((item: any) => item.uid_producto === detalle.uid_producto && item.uid_opcion === detalle.uid_opcion);
              if (existingProductIndex > -1) {
                existingCart.detalle_carrito[existingProductIndex].cantidad += detalle.cantidad;
                existingCart.detalle_carrito[existingProductIndex].subtotal += detalle.subtotal;
              } else {
                existingCart.detalle_carrito.push({
                  uid_producto: detalle.uid_producto,
                  uid_opcion: detalle.uid_opcion,
                  nombre: detalle.producto.nombre,
                  cantidad: detalle.cantidad,
                  subtotal: detalle.subtotal,
                });
              }
            });

            existingCart.total += this.pedido.detalle_pedido.reduce((acc: number, item: any) => acc + item.subtotal, 0);
            this.utilsSvc.setElementInLocalstorage('carrito', [existingCart]);

            const userId = user.uid;
            const carritoId = existingCart.id || this.firebaseSvc.firestore.createId();
            existingCart.id = carritoId;

            try {
              await this.firebaseSvc.setDocument(`users/${userId}/carrito/${carritoId}`, { total: existingCart.total });
              for (const detalle of existingCart.detalle_carrito) {
                const detalleCarritoId = detalle.id || this.firebaseSvc.firestore.createId();
                detalle.id = detalleCarritoId;
                await this.firebaseSvc.setDocument(`users/${userId}/carrito/${carritoId}/detalle_carrito/${detalleCarritoId}`, detalle);
              }
              console.log('Carrito actualizado en Firebase:', existingCart);
            } catch (error) {
              console.error('Error al actualizar el carrito en Firebase:', error);
            }

            this.utilsSvc.presentToast({
              message: 'Productos agregados al carrito',
              duration: 2500,
              color: 'primary',
              position: 'bottom',
              icon: 'cart-outline',
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async rateService() {
    const alert = await this.alertCtrl.create({
      header: 'Calificar Servicio',
      message: `¿Deseas calificar este pedido con ${this.rating} estrellas?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Confirmar',
          handler: async () => {
            const loading = await this.utilsSvc.loading();
            await loading.present();

            const path = `pedidos/${this.pedido.id}`;
            try {
              await this.firebaseSvc.updateDocumet(path, { rating: this.rating });
              this.utilsSvc.presentToast({
                message: 'Calificación guardada con éxito',
                duration: 2500,
                color: 'primary',
                position: 'bottom',
                icon: 'star-outline',
              });
            } catch (error) {
              this.utilsSvc.presentToast({
                message: 'Error al guardar la calificación',
                duration: 2500,
                color: 'danger',
                position: 'bottom',
                icon: 'alert-circle-outline',
              });
            } finally {
              loading.dismiss();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  getDeliveryTypeIcon(): string {
    const effectiveType = this.getEffectiveDeliveryType();
    switch (effectiveType) {
      case 'domicilio':
        return 'home-outline';
      case 'negocio':
        return 'storefront-outline';
      default:
        return 'location-outline';
    }
  }

  getDeliveryTypeColor(): string {
    const effectiveType = this.getEffectiveDeliveryType();
    switch (effectiveType) {
      case 'domicilio':
        return 'primary';
      case 'negocio':
        return 'success';
      default:
        return 'medium';
    }
  }

  // Enhanced method to determine effective delivery type
  getEffectiveDeliveryType(): string {
    // Check explicit pickup flags first
    if (this.pedido?.es_recoleccion_negocio === true) return 'negocio';
    if (this.pedido?.metodo_entrega === 'negocio') return 'negocio';
    if (this.pedido?.tipo_entrega === 'negocio') return 'negocio';
    
    // Check for pickup time field
    if (this.pedido?.hora_recoleccion) return 'negocio';
    
    // Check if has delivery location
    if (this.hasDeliveryLocation()) {
      return this.pedido?.tipo_entrega?.toLowerCase() === 'domicilio' ? 'domicilio' : 'negocio';
    }
    
    // Default to pickup if no clear delivery location
    return 'negocio';
  }

  // Check if order has delivery location information
  hasDeliveryLocation(): boolean {
    const gp = this.pedido?.geopoint_entrega;
    const hasGeoPoint = gp && 
      typeof gp.latitude === 'number' && 
      typeof gp.longitude === 'number' &&
      !isNaN(gp.latitude) && 
      !isNaN(gp.longitude);

    const hasCoords = (typeof this.pedido?.lat === 'number' && typeof this.pedido?.lng === 'number') ||
      (typeof this.pedido?.coordenadas?.lat === 'number' && typeof this.pedido?.coordenadas?.lng === 'number');

    return !!(hasGeoPoint || hasCoords);
  }

  // Get the appropriate scheduling date for the order
  getScheduledDate(): Date | null {
    // Priority: pickup time > delivery time > order date
    if (this.pedido?.hora_recoleccion) {
      return this.toDateTime(this.pedido.hora_recoleccion);
    }
    if (this.pedido?.fecha_entrega) {
      return this.toDateTime(this.pedido.fecha_entrega);
    }
    if (this.pedido?.fecha) {
      return this.toDateTime(this.pedido.fecha);
    }
    return null;
  }

  // Get the appropriate label for the scheduling
  getScheduledLabel(): string {
    if (this.isBusinessPickup()) {
      if (this.pedido?.hora_recoleccion) return 'Horario de recolección';
      if (this.pedido?.fecha_entrega) return 'Horario programado';
      return 'Fecha del pedido';
    } else {
      return 'Horario de entrega';
    }
  }

  // Convert various date formats to Date object
  private toDateTime(value: any): Date | null {
    if (!value) return null;
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate();
    if (value?.seconds) return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // Get delivery type display name
  getDeliveryTypeDisplayName(): string {
    const effectiveType = this.getEffectiveDeliveryType();
    switch (effectiveType) {
      case 'domicilio':
        return 'Entrega a domicilio';
      case 'negocio':
        return 'Recolección en negocio';
      default:
        return 'Tipo no especificado';
    }
  }

  // Get business information for pickup orders
  getBusinessInfo() {
    return {
      name: 'Tortillería Plata Jaimes',
      address: 'Calle Principal #123, Centro, Ciudad',
      phone: '+52 722 366 4325',
      hours: 'Lunes a Domingo de 9:00 AM a 8:00 PM'
    };
  }

  isHomeDelivery(): boolean {
    return this.getEffectiveDeliveryType() === 'domicilio';
  }

  isBusinessPickup(): boolean {
    return this.getEffectiveDeliveryType() === 'negocio';
  }
}
