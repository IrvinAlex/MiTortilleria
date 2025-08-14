import { ChangeDetectorRef, Component, Input, inject, OnInit } from '@angular/core';
import { FormBuilder,FormControl, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AlertController } from '@ionic/angular';
import { AddUpdateGastosComponent } from 'src/app/shared/components/add-update-gastos/add-update-gastos.component';
import { Gasto } from 'src/app/models/gasto.model';
import { DatePipe } from '@angular/common';
import { Timestamp } from '@firebase/firestore';



@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.page.html',
  styleUrls: ['./gastos.page.scss'],
  providers: [DatePipe],
})
export class GastosPage implements OnInit {
  @Input() gasto: Gasto | null = null;

  data = [];
  form = new FormGroup({
    uid: new FormControl(''),
    name: new FormControl('', [Validators.required]),
    pago: new FormControl(null, [Validators.required, Validators.min(0)]),
    fecha: new FormControl('', [Validators.required]),
  })

  isModalOpen = false;
  gastoForm: FormGroup;
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

  public showName: boolean = false;
  public showPago: boolean = false;
  public showFecha: boolean = false;

  firebaseSvc = inject(FirebaseService);

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private firebaseService: FirebaseService,
    private alertController: AlertController,
    private datePipe: DatePipe,
  ) {
    this.setPage(1); // Inicializa en la página 1
    this.gastoForm = this.formBuilder.group({
      uid: [''],
      name: [''],
      pago: [''],
      fecha: ['']
    });
  }

  ngOnInit() {
    this.getGastos();

    if (this.gasto) {
      let fecha = this.gasto.fecha;
  
      // Verificar si la fecha es un Timestamp de Firebase
      if (fecha instanceof Timestamp) {
        fecha = fecha.toDate(); // Convertir el Timestamp de Firebase a un objeto Date
      }
  
      // Si la fecha es un objeto Date, convertirla a formato ISO
      const isoDate = fecha instanceof Date ? fecha.toISOString() : null;
  
      // Ahora asignamos la fecha en formato ISO a nuestro formulario
      this.form.patchValue({
        ...this.gasto,
        fecha: isoDate, // Asignar la fecha en formato ISO
      });
    }
  }

  doRefresh(event) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Definición de campos para facilitar el bucle en el HTML
  fields = [
    { key: 'name', label: 'Descripción' },
    { key: 'pago', label: 'Pago' },
    { key: 'fecha', label: 'Fecha' },
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
      message: `¿Estás seguro de que deseas eliminar el gasto ${item.name}?`,
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
              position: 'middle',
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
      const path = `gastos/${item.uid}`;  // Ruta del documento en Firestore
      this.firebaseSvc.deleteDocumet(path)
        .then(() => {
          this.utilsSvc.presentToast({
            message: 'Gasto eliminado exitosamente.',
            duration: 1500,
            color: 'success',
            position: 'middle',
            icon: 'checkmark-circle-outline',
          });
          console.log("Documento eliminado de Firestore");
        })
        .catch(error => {
          this.utilsSvc.presentToast({
            message: 'Error al eliminar el gasto.',
            duration: 2500,
            color: 'danger',
            position: 'middle',
            icon: 'alert-circle-outline',
          });
          console.error("Error al eliminar el documento: ", error);
        });
    } else {
      this.utilsSvc.presentToast({
        message: 'Gasto no encontrado en la lista.',
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
    }
  }
  
  
  async editItem(item: any) {
    
    try {
      const modal = await this.modalCtrl.create({
        component: AddUpdateGastosComponent, // Componente correcto
        componentProps: {
          gasto: item, // Pasamos los datos del usuario al modal
        },
      });
      
      modal.onDidDismiss().then((result) => {
        if (result.data) {
          const index = this.data.findIndex(d => d.uid === result.data.uid);
          if (index > -1) {
            this.data[index] = result.data; // Actualiza la lista de usuarios
          }
          this.paginatedData = [...this.data]; // Actualiza la tabla
          this.cdr.detectChanges(); // Detecta los cambios
        }
      });
  
      await modal.present();
    } catch (error) {
    }
  }

  // Abrir el modal
  async openAddGastoModal() {
    const modal = await this.modalCtrl.create({
      component: AddUpdateGastosComponent,
      componentProps: {
        gastoForm: this.gastoForm
      }
    });

    // Esperar a que el modal se cierre y manejar los datos devueltos
    modal.onDidDismiss().then((result) => {
      if (result.data) { // Agregar el producto a la lista de datos
        this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
        this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
      }
    });

    return await modal.present();
  }

  // Cerrar el modal
  closeModal() {
    this.modalCtrl.dismiss();
  }

  // Agregar producto y cerrar modal
  submitGasto() {
    if (this.gastoForm.valid) {
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.gastoForm.reset(); // Resetear el formulario
      this.closeModal(); // Cerrar modal
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Agrega un nuevo gasto y cierra el modal
  addGasto() {
    if (this.gastoForm.valid) {
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.gastoForm.reset();
      this.closeModal();
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
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
    this.showName = !this.showName;
    this.showPago = !this.showPago;
    this.showFecha = !this.showFecha;
    this.areColumnsVisible = !this.areColumnsVisible;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowField(fieldKey: string): boolean {
    switch (fieldKey) {
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }

  getGastos() {
    this.firebaseService.obtenerColeccion('gastos').subscribe((gasto: Gasto[]) => {
      // Transforma los usuarios a la estructura de `data`
      this.data = gasto.map(gasto => ({
        uid: gasto.uid,
        name: gasto.name,
        pago: gasto.pago,
        fecha: this.datePipe.transform((gasto.fecha as any).toDate(), 'dd/MM/yyyy HH:mm'), 
      }));
  
      // Validar si hay datos
      if (this.data.length > 0) {
        console.log('Se encontraron gastos:', this.data);
      } else {
        console.log('No se encontraron gastos.');
      }
  
      this.paginatedData = [...this.data]; // Actualiza `paginatedData` con los datos transformados
      this.setPage(1); // Inicia la paginación en la primera página
    }, error => {
      console.error('Error al obtener los gastos:', error);
    });
  }

}
