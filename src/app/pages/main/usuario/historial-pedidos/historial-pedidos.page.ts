import { Component, inject, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { Timestamp, where } from 'firebase/firestore/lite';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { DetallePedidoComponent } from 'src/app/shared/components/detalle-pedido/detalle-pedido.component';
import { FiltrosModalComponent } from 'src/app/shared/components/filtros-modal/filtros-modal.component';

@Component({
  selector: 'app-historial-pedidos',
  templateUrl: './historial-pedidos.page.html',
  styleUrls: ['./historial-pedidos.page.scss'],
})
export class HistorialPedidosPage implements OnInit {

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

  user(): User {
    return this.utilsSvc.getFromLocalStorage("user");
  }

  doRefresh(event) {
    setTimeout(() => {
      this.getPedidos();
      event.target.complete();
    }, 1000);
  }


  //========== Obtener Pedidos y Detalles de Pedido con Productos ===========
  getPedidos() {
    let path = `pedidos`;
    this.loading = true;
    let fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);
  
    let sub = this.firebaseSvc.getCollectionData(path, []).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.pedidos = res;
  
          const promises = this.pedidos.map((pedido: any) => {
            let path2 = `users/${pedido.uid_cliente}`;
            return this.firebaseSvc.getDocument(path2).then((user: User) => {
              pedido.nombre_cliente = user.name + " " + user.mother_Last_Name + " " + user.father_Last_Name;
              const path3 = `pedidos/${pedido.id}/detalle_pedido`;
  
              this.firebaseSvc.getCollectionData(path3, []).subscribe({
                next: (data) => {
                  pedido.detalle_pedido = data;
                  pedido.detalle_pedido.forEach(async (detalle: any) => {
                    const detallePath = `productos/${detalle.uid_producto}`;
                    try {
                      let producto = await this.firebaseSvc.getDocument(detallePath);
                      detalle.producto = producto;
                      detalle.producto.imagen = producto['imagen']; // Add image to the product details
                    } catch (err) {
                    }
                  });
                },
                error: (err) => console.error('Error al obtener datos:', err),
              });
  
              return pedido;
            });
          });
  
          Promise.all(promises)
            .then((pedidosActualizados) => {
              const pedidosHoy = pedidosActualizados.filter((pedido: any) => {
                return (
                  pedido.uid_cliente === this.user().uid // Verifica que el UID del cliente coincida
                );
              });
              this.pedidosFiltrados = pedidosHoy.sort((a, b) => b.fecha_entrega.toDate() - a.fecha_entrega.toDate());
              this.loading = false;
            })
            .catch((error) => {
              this.loading = false;
            });
        } else {
          this.pedidos = [];
          this.pedidosFiltrados = [];
        }
        sub.unsubscribe();
      },
      error: (err) => {
        this.loading = false;
      },
    });
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
    this.pedidosFiltrados = this.pedidos.filter(pedido => {
      // Filtrar por UID del cliente
      if (pedido.uid_cliente !== this.user().uid) {
        return false;
      }
      // Filtrar por estatus
      if (filterParams.selectedStatus && filterParams.selectedStatus.length) {
        if (!filterParams.selectedStatus.includes(pedido.estatus)) {
          return false;
        }
      }
  
      // Filtrar por rango de fechas
      if (filterParams.fechaInicio && filterParams.fechaFin) {
        const pedidoFecha = new Date(pedido.fecha_entrega.toDate());
        const fechaInicio = new Date(filterParams.fechaInicio);
        const fechaFin = new Date(filterParams.fechaFin);
        if (pedidoFecha < fechaInicio || pedidoFecha > fechaFin) {
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
   console.log(this.pedidosFiltrados);
  }
  


  clearFilters() {
    // Al limpiar los filtros, mostramos todos los pedidos y aseguramos que se obtengan los nombres de los clientes
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0); // Aseguramos que la hora sea medianoche
    // Filtrar solo los pedidos de hoy y con el uid correcto
    const pedidosHoy = this.pedidos.filter((pedido: any) => {
      return (
        pedido.uid_cliente === this.user().uid // Verifica que el UID del cliente coincida
      );
    });
    this.pedidosFiltrados = pedidosHoy.sort((a, b) => b.fecha_entrega.toDate() - a.fecha_entrega.toDate());
    this.pedidosFiltrados = pedidosHoy;

    const promises = this.pedidosFiltrados.map((pedido: any) => {
      // Obtener nombre del cliente
      let path2 = `users/${pedido.uid_cliente}`;
      return this.firebaseSvc.getDocument(path2).then((user: User) => {
        pedido.nombre_cliente = user.name + " " + user.mother_Last_Name + " " + user.father_Last_Name;
        return pedido;
      });
    });

    // Esperar a que todas las promesas se resuelvan
    Promise.all(promises)
      .then((pedidosActualizados) => {
        this.pedidosFiltrados = pedidosActualizados;
        this.filtersApplied = false;
      })
      .catch((error) => {
        console.error('Error al obtener nombres de clientes:', error);
        this.filtersApplied = false;
      });
  }
  

  // Método para filtrar pedidos según el término de búsqueda
  filterPedidos() {
    const term = this.searchTerm.toLowerCase();

    this.pedidosFiltrados = this.pedidos.filter(pedido =>
      pedido.nombre_cliente.toLowerCase().includes(term) || // Agregado para incluir al cliente
      pedido.total.toFixed(2).includes(term) || // Asegurarse de que el total tenga siempre dos decimales
      pedido.id.toLowerCase().includes(term) ||
      pedido.estatus.toLowerCase().includes(term)

    );
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
    console.log("------------------")
    console.log(pedido);
    let success = await this.utilsSvc.presentModal({
      component: DetallePedidoComponent,
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
     
    this.getPedidos();
  }

}
