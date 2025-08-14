import { Component, inject, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AlertController, ModalController } from '@ionic/angular';
import { or, orderBy, where } from 'firebase/firestore/lite';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AssignHoraryComponent } from 'src/app/shared/components/assign-horary/assign-horary.component';
import { FiltrosModalComponent } from 'src/app/shared/components/filtros-modal/filtros-modal.component';

@Component({
  selector: 'app-horario',
  templateUrl: './horario.page.html',
  styleUrls: ['./horario.page.scss'],
})
export class HorarioPage implements OnInit {

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
//Inicializa la fecha de hoy y obt
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



  closeModal() {
    this.showModal = false;
  }

  //========== Obtener Pedidos y Detalles de Pedido con Productos ===========
  getPedidos() {
    let path = `pedidos`;
  
    this.loading = true;
    let query = [
      where("estatus", "==", "En preparación")
    ];    
      
  
    // Obtener la fecha de hoy
    let fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0); // Aseguramos que la hora sea medianoche
  
    // Obtener todos los pedidos
    let sub = this.firebaseSvc.getCollectionData(path,query).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.loading = true; // Iniciar el estado de carga
  
          // Guardamos todos los pedidos (sin filtrar)
          this.pedidos = res;
  
          // Filtrar solo los pedidos de hoy
          const pedidosHoy = this.pedidos.filter((pedido: any) => {
            const fechaEntrega = pedido.fecha_entrega.toDate ? pedido.fecha_entrega.toDate() : pedido.fecha_entrega; // Asegurarse de que la fecha sea un objeto Date
            return fechaEntrega >= fechaHoy && fechaEntrega < new Date(fechaHoy.getTime() + 86400000); // Filtra los pedidos de hoy
          });
  
          // Procesar los datos de cada pedido
          const promises = pedidosHoy.map((pedido: any) => {
            // Obtener nombre del cliente
            let path2 = `users/${pedido.uid_cliente}`;
            return this.firebaseSvc.getDocument(path2).then((user: User) => {
              pedido.nombre_cliente = user.name + " " + user.mother_Last_Name + " " + user.father_Last_Name;
  
              const path3 = `pedidos/${pedido.id}/detalle_pedido`;
  
              // Obtener detalle del pedido
              this.firebaseSvc.getCollectionData(path3, []).subscribe({
                next: (data) => {
                  pedido.detalle_pedido = data;
  
                  // Agregar el nombre del producto a cada detalle
                  pedido.detalle_pedido.forEach(async (detalle: any) => {
                    const detallePath = `productos/${detalle.uid_producto}`;
                    try {
                      let producto = await this.firebaseSvc.getDocument(detallePath);
                      detalle.producto = producto;
                    } catch (err) {
                    }
                  });
                },
                error: (err) => console.error('Error al obtener datos:', err),
              });
  
              return pedido; // Retornar el pedido actualizado
            });
          });
  
          // Esperar a que todas las promesas se resuelvan
          Promise.all(promises)
            .then((pedidosActualizados) => {
              // Asignar pedidos con datos completos (solo los de hoy, por ahora)
              this.pedidosFiltrados = pedidosHoy; // Filtrados de hoy
              this.loading = false;
            })
            .catch((error) => {
              this.loading = false;
            });
        } else {
          this.pedidos = []; // Asignar arreglo vacío si hay un problema
          this.pedidosFiltrados = []; // Asegurarse de que también el arreglo filtrado esté vacío
        }
        sub.unsubscribe();
      },
      error: (err) => {
        this.loading = false;
      },
    });
  }

  refreshOrders() {
   
  }

   // Abre el modal de filtros
  async openFilterModal() {
    let estatus = false;
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
      // Filtrar por estatus
      if (filterParams.selectedStatus && filterParams.selectedStatus.length) {
        if (!filterParams.selectedStatus.includes(pedido.estatus)) {
          return false;
        }
      }
  
      // Filtrar por rango de fechas
      if (filterParams.fechaInicio && filterParams.fechaFin) {
        const pedidoFecha = new Date(pedido.fecha);
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
  }
  


  // Limpia los filtros y restaura la lista completa de pedidos
  clearFilters() {
    // Al limpiar los filtros, mostramos solo los pedidos de hoy
    this.pedidosFiltrados = this.pedidos.filter(pedido => {
      const fechaEntrega = new Date(pedido.fecha_entrega);
      const fechaHoy = new Date();
      return fechaEntrega.toDateString() === fechaHoy.toDateString();
    });
    this.filtersApplied = false;
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

  async openAsignarHorario(pedido: any) {
    let success = await this.utilsSvc.presentModal({
      component: AssignHoraryComponent,
      componentProps: { pedido },
    });
    if (success) {
      this.utilsSvc.presentToast({
        message: `Pedido en espera de entrega`,
        duration: 2500,
        color: 'primary',
        position: 'bottom',
        icon: 'refresh-circle-outline'
      });
    };
    this.getPedidos();
  }


}
