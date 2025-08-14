import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, inject, Input, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { EmailService } from 'src/app/services/email.service';

declare var L: any;

@Component({
  selector: 'app-asignar-entrega',
  templateUrl: './asignar-entrega.component.html',
  styleUrls: ['./asignar-entrega.component.scss'],
  animations: [
    trigger('slideButton', [
      state('start', style({ transform: 'translateX(0)' })),
      state('end', style({ transform: 'translateX(100%)' })),
      transition('start => end', animate('0.3s ease-out')),
      transition('end => start', animate('0.3s ease-in'))
    ])
  ],
})
export class AsignarEntregaComponent implements OnInit, AfterViewInit {
  @Input() pedido: any; // Recibe el pedido actual
  @ViewChild('sliderButton', { static: false }) sliderButton!: ElementRef;
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  sliderValue: number = 0;
  showAnimation: boolean = false;
  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);
  emailSvc = inject(EmailService);
  
  // Map properties
  map: any;
  isMapReady = false;
  businessLocation: any = null;
  mapLoadError = false;
  showMapPreview = false;

  constructor(private platform: Platform) { }
  
  ngOnInit() { 
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

  private async sendThankYouEmail(pedidoId: string) {
    try {
      // Obtener datos del cliente
      const cliente = await this.firebaseSvc.getDocument(`users/${this.pedido.uid_cliente}`);
      
      const orderData = {
        orderId: pedidoId,
        customerEmail: cliente['email'],
        customerName: cliente['name'] || cliente['email'],
        fecha: this.pedido.fecha.toDate ? this.pedido.fecha.toDate() : new Date(this.pedido.fecha),
        estatus: 'Entregado',
        tipo_pago: this.pedido.tipo_pago,
        items: this.pedido.detalle_pedido,
        subtotal: this.pedido.total,
        discountAmount: 0,
        discountPercent: 0,
        transportFee: 0,
        total: this.pedido.total
      };

      await this.emailSvc.sendThankYouEmail(orderData);
      console.log('Email de agradecimiento enviado exitosamente');
    } catch (error) {
      console.error('Error al enviar email de agradecimiento:', error);
      // No mostrar error al usuario para no interrumpir el flujo
    }
  }

  private async createOrderRating(pedidoId: string, clienteId: string) {
    try {
      const ratingData = {
        uid_pedido: pedidoId,
        uid_cliente: clienteId,
        calificacion: 0,
        comentario: '',
        fecha_creacion: new Date(),
        pendiente: true
      };

      await this.firebaseSvc.addDocument(`users/${clienteId}/calificaciones`, ratingData);
      console.log('Calificación pendiente creada exitosamente');
    } catch (error) {
      console.error('Error al crear calificación pendiente:', error);
    }
  }
  
  async onSliderChange() {
    // Compat: if some view still uses slider
    if (this.sliderValue === 100) {
      await this.markAsDelivered();
    }
  }

  async markAsDelivered() {
    const loading = await this.utilSvc.loading();
    await loading.present();

    this.showAnimation = true;

    const path = `pedidos/${this.pedido.id}`;

    this.firebaseSvc.updateDocumet(path, { estatus: 'Entregado', pago_confirmado: true })
      .then(async () => {
        await this.sendThankYouEmail(this.pedido.id);
        await this.createOrderRating(this.pedido.id, this.pedido.uid_cliente);

        setTimeout(() => {
          this.showAnimation = false;
          this.sliderValue = 0;
          this.pedido.estatus = 'Entregado';
          this.utilSvc.dismissModal({ success: true });
        }, 3000);
      })
      .catch(error => {
        this.utilSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: 'primary',
          position: 'middle',
          icon: 'alert-circle-outline'
        });
      })
      .finally(() => {
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

  getDeliveryTypeIcon(): string {
    switch (this.pedido.tipo_entrega?.toLowerCase()) {
      case 'domicilio':
        return 'home-outline';
      case 'negocio':
        return 'storefront-outline';
      default:
        return 'location-outline';
    }
  }

  getDeliveryTypeColor(): string {
    switch (this.pedido.tipo_entrega?.toLowerCase()) {
      case 'domicilio':
        return 'primary';
      case 'negocio':
        return 'success';
      default:
        return 'medium';
    }
  }

  isHomeDelivery(): boolean {
    return this.pedido.tipo_entrega?.toLowerCase() === 'domicilio';
  }

  getPaymentMethodIcon(): string {
    const metodo = this.pedido?.tipo_pago?.toLowerCase() || '';
    return metodo === 'efectivo' ? 'cash-outline' : 'card-outline';
  }

  getPaymentStatusText(): string {
    const metodo = this.pedido?.tipo_pago?.toLowerCase() || '';
    const entrega = this.pedido?.tipo_entrega?.toLowerCase() || '';
    const confirmed = !!this.pedido?.pago_confirmado;

    if (metodo === 'tarjeta' || confirmed) return 'Pago exitoso';

    if (metodo === 'efectivo') {
      return entrega === 'domicilio'
        ? 'En espera de pago en domicilio'
        : 'En espera de pago en tortillería';
    }

    return 'Estado de pago';
  }

  getPaymentStatusColor(): string {
    const metodo = this.pedido?.tipo_pago?.toLowerCase() || '';
    const confirmed = !!this.pedido?.pago_confirmado;
    return metodo === 'tarjeta' || confirmed ? 'success' : 'warning';
  }

  getPaymentStatusIcon(): string {
    const metodo = this.pedido?.tipo_pago?.toLowerCase() || '';
    const confirmed = !!this.pedido?.pago_confirmado;
    return metodo === 'tarjeta' || confirmed ? 'checkmark-circle-outline' : 'time-outline';
  }
}
