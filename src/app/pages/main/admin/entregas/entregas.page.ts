import { Component, inject, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AsignarEntregaComponent } from 'src/app/shared/components/asignar-entrega/asignar-entrega.component';

@Component({
  selector: 'app-entregas',
  templateUrl: './entregas.page.html',
  styleUrls: ['./entregas.page.scss'],
})
export class EntregasPage implements OnInit {
  // Variables para la funcionalidad de la página
  fecha: any; // Fecha actual en formato amigable
  showModal = false; // Estado para mostrar u ocultar un modal
  isEditing = false; // Estado para saber si se está editando algo
  pedidos: any[] = []; // Lista de pedidos completos
  detalle_pedido: any[] = []; // Detalles de cada pedido
  loading: boolean = false; // Indicador de carga

  // Variables para el filtrado de pedidos
  searchTerm: string = ''; // Término de búsqueda ingresado por el usuario
  filtersApplied = false; // Indica si se han aplicado filtros
  pedidosFiltrados = []; // Lista de pedidos después del filtrado

  // Inyección de servicios
  utilsSvc = inject(UtilsService); // Servicio de utilidades
  firebaseSvc = inject(FirebaseService); // Servicio para interacción con Firebase

  constructor(private modalCtrl: ModalController, private alertController: AlertController) {
    // Configuración inicial de la fecha actual
    this.fecha = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  ngOnInit() {
    // Capitaliza la primera letra de la fecha
    this.fecha = this.fecha.charAt(0).toUpperCase() + this.fecha.slice(1);
    this.getPedidos(); // Carga los pedidos al iniciar
  }

  // Obtiene al usuario actual desde el almacenamiento local
  user(): User {
    return this.utilsSvc.getFromLocalStorage("user");
  }

  // Maneja la acción de refrescar la lista de pedidos
  doRefresh(event) {
    setTimeout(() => {
      this.getPedidos(); // Recarga los pedidos
      event.target.complete(); // Finaliza el refresco
    }, 1000);
  }

  // Cierra el modal
  closeModal() {
    this.showModal = false;
  }

  // Obtiene los pedidos desde Firebase.
  //Aplica filtros específicos para mostrar solo los pedidos en "espera de recolección" y con "pago en efectivo".
  //Filtra los pedidos del día actual.
  //Recupera detalles adicionales, como información del cliente y productos relacionados.
  // Es una de las funciones principales del componente, ya que alimenta la lista de pedidos mostrada al usuario.
  getPedidos() {
    const path = `pedidos`;
    this.loading = true;

    const sub = this.firebaseSvc.getCollectionData(path, []).subscribe({
      next: (res: any[]) => {
        
        if (Array.isArray(res)) {
          console.log('Pedidos obtenidos:', res);
          this.pedidos = res;

          const targetStatus = this.normalizeText('En espera de recolección');

          const pedidosHoy = res.filter((pedido: any) => {
            const estatus = this.normalizeText(pedido?.estatus);
            // Acepta variaciones tipo: "en espera de recoleccion", "en espera de recolección   ", etc.
            const isWaiting = estatus.includes(targetStatus);

            const tipoPago = this.normalizeText(pedido?.tipo_pago);
            const isCash = tipoPago.includes('efectivo');

            // Considera como "hoy" si cualquiera de estas fechas cae hoy
            const isToday =
              this.isTodayDateLike(pedido?.fecha_recoger) ||
              this.isTodayDateLike(pedido?.fecha_entrega) ||
              this.isTodayDateLike(pedido?.fecha);

            return isWaiting && isCash && isToday;
          });

          this.pedidos = pedidosHoy;

          // Enriquecer pedidos filtrados
          const promises = this.pedidos.map(async (pedido: any) => {
            const path2 = `users/${pedido.uid_cliente}`;
            await this.firebaseSvc.getDocument(path2).then((user: User) => {
              pedido.nombre_cliente = `${user?.name ?? ''} ${user?.mother_Last_Name ?? ''} ${user?.father_Last_Name ?? ''}`.trim();

              const path3 = `pedidos/${pedido.id}/detalle_pedido`;
              this.firebaseSvc.getCollectionData(path3, []).subscribe({
                next: (data) => {
                  pedido.detalle_pedido = data;
                  pedido.detalle_pedido.forEach(async (detalle: any) => {
                    const detallePath = `productos/${detalle.uid_producto}`;
                    try {
                      const producto = await this.firebaseSvc.getDocument(detallePath);
                      detalle.producto = producto;
                    } catch {}
                  });
                },
                error: (err) => console.error('Error al obtener datos:', err),
              });
            });

            // Obtener dirección amigable desde Google si aplica
            await this.ensureAddress(pedido);

            return pedido;
          });

          Promise.all(promises)
            .then(() => {
              this.pedidosFiltrados = this.pedidos;
              this.loading = false;
            })
            .catch(() => {
              this.loading = false;
            });
        } else {
          this.pedidos = [];
          this.pedidosFiltrados = [];
        }
        sub.unsubscribe();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  // Comparación sin acentos, minúsculas, colapsando espacios y trim
  private normalizeText(text: any = ''): string {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Intenta parsear strings dd/MM/yyyy o dd-MM-yyyy (con hora opcional)
  private parseFlexibleDateString(s: string): Date | null {
    if (!s) return null;
    const str = String(s).trim();
    // Primero intenta ISO/Date estándar
    const iso = new Date(str);
    if (!isNaN(iso.getTime())) return iso;

    // dd/MM/yyyy[ HH:mm[:ss]] o dd-MM-yyyy[ HH:mm[:ss]]
    const m = str.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (!m) return null;

    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1; // 0-based
    const yyyy = parseInt(m[3], 10);
    const HH = m[4] ? parseInt(m[4], 10) : 0;
    const II = m[5] ? parseInt(m[5], 10) : 0;
    const SS = m[6] ? parseInt(m[6], 10) : 0;

    const d = new Date(yyyy, mm, dd, HH, II, SS, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // Normaliza cualquier valor (Timestamp, Date, string, number) a una fecha a medianoche (local)
  private normalizeDateLike(value: any): Date | null {
    if (!value) return null;

    // Firestore Timestamp
    if (value?.toDate && typeof value.toDate === 'function') {
      const d = value.toDate();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    // Timestamp serializado { seconds }
    if (value?.seconds) {
      const d = new Date(value.seconds * 1000);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    // Strings con formatos variados
    if (typeof value === 'string') {
      const parsed = this.parseFlexibleDateString(value);
      if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      return null;
    }

    // Date o number
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Devuelve true si el valor representa "hoy" (zona horaria local)
  private isTodayDateLike(value: any): boolean {
    const d = this.normalizeDateLike(value);
    if (!d) return false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return d >= start && d < end;
  }

  // Filtra los pedidos según el término de búsqueda
  filterPedidos() {
    const term = this.searchTerm.toLowerCase();

    this.pedidosFiltrados = this.pedidos.filter(pedido =>
      pedido.nombre_cliente.toLowerCase().includes(term) ||
      pedido.total.toFixed(2).includes(term) ||
      pedido.id.toLowerCase().includes(term) ||
      pedido.estatus.toLowerCase().includes(term)
    );
  }

  // Cancela un pedido y actualiza su estado en Firebase
  // Muestra una alerta de confirmación para cancelar un pedido.
  // Actualiza el estado del pedido a "Cancelado" en Firebase.
  // Recarga la lista de pedidos después de la cancelación. 

  async cancelarPedido(pedido) {
    const alert = await this.alertController.create({
      header: 'Cancelar Pedido',
      mode: 'ios',
      message: '¿Realmente deseas cancelar el pedido?',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-cancel',
        },
        {
          text: 'Confirmar',
          cssClass: 'alert-confirm',
          handler: async () => {
            const path = `pedidos/${pedido.id}`;
            const loading = await this.utilsSvc.loading();
            await loading.present();
            pedido.estatus = 'Cancelado';
            this.firebaseSvc.updateDocumet(path, { estatus: pedido.estatus }).finally(() => {
              loading.dismiss();
              this.getPedidos(); // Recarga los pedidos después de cancelar
            });
          },
        },
      ],
      backdropDismiss: false,
    });
    await alert.present();
  }

  // Determina el color del ícono según el estado del pedido
  getColorIcon(estatus: string): string {
    switch (estatus.toLowerCase()) {
      case 'cancelado':
        return 'danger';
      case 'entregado':
        return 'primary';
      default:
        return 'dark';
    }
  }

  // Abre un modal para asignar la entrega de un pedido
  async openAsignarEntrega(pedido: any) {
    const success = await this.utilsSvc.presentModal({
      component: AsignarEntregaComponent,
      componentProps: { pedido },
    });
    if (success) {
      this.utilsSvc.presentToast({
        message: `Pedido entregado`,
        duration: 2500,
        color: 'primary',
        position: 'bottom',
        icon: 'checkmark-circle-outline',
      });
    }
    this.getPedidos(); // Recarga los pedidos después de asignar la entrega
  }

  // Navega a la página del escáner QR
  escanear() {
    this.utilsSvc.routerLink('main/escaner-qr');
  }

  // Icono por estatus (alineado a pedidos)
  getStatusIcon(estatus: string): string {
    switch ((estatus || '').toLowerCase()) {
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
        return 'help-circle-outline';
    }
  }

  // Detección de ubicación como en pedidos
  private hasUbicacion(pedido: any): boolean {
    if (!pedido) return false;
    const gp = pedido?.geopoint_entrega;
    const hasGeoPoint =
      gp &&
      typeof gp.latitude === 'number' &&
      typeof gp.longitude === 'number' &&
      !isNaN(gp.latitude) &&
      !isNaN(gp.longitude);

    const hasCoords =
      (typeof pedido?.lat === 'number' && typeof pedido?.lng === 'number') ||
      (typeof pedido?.coordenadas?.lat === 'number' && typeof pedido?.coordenadas?.lng === 'number');

    return !!(hasGeoPoint || hasCoords);
  }

  // Tipo de entrega efectivo como en pedidos
  getEffectiveDeliveryType(pedido: any): string {
    const t = (pedido?.tipo_entrega || '').toLowerCase();
    if (!t) return this.hasUbicacion(pedido) ? 'domicilio' : 'negocio';
    if (t === 'domicilio') return this.hasUbicacion(pedido) ? 'domicilio' : 'negocio';
    return 'negocio';
  }

  getDeliveryTypeIcon(tipoEntrega: string): string {
    switch ((tipoEntrega || '').toLowerCase()) {
      case 'domicilio':
        return 'home-outline';
      case 'negocio':
        return 'storefront-outline';
      default:
        return 'location-outline';
    }
  }

  getDeliveryTypeColor(tipoEntrega: string): string {
    switch ((tipoEntrega || '').toLowerCase()) {
      case 'domicilio':
        return 'primary';
      case 'negocio':
        return 'success';
      default:
        return 'medium';
    }
  }

  // Lee la API key de Google Maps (configúrala en localStorage o en window)
  private getGoogleMapsApiKey(): string {
    const provided = 'AIzaSyB5Zq3Y9PdVBkxPkG2FMF69Ti4zA0ZKjEE';
    try {
      const key =
        this.utilsSvc.getFromLocalStorage('google_maps_key') ||
        (window as any)?.GOOGLE_MAPS_API_KEY ||
        provided;
      try {
        if (key && !this.utilsSvc.getFromLocalStorage('google_maps_key')) {
          localStorage.setItem('google_maps_key', key);
        }
      } catch {}
      return key;
    } catch {
      return (window as any)?.GOOGLE_MAPS_API_KEY || provided;
    }
  }

  // Extrae lat/lng desde geopoint_entrega o fallbacks
  private getPedidoLatLng(pedido: any): { lat: number; lng: number } | null {
    if (!pedido) return null;
    const gp = pedido?.geopoint_entrega;
    if (gp && typeof gp.latitude === 'number' && typeof gp.longitude === 'number') {
      return { lat: gp.latitude, lng: gp.longitude };
    }
    if (typeof pedido?.lat === 'number' && typeof pedido?.lng === 'number') {
      return { lat: pedido.lat, lng: pedido.lng };
    }
    if (typeof pedido?.coordenadas?.lat === 'number' && typeof pedido?.coordenadas?.lng === 'number') {
      return { lat: pedido.coordenadas.lat, lng: pedido.coordenadas.lng };
    }
    return null;
  }

  // Llama a Google Geocoding y cachea el texto en _direccion_texto
  private async ensureAddress(pedido: any): Promise<void> {
    if (!pedido) return;

    // Si no es domicilio efectivo, no geocodificar
    if (this.getEffectiveDeliveryType(pedido) !== 'domicilio') {
      pedido._direccion_texto = 'Entrega en negocio';
      return;
    }

    // Si ya hay dirección en texto, usarla
    const textual =
      pedido._direccion_texto ||
      pedido.direccion_texto ||
      pedido.direccionCompleta ||
      pedido.direccion?.texto;
    if (textual) {
      pedido._direccion_texto = textual;
      return;
    }

    // Si no hay coords, fallback
    const coords = this.getPedidoLatLng(pedido);
    if (!coords) {
      pedido._direccion_texto = 'Ubicación proporcionada por el cliente';
      return;
    }

    // API Key
    const key = this.getGoogleMapsApiKey();
    if (!key) {
      pedido._direccion_texto = 'Ubicación proporcionada por el cliente';
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${encodeURIComponent(
        key
      )}&language=es`;
      const resp = await fetch(url);
      console.log('Geocoding response:', resp);
      if (!resp.ok) throw new Error('HTTP error');
      const data = await resp.json();
      if (data.status === 'OK' && Array.isArray(data.results) && data.results.length) {
        pedido._direccion_texto = data.results[0].formatted_address;
      } else {
        pedido._direccion_texto = 'Ubicación proporcionada por el cliente';
      }
    } catch (e) {
      pedido._direccion_texto = 'Ubicación proporcionada por el cliente';
    }
  }

  // Render amigable de dirección sin coordenadas (usa cache si existe)
  getDisplayAddress(pedido: any): string {
    if (!pedido) return '';
    if (pedido._direccion_texto) return pedido._direccion_texto;

    const texto =
      pedido.direccion_texto ||
      pedido.direccionCompleta ||
      pedido.direccion?.texto ||
      '';

    if (texto) return texto;

    const dir = pedido.direccion || {};
    const partes = [
      dir.calle && dir.numero ? `${dir.calle} ${dir.numero}` : dir.calle,
      dir.colonia,
      dir.municipio || dir.ciudad,
      dir.estado,
      dir.cp || dir.codigo_postal,
    ].filter(Boolean);

    return partes.length ? partes.join(', ') : 'Ubicación proporcionada por el cliente';
  }

  // Agregar: helper usado en la plantilla para mostrar indicaciones
  getDisplayInstructions(pedido: any): string {
    return (
      pedido?.indicaciones ||
      pedido?.instrucciones ||
      pedido?.direccion?.indicaciones ||
      ''
    );
  }

  // Convierte cualquier tipo de fecha a Date preservando hora
  private toDateTime(value: any): Date | null {
    if (!value) return null;
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate();
    if (value?.seconds) return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fecha programada a mostrar (preferencia: fecha_recoger > fecha_entrega > fecha)
  getScheduledDate(pedido: any): Date | null {
    const raw = pedido?.fecha_recoger ?? pedido?.fecha_entrega ?? pedido?.fecha;
    return this.toDateTime(raw);
  }

  // Etiqueta del horario según el tipo de entrega y el campo usado
  getScheduledLabel(pedido: any): string {
    const tipo = (this.getEffectiveDeliveryType(pedido) || '').toLowerCase();
    if (tipo === 'domicilio') return 'Horario de entrega';
    if (pedido?.fecha_recoger) return 'Horario de recolección';
    if (pedido?.fecha_entrega) return 'Horario de entrega';
    return 'Horario';
  }

  // Obtiene el texto de estatus a mostrar según el tipo de entrega
  getDisplayStatus(pedido: any): string {
    const originalStatus = pedido.estatus;
    const deliveryType = this.getEffectiveDeliveryType(pedido);
    
    // Si es domicilio y el estatus original es "En espera de recolección", cambiar el texto
    if (deliveryType === 'domicilio' && 
        this.normalizeText(originalStatus).includes(this.normalizeText('En espera de recolección'))) {
      return 'En proceso de entrega';
    }
    
    return originalStatus;
  }
}
