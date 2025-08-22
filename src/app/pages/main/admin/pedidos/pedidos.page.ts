import { Component, inject, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { FiltrosModalComponent } from 'src/app/shared/components/filtros-modal/filtros-modal.component';
import { PedidoModalComponent } from 'src/app/shared/components/pedido-modal/pedido-modal.component';
import { firstValueFrom } from 'rxjs';


@Component({
  selector: 'app-pedidos',
  templateUrl: './pedidos.page.html',
  styleUrls: ['./pedidos.page.scss'],
})
export class PedidosPage implements OnInit {

  fecha: any;
  showModal = false;
  isEditing = false;
  pedidos: any[] = [];
  detalle_pedido: any[]=[];
  loading: boolean = false;
  
   // Lista de pedidos filtrados
  searchTerm: string = ''; // Término de búsqueda
  filtersApplied = false; // Estado de filtros aplicados
  pedidosFiltrados = [];
  utilsSvc = inject(UtilsService);
  firebaseSvc = inject(FirebaseService);


  constructor(private modalCtrl: ModalController, private alertController: AlertController) {
    this.fecha = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',     // Día de la semana
      year: 'numeric',     // Año completo
      month: 'long',       // Mes completo
      day: 'numeric'       // Día del mes
    });
   }

  ngOnInit() {
    this.fecha = this.fecha.charAt(0).toUpperCase() + this.fecha.slice(1);
    this.getPedidos();
    
  }

  // Normaliza cualquier valor (Timestamp, Date, string, number) a una fecha a medianoche (local)
  private normalizeDateLike(value: any): Date | null {
    if (!value) return null;
    // Firestore Timestamp
    if (value?.toDate && typeof value.toDate === 'function') {
      const d = value.toDate();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    // Soporte para objetos con seconds (Timestamp serializado)
    if (value?.seconds) {
      const d = new Date(value.seconds * 1000);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    // Date, string o number
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Devuelve true si el valor representa "hoy" (zona horaria local)
  private isTodayDateLike(value: any): boolean {
    const d = this.normalizeDateLike(value);
    if (!d) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.getTime() === today.getTime();
  }

  //========== Obtener Pedidos y Detalles de Pedido con Productos ===========
  getPedidos() {
    let path = 'pedidos';
    this.loading = true;

    let sub = this.firebaseSvc.getCollectionData(path, []).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          // Guarda todos los pedidos
          this.pedidos = res;

          // Filtra solo los pedidos de hoy usando fecha_entrega o (fallback) fecha
          const pedidosHoy = this.pedidos.filter((pedido: any) =>
            this.isTodayDateLike(pedido?.fecha_entrega ?? pedido?.fecha)
          );

          // Enriquecer SOLO los pedidos de hoy
          const promises = pedidosHoy.map((pedido: any) => {
            let path2 = `users/${pedido.uid_cliente}`;
            return this.firebaseSvc.getDocument(path2).then((user: User) => {
              pedido.nombre_cliente =
                user.name + " " + user.mother_Last_Name + " " + user.father_Last_Name;

              const path3 = `pedidos/${pedido.id}/detalle_pedido`;
              this.firebaseSvc.getCollectionData(path3, []).subscribe({
                next: (data) => {
                  pedido.detalle_pedido = data;
                  pedido.detalle_pedido.forEach(async (detalle: any) => {
                    const detallePath = `productos/${detalle.uid_producto}`;
                    try {
                      let producto = await this.firebaseSvc.getDocument(detallePath);
                      detalle.producto = producto;
                      detalle.producto.imagen = producto['imagen'];
                    } catch (err) {
                      // Manejo de error opcional
                    }
                  });
                },
                error: (err) => console.error('Error al obtener datos:', err),
              });

              return pedido;
            });
          });

          Promise.all(promises)
            .then(() => {
              // Ordenar pedidos por prioridad: activos -> entregados -> cancelados
              this.pedidosFiltrados = this.sortOrdersByPriority(pedidosHoy);
              this.loading = false;
            })
            .catch((error) => {
              console.error('Error al procesar pedidos:', error);
              this.pedidosFiltrados = this.sortOrdersByPriority(pedidosHoy);
              this.loading = false;
            });

        } else {
          this.pedidos = [];
          this.pedidosFiltrados = [];
          this.loading = false;
        }
        sub.unsubscribe();
      },
      error: (err) => {
        console.error('Error al obtener pedidos:', err);
        this.loading = false;
      },
    });
  }

  /**
   * Ordena los pedidos por prioridad: activos primero, luego entregados, luego cancelados
   */
  private sortOrdersByPriority(pedidos: any[]): any[] {
    return pedidos.sort((a, b) => {
      const priorityA = this.getOrderPriority(a.estatus);
      const priorityB = this.getOrderPriority(b.estatus);
      
      // Si tienen la misma prioridad, ordenar por fecha más reciente primero
      if (priorityA === priorityB) {
        const dateA = this.toDateTime(a?.fecha_entrega ?? a?.fecha) || new Date(0);
        const dateB = this.toDateTime(b?.fecha_entrega ?? b?.fecha) || new Date(0);
        return dateB.getTime() - dateA.getTime();
      }
      
      return priorityA - priorityB;
    });
  }

  /**
   * Obtiene la prioridad numérica del estado del pedido
   * Menor número = mayor prioridad
   */
  private getOrderPriority(estatus: string): number {
    const statusLower = this.normalizeText(estatus);
    
    // Estados activos (prioridad más alta: 1-3)
    if (statusLower.includes('pedido confirmado')) return 1;
    if (statusLower.includes('en preparacion') || statusLower.includes('en preparación')) return 2;
    if (statusLower.includes('en espera de recoleccion') || statusLower.includes('en espera de recolección') || 
        statusLower.includes('en proceso de entrega')) return 3;
    
    // Estados completados (prioridad media: 4)
    if (statusLower.includes('entregado')) return 4;
    
    // Estados cancelados (prioridad más baja: 5)
    if (statusLower.includes('cancelado')) return 5;
    
    // Estados desconocidos (prioridad media-baja: 6)
    return 6;
  }

  closeModal() {
    this.showModal = false;
  }

  refreshOrders() {
    // Código para refrescar los pedidos (ej. llamando a una API o recargando datos)
    this.getPedidos();
  }

   // Abre el modal de filtros
   async openFilterModal() {
    let estatus = true;
    const modal = await this.modalCtrl.create({
      component: FiltrosModalComponent,
      componentProps: { estatus }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      this.applyFilter(data);
    }
  }

  // Función para filtrar pedidos basada en filterParams
  applyFilter(filterParams: any) {
    this.filtersApplied = true;

    // Normaliza fechas del filtro a día (med/med)
    const normalize = (v: any) => this.normalizeDateLike(v);
    const fechaInicio = filterParams.fechaInicio ? normalize(filterParams.fechaInicio) : null;
    const fechaFin = filterParams.fechaFin ? normalize(filterParams.fechaFin) : null;

    const filteredPedidos = this.pedidos.filter(pedido => {
      // Filtrar por estatus
      if (filterParams.selectedStatus && filterParams.selectedStatus.length) {
        if (!filterParams.selectedStatus.includes(pedido.estatus)) {
          return false;
        }
      }

      // Tomar la fecha del pedido (preferir fecha_entrega)
      const fechaPedido = this.normalizeDateLike(pedido?.fecha_entrega ?? pedido?.fecha);

      // Filtrar por rango de fechas (inclusive) si ambos están presentes
      if (fechaInicio && fechaFin) {
        if (!fechaPedido || fechaPedido < fechaInicio || fechaPedido > fechaFin) {
          return false;
        }
      }

      // Filtrar por rango de precio
      if (filterParams.precioMin !== null && filterParams.precioMax !== null) {
        if (pedido.total < filterParams.precioMin || pedido.total > filterParams.precioMax) {
          return false;
        }
      }

      return true;
    });

    // Aplicar ordenamiento por prioridad a los pedidos filtrados
    this.pedidosFiltrados = this.sortOrdersByPriority(filteredPedidos);
  }

  clearFilters() {
    // Restablece a "pedidos de hoy" usando la misma lógica robusta y ordenamiento
    const pedidosHoy = this.pedidos.filter(pedido =>
      this.isTodayDateLike(pedido?.fecha_entrega ?? pedido?.fecha)
    );
    this.pedidosFiltrados = this.sortOrdersByPriority(pedidosHoy);
    this.filtersApplied = false;
  }

  // Método para filtrar pedidos según el término de búsqueda (sobre pedidos de hoy)
  filterPedidos() {
    const term = (this.searchTerm || '').toLowerCase();

    const baseHoy = this.pedidos.filter(p =>
      this.isTodayDateLike(p?.fecha_entrega ?? p?.fecha)
    );

    const filteredPedidos = baseHoy.filter(pedido =>
      (pedido.nombre_cliente || '').toLowerCase().includes(term) ||
      (Number.isFinite(pedido.total) ? pedido.total.toFixed(2) : '').includes(term) ||
      (pedido.id || '').toLowerCase().includes(term) ||
      (pedido.estatus || '').toLowerCase().includes(term)
    );

    // Aplicar ordenamiento por prioridad a los pedidos filtrados por búsqueda
    this.pedidosFiltrados = this.sortOrdersByPriority(filteredPedidos);
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
          handler: () => {
          },
        },
        {
          text: 'Confirmar',
          cssClass: 'alert-confirm',
          handler: async () => {
            let path = `pedidos/${pedido.id}`;
            const loading = await this.utilsSvc.loading();
            await loading.present();
            pedido.estatus = 'Cancelado';
            this.firebaseSvc.updateDocumet(path, { estatus: pedido.estatus }).then(async res => {
              this.utilsSvc.presentToast({
                message: `Pedido cancelado`,
                duration: 2500,
                color: 'primary',
                position: 'bottom',
                icon: 'refresh-circle-outline'
              });
            }).catch(error => {
              this.utilsSvc.presentToast({
                message: error.message,
                duration: 2500,
                color: 'primary',
                position: 'middle',
                icon: 'alert-circle-outline'
              })
            }).finally(() => {
              loading.dismiss();
            });
            
          },
        },
      ],
      backdropDismiss: false, // Evita que se cierre la alerta tocando fuera de ella
    });

    await alert.present();
    
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

  async openPedidoDetalle(pedido: any) {
    let success = await this.utilsSvc.presentModal({
      component: PedidoModalComponent,
      componentProps: { pedido },
    });
    if (success) {
      this.utilsSvc.presentToast({
        message: `Pedido en preparación`,
        duration: 2500,
        color: 'primary',
        position: 'bottom',
        icon: 'refresh-circle-outline'
      });
    };
    this.filtersApplied = false;
    this.getPedidos();
  }

  // Mostrar términos y condiciones como modal
  async openTermsModal() {
    const success = await this.utilsSvc.presentModal({
      component: (await import('src/app/shared/components/terms/terms.component')).TermsComponent,
      componentProps: {}
    });
    if (success) {
      this.utilsSvc.presentToast({
        message: `Términos aceptados`,
        duration: 2000,
        color: 'primary',
        position: 'bottom',
        icon: 'checkmark-circle-outline'
      });
    }
  }

  getDeliveryTypeIcon(tipoEntrega: string): string {
    switch (tipoEntrega?.toLowerCase()) {
      case 'domicilio':
        return 'home-outline';
      case 'negocio':
        return 'storefront-outline';
      default:
        return 'location-outline';
    }
  }

  getDeliveryTypeColor(tipoEntrega: string): string {
    switch (tipoEntrega?.toLowerCase()) {
      case 'domicilio':
        return 'primary';
      case 'negocio':
        return 'success';
      default:
        return 'medium';
    }
  }

  doRefresh(event) {
    setTimeout(() => {
      this.getPedidos();
      event.target.complete();
    }, 1000);
  }
  
  // Determina si el pedido tiene información de ubicación (domicilio)
  private hasUbicacion(pedido: any): boolean {
    if (!pedido) return false;

    // Firestore GeoPoint u objeto similar: { latitude, longitude }
    const gp = pedido?.geopoint_entrega;
    const hasGeoPoint =
      gp &&
      typeof gp.latitude === 'number' &&
      typeof gp.longitude === 'number' &&
      !isNaN(gp.latitude) &&
      !isNaN(gp.longitude);

    // Fallbacks por si se guardaron números sueltos o un objeto coordenadas
    const hasCoords =
      (typeof pedido?.lat === 'number' && typeof pedido?.lng === 'number') ||
      (typeof pedido?.coordenadas?.lat === 'number' && typeof pedido?.coordenadas?.lng === 'number');

    return !!(hasGeoPoint || hasCoords);
  }

  // Enhanced delivery type detection for pickup orders
  getEffectiveDeliveryType(pedido: any): string {
    // First check explicit flags for pickup
    if (pedido?.es_recoleccion_negocio === true) return 'negocio';
    if (pedido?.metodo_entrega === 'negocio') return 'negocio';
    if (pedido?.tipo_entrega === 'negocio') return 'negocio';
    
    // Check for pickup time field
    if (pedido?.hora_recoleccion) return 'negocio';
    
    // Fallback to location-based detection
    const t = (pedido?.tipo_entrega || '').toLowerCase();
    if (!t) return this.hasUbicacion(pedido) ? 'domicilio' : 'negocio';
    if (t === 'domicilio') return this.hasUbicacion(pedido) ? 'domicilio' : 'negocio';
    return 'negocio';
  }

  // Get the appropriate scheduling date for the order
  getScheduledDate(pedido: any): Date | null {
    // Priority: pickup time > delivery time > order date
    if (pedido?.hora_recoleccion) {
      return this.toDateTime(pedido.hora_recoleccion);
    }
    if (pedido?.fecha_entrega) {
      return this.toDateTime(pedido.fecha_entrega);
    }
    if (pedido?.fecha) {
      return this.toDateTime(pedido.fecha);
    }
    return null;
  }

  // Get the appropriate label for the scheduling
  getScheduledLabel(pedido: any): string {
    const effectiveType = this.getEffectiveDeliveryType(pedido);
    if (effectiveType === 'negocio') {
      if (pedido?.hora_recoleccion) return 'Horario de recolección';
      if (pedido?.fecha_entrega) return 'Horario programado';
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

  // Comparación sin acentos, minúsculas, colapsando espacios y trim
  private normalizeText(text: any = ''): string {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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