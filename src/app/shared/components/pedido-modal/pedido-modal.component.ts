import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, inject, Input, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import 'hammerjs';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { EmailService } from 'src/app/services/email.service';

declare var L: any;

@Component({
  selector: 'app-pedido-modal',
  templateUrl: './pedido-modal.component.html',
  styleUrls: ['./pedido-modal.component.scss'],
  animations: [
    trigger('slideButton', [
      state('start', style({ transform: 'translateX(0)' })),
      state('end', style({ transform: 'translateX(100%)' })),
      transition('start => end', animate('0.3s ease-out')),
      transition('end => start', animate('0.3s ease-in'))
    ])
  ],
})
export class PedidoModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() pedido: any; // Recibe el pedido actual
  @ViewChild('sliderButton', { static: false }) sliderButton!: ElementRef;
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  sliderValue: number = 0;
  showAnimation: boolean = false;
  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);
  emailSvc = inject(EmailService);
  utilsSvc = inject(UtilsService);
  
  // Map properties
  map: any;
  isMapReady = false;
  businessLocation: any = null;
  mapLoadError = false;
  showMapPreview = false;

  // --- Auto-assign state ---
  countdownStart = 5;
  countdown = 5;
  autoAssignInterval: any = null;
  isAutoAssigning = false;
  autoAssignProgress = 0;

  constructor(private platform: Platform) { }
  
  ngOnInit() { 
    // Load business location if delivery type is domicilio
    if (this.pedido.tipo_entrega?.toLowerCase() === 'domicilio') {
      this.loadBusinessLocation();
    }

    // Iniciar asignación automática si el pedido está confirmado
    if (this.pedido?.estatus?.toLowerCase() === 'pedido confirmado') {
      this.restartAutoAssign();
    }
  }

  ngAfterViewInit() {
    // Don't auto-load map, wait for user to request it
  }

  ngOnDestroy(): void {
    this.clearAutoAssignTimer();
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

  isHomeDelivery(): boolean {
    return this.getEffectiveDeliveryType() === 'domicilio';
  }

  isBusinessPickup(): boolean {
    return this.getEffectiveDeliveryType() === 'negocio';
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

  private async sendStatusUpdateEmail(pedidoId: string) {
    try {
      // Obtener datos del cliente
      const cliente = await this.firebaseSvc.getDocument(`users/${this.pedido.uid_cliente}`);
      
      const orderData = {
        orderId: pedidoId,
        customerEmail: cliente['email'],
        customerName: cliente['name'] || cliente['email'],
        fecha: this.pedido.fecha.toDate ? this.pedido.fecha.toDate() : new Date(this.pedido.fecha),
        estatus: 'En preparación',
        tipo_pago: this.pedido.tipo_pago,
        items: this.pedido.detalle_pedido,
        subtotal: this.pedido.total,
        discountAmount: 0, // Sin descuento en actualización de status
        discountPercent: 0,
        transportFee: 0, // Sin mostrar tarifa en actualización de status
        total: this.pedido.total
      };

      await this.emailSvc.sendStatusUpdateEmail(orderData);
      console.log('Email de actualización de estatus enviado exitosamente');
    } catch (error) {
      console.error('Error al enviar email de actualización:', error);
      // No mostrar error al usuario para no interrumpir el flujo
    }
  }
  
  async onSliderChange() {
    if (this.sliderValue === 100) {
      // Cancelar el temporizador si el usuario decide asignar manualmente
      this.clearAutoAssignTimer();
      this.isAutoAssigning = false;
      await this.assignOrderAndNotify('manual');
    }
  }

  // --- Auto-assign helpers ---
  restartAutoAssign() {
    this.clearAutoAssignTimer();
    this.countdown = this.countdownStart;
    this.autoAssignProgress = 0;
    this.isAutoAssigning = true;

    const total = this.countdownStart;
    this.autoAssignInterval = setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 1);
      this.autoAssignProgress = Math.min(100, Math.round(((total - this.countdown) / total) * 100));

      if (this.countdown <= 0) {
        this.clearAutoAssignTimer();
        // Ejecutar asignación automática
        this.assignOrderAndNotify('auto');
      }
    }, 1000);
  }

  cancelAutoAssign() {
    this.clearAutoAssignTimer();
    this.isAutoAssigning = false;
  }

  private clearAutoAssignTimer() {
    if (this.autoAssignInterval) {
      clearInterval(this.autoAssignInterval);
      this.autoAssignInterval = null;
    }
  }

  // --- Notificación en tiempo real (best-effort) ---
  private async sendRealtimeNotification() {
    try {
      // Obtener datos del cliente (para token si existe)
      const cliente = await this.firebaseSvc.getDocument(`users/${this.pedido.uid_cliente}`);
      const token = cliente?.['fcmToken'] || cliente?.['pushToken'] || cliente?.['token'] || null;

      const payload = {
        uid: this.pedido.uid_cliente,
        orderId: this.pedido.id,
        title: 'Pedido en preparación',
        body: 'Tu pedido está siendo preparado. Te avisaremos cuando esté listo.',
        status: 'En preparación',
        token,
        createdAt: new Date(),
        type: 'ORDER_STATUS'
      };

      // Intentar enviar por un método del servicio si existe
      const svc: any = this.firebaseSvc as any;
      if (typeof svc.sendPushNotification === 'function' && token) {
        await svc.sendPushNotification(token, payload.title, payload.body, { orderId: this.pedido.id, status: 'En preparación' });
      } else if (typeof svc.addDocument === 'function') {
        await svc.addDocument('notificaciones', payload);
      } else if (typeof svc.createDocument === 'function') {
        await svc.createDocument('notificaciones', payload);
      } else {
        console.warn('No push method available; notification enqueued skipped');
      }
    } catch (e) {
      console.error('Error enviando notificación en tiempo real:', e);
    }
  }

  // --- Asignación reutilizable (manual/automática) ---
  private async assignOrderAndNotify(source: 'auto' | 'manual') {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    this.showAnimation = true;

    const path = `pedidos/${this.pedido.id}`;

    this.firebaseSvc.updateDocumet(path, { estatus: 'En preparación' }).then(async () => {
      // Email de actualización
      await this.sendStatusUpdateEmail(this.pedido.id);
      // Notificación en tiempo real
      await this.sendRealtimeNotification();

      setTimeout(() => {
        this.showAnimation = false;
        this.sliderValue = 0;
        this.pedido.estatus = 'En preparación';
        this.utilsSvc.dismissModal({ success: true, source });
      }, 1200);
    }).catch(error => {
      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
      // Si falla, permitir reintentar manualmente
      this.isAutoAssigning = false;
    }).finally(() => {
      loading.dismiss();
    });
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

}
