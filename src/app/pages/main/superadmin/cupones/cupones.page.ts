import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';
import { AddUpdateCuponComponent } from 'src/app/shared/components/add-update-cupon/add-update-cupon.component';
import { Cupon } from 'src/app/models/cupon.model';
import { AlertController } from '@ionic/angular';
import { ModalController as IonicModalController } from '@ionic/angular';
import { NotificationModalComponent } from 'src/app/shared/components/notification-modal/notification-modal.component';

@Component({
  selector: 'app-cupones',
  templateUrl: './cupones.page.html',
  styleUrls: ['./cupones.page.scss'],
})
export class CuponesPage implements OnInit {

  data = [];


  isModalOpen = false;
  cuponForm: FormGroup;
  filteredData = [...this.data]; // Duplicamos los datos para filtrar
  editingField: any = null; // Campo en edición
  editingFieldKey: string = ''; // Llave del campo en edición
  searchTerm = '';
  utilsSvc = inject(UtilsService);
  areColumnsVisible: boolean = false; // Inicializar como verdadero

  paginatedData = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  public showDescripcion: boolean = false;
  public showPorcentaje: boolean = false;
  public showNumeroCompras: boolean = false;
  public showCodigo: boolean = false;

  firebaseSvc = inject(FirebaseService);

  // NUEVO: Modal y formulario para notificación push
  isNotificationModalOpen = false;
  notificationForm: FormGroup;
  selectedCupon: any = null; // Cupón seleccionado para notificación

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private firebaseService: FirebaseService,
    private alertController: AlertController,
    private ionicModalCtrl: IonicModalController // NUEVO
  ) {
    this.setPage(1); // Inicializa en la página 1
    this.cuponForm = this.formBuilder.group({
      uid: [''],
      descripcion: [''],
      numero_compras: [''],
      porcentaje: [''],
      codigo: ['']
    });
    this.notificationForm = this.formBuilder.group({
      title: ['', Validators.required],
      message: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.getCupones();
  }
  doRefresh(event) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Definición de campos para facilitar el bucle en el HTML
  fields = [
    { key: 'descripcion', label: 'Descripcion' },
    { key: 'numero_compras', label: 'Número de compras minimas' },
    { key: 'porcentaje', label: 'Porcentaje' },
    { key: 'codigo', label: 'Codígo' },
  ];

  // Método para buscar productos
  filterItems(event: any) {
    const query = event.target.value.toLowerCase();
    this.paginatedData = this.data.filter(item => {
      return Object.values(item).some(value => value.toString().toLowerCase().includes(query));
    });
    this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
  }

  // Método para ordenar la tabla por un campo
  sortTable(field: string) {
    this.paginatedData.sort((a, b) => {
      if (a[field] < b[field]) return -1;
      if (a[field] > b[field]) return 1;
      return 0;
    });
    this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
  }

  // Método para iniciar la edición de un campo
  editField(item: any, field: string) {
    this.editingField = item;
    this.editingFieldKey = field;
  }

  // Método para finalizar la edición
  finishEditing() {
    this.editingField = null;
    this.editingFieldKey = null;
  }

  // Método para eliminar un item
  deleteItem(item: any) {
    // Crear la alerta de confirmación
    this.presentConfirmDeleteAlert(item);
  }
  
  // Método para mostrar la alerta de confirmación
  async presentConfirmDeleteAlert(item: any) {
    const alert = await this.alertController.create({
      header: 'Confirmación',
      message: `¿Estás seguro de que deseas eliminar el ${item.descripcion}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            // No hacer nada, solo cerrar la alerta
            this.utilsSvc.presentToast({
              message: 'Eliminación cancelada.',
              duration: 1500,
              color: 'warning',
              position: 'bottom',
              icon: 'alert-circle-outline',
            });
          }
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.confirmDeleteItem(item);  // Proceder con la eliminación
          }
        }
      ]
    });
  
    await alert.present();
  }
  
  // Método para confirmar y proceder con la eliminación
  confirmDeleteItem(item: any) {
    // Buscar el índice del elemento en el arreglo por el uid
    const index = this.data.findIndex(d => d.uid === item.uid);
  
    if (index > -1) {
      // Eliminar el elemento de la lista local
      this.data.splice(index, 1);
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.setPage(1);
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
  
      // Llamar al servicio para eliminar el documento de Firestore
      const path = `cupones/${item.uid}`;  // Ruta del documento en Firestore
      this.firebaseSvc.deleteDocumet(path)
        .then(() => {
          this.utilsSvc.presentToast({
            message: 'Cupón eliminado exitosamente.',
            duration: 1500,
            color: 'success',
            position: 'bottom',
            icon: 'checkmark-circle-outline',
          });
          console.log("Documento eliminado de Firestore");
        })
        .catch(error => {
          this.utilsSvc.presentToast({
            message: 'Error al eliminar el cupón.',
            duration: 2500,
            color: 'danger',
            position: 'bottom',
            icon: 'alert-circle-outline',
          });
          console.error("Error al eliminar el documento: ", error);
        });
    } else {
      this.utilsSvc.presentToast({
        message: 'Cupón no encontrado en la lista.',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline',
      });
    }
  }

  
  async editItem(item: any) {
    try {
      const modal = await this.modalCtrl.create({
        component: AddUpdateCuponComponent,
        componentProps: {
          cupon: item, // Pasamos el cupón a editar
        },
      });
  
      modal.onDidDismiss().then((result) => {
        if (result.data) {
          this.getCupones(); 
        }
      });
  
      await modal.present();
    } catch (error) {
      console.error('Error al editar el cupón:', error);
    }
  }

    // Abrir el modal
    async openAddCuponModal() {
    const modal = await this.modalCtrl.create({
      component: AddUpdateCuponComponent,
      componentProps: {
        cuponForm: this.cuponForm
      }
    });


    // Esperar a que el modal se cierre y manejar los datos devueltos
    modal.onDidDismiss().then((result) => {
      if (result.data) { 
        this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
        this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
      }
    });

    return await modal.present();
  }

  // NUEVO: Abrir modal de notificación
  async openNotificationModal() {
    this.isNotificationModalOpen = true;
    const modal = await this.ionicModalCtrl.create({
      component: NotificationModalComponent,
      componentProps: {
        notificationForm: this.notificationForm
      }
    });

    modal.onDidDismiss().then((result) => {
      this.isNotificationModalOpen = false;
      if (result.data && result.data.length > 0) {
        // Opcional: mostrar toast de éxito
        this.utilsSvc.presentToast({
          message: 'Notificación enviada.',
          duration: 1500,
          color: 'primary',
          position: 'bottom',
          icon: 'send-outline',
        }); 
      }
    });

    return await modal.present();
  }

  // NUEVO: Método para enviar la notificación push
  sendNotification() {
    if (this.notificationForm.valid) {
      const { title, message } = this.notificationForm.value;
      // Suponiendo que existe un método en FirebaseService para enviar push
      this.firebaseService.sendPushNotification({ title, message })
        .then(() => {
          this.utilsSvc.presentToast({
            message: 'Notificación enviada exitosamente.',
            duration: 1500,
            color: 'success',
            position: 'bottom',
            icon: 'send-outline',
          });
          this.notificationForm.reset();
          this.closeNotificationModal();
        })
        .catch(error => {
          this.utilsSvc.presentToast({
            message: 'Error al enviar la notificación.',
            duration: 2500,
            color: 'danger',
            position: 'bottom',
            icon: 'alert-circle-outline',
          });
          console.error("Error al enviar la notificación: ", error);
        });
    }
  }

  // NUEVO: Cerrar modal de notificación
  closeNotificationModal() {
    this.ionicModalCtrl.dismiss();
    this.isNotificationModalOpen = false;
  }

  // Abrir modal de notificación para un cupón específico
  async openNotificationModalForCupon(cupon: any) {
    this.selectedCupon = cupon;
    this.notificationForm.patchValue({
      title: `¡Oferta especial! ${cupon.descripcion}`,
      message: `Cupón: ${cupon.codigo} - ${cupon.porcentaje}% de descuento en compras mínimas de ${cupon.numero_compras}.`
    });
    this.isNotificationModalOpen = true;
    const modal = await this.ionicModalCtrl.create({
      component: NotificationModalComponent,
      componentProps: {
        notificationForm: this.notificationForm
      }
    });

    modal.onDidDismiss().then((result) => {
      this.isNotificationModalOpen = false;
      this.selectedCupon = null;
      if (result.data && result.data.length > 0) {
        this.utilsSvc.presentToast({
          message: 'Notificación enviada.',
          duration: 1500,
          color: 'primary',
          position: 'bottom',
          icon: 'send-outline',
        });
      }
    });

    return await modal.present();
  }

  // Método para cambiar de página
  setPage(page: number) {
    this.currentPage = page;
    const startIndex = (page - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.data.slice(startIndex, endIndex); // Divide el array de productos
    this.totalPages = Math.ceil(this.data.length / this.itemsPerPage); // Total de páginas
  }

  // Ir a la página anterior
  previousPage() {
    if (this.currentPage > 1) {
      this.setPage(this.currentPage - 1);
    }
  }

  // Ir a la siguiente página
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.setPage(this.currentPage + 1);
    }
  }

  // Método para alternar la visibilidad de las columnas
  toggleColumns() {
    this.showDescripcion = !this.showDescripcion;
    this.showNumeroCompras = !this.showNumeroCompras;
    this.showPorcentaje = !this.showPorcentaje;
    this.showCodigo = !this.showCodigo;
    this.areColumnsVisible = !this.areColumnsVisible;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowField(fieldKey: string): boolean {
    switch (fieldKey) {
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }

  getCupones() {
    this.firebaseService.obtenerColeccion('cupones').subscribe((cupones: Cupon[]) => {
      this.data = cupones.map(cupon => ({
        uid: cupon.uid,
        descripcion: cupon.descripcion,
        numero_compras: cupon.numero_compras,
        porcentaje: cupon.porcentaje,
        codigo: cupon.codigo // Asegúrate de incluir todos los campos relevantes
      }));
  
      this.paginatedData = [...this.data];
      this.setPage(1); // Inicia la paginación en la primera página
    });
  }

}
