import { ChangeDetectorRef, Component, Input, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';
import { AddUpdateRangoComponent } from 'src/app/shared/components/add-update-rango/add-update-rango.component';
import { Rango } from 'src/app/models/rango.model';
import { AlertController } from '@ionic/angular';
@Component({
  selector: 'app-rangos-eventos',
  templateUrl: './rangos-eventos.page.html',
  styleUrls: ['./rangos-eventos.page.scss'],
})
export class RangosEventosPage implements OnInit {
  @Input() rango: Rango | null = null;

  data = [];
  form = new FormGroup({
    uid: new FormControl(''),
    producto: new FormControl('', [Validators.required]),
    tipo: new FormControl('', [Validators.required]),
    min_producto: new FormControl(null, [Validators.required]),
    max_producto: new FormControl(null, [Validators.required]),
  })


  isModalOpen = false;
  rangoForm: FormGroup;
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

  public showProducto: boolean = false;
  public showTipo: boolean = false;
  public showMinProducto: boolean = false;
  public showMaxProducto: boolean = false;

  firebaseSvc = inject(FirebaseService);

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private firebaseService: FirebaseService,
    private alertController: AlertController
  ) {
    this.setPage(1); // Inicializa en la página 1
    this.rangoForm = this.formBuilder.group({
      uid: [''],
      producto: [''],
      tipo: [''],
      max_producto: [''],
      min_producto: [''],
    });
  }

  ngOnInit() {
    this.getRangos();
  }
  doRefresh(event) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Definición de campos para facilitar el bucle en el HTML
  fields = [
    { key: 'producto', label: 'Producto' },
    { key: 'tipo', label: 'Tipo de cliente o actividad' },
    { key: 'min_producto', label: 'Mínimo de compra (Kg)' },
    { key: 'max_producto', label: 'Máximo de compra (Kg)' },
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
    if (this.editingField && this.editingFieldKey) {
      // Add any validation or save logic here if needed
      // For example: this.saveChanges(this.editingField);
    }
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
      message: `¿Estás seguro de que deseas eliminar el rango?`,
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
      const path = `rango_productos/${item.uid}`;  // Ruta del documento en Firestore
      this.firebaseSvc.deleteDocumet(path)
        .then(() => {
          this.utilsSvc.presentToast({
            message: 'Rango eliminado exitosamente.',
            duration: 1500,
            color: 'success',
            position: 'middle',
            icon: 'checkmark-circle-outline',
          });
          console.log("Documento eliminado de Firestore");
        })
        .catch(error => {
          this.utilsSvc.presentToast({
            message: 'Error al eliminar el rango.',
            duration: 2500,
            color: 'danger',
            position: 'middle',
            icon: 'alert-circle-outline',
          });
          console.error("Error al eliminar el documento: ", error);
        });
    } else {
      this.utilsSvc.presentToast({
        message: 'Rango no encontrado en la lista.',
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
        component: AddUpdateRangoComponent, // Componente correcto
        componentProps: {
          rango: item, // Pasamos los datos del usuario al modal
        },
      });
      
      modal.onDidDismiss().then((result) => {
        if (result.data) {
          this.getRangos();
          this.paginatedData = [...this.data];
        }
      });
  
      await modal.present();
    } catch (error) {
    }
  }

    // Abrir el modal
    async openAddRangoModal() {
    const modal = await this.modalCtrl.create({
      component: AddUpdateRangoComponent,
      componentProps: {
        rangoForm: this.rangoForm
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

  // Cerrar el modal
  closeModal() {
    this.modalCtrl.dismiss();
  }

  // Agregar producto y cerrar modal
  submitProduct() {
    if (this.rangoForm.valid) {// Agregar producto a la lista
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.rangoForm.reset(); // Resetear el formulario
      this.closeModal(); // Cerrar modal
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Agrega un nuevo producto y cierra el modal
  addProduct() {
    if (this.rangoForm.valid) {
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.rangoForm.reset();
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
    this.showProducto = !this.showProducto;
    this.showTipo = !this.showTipo;
    this.showMinProducto = !this.showMinProducto;
    this.showMaxProducto = !this.showMaxProducto;
    this.areColumnsVisible = !this.areColumnsVisible;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowField(fieldKey: string): boolean {
    switch (fieldKey) {
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }

  getRangos() {
    this.firebaseService.obtenerColeccion('rango_productos').subscribe((rangos: Rango[]) => {
      // Transforma los usuarios a la estructura de `data`
      this.data = rangos.map(rango => ({
        uid: rango.uid,
        producto: rango.producto,
        tipo: rango.tipo,
        max_producto: rango.max_producto,
        min_producto: rango.min_producto,
      }));
  
  
      this.paginatedData = [...this.data]; // Actualiza `paginatedData` con los datos transformados
      this.setPage(1); // Inicia la paginación en la primera página
    });
  }
  
  // Add pagination helper methods
  getStartItem(): number {
    if (!this.paginatedData || this.paginatedData.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndItem(): number {
    if (!this.paginatedData || this.paginatedData.length === 0) {
      return 0;
    }
    const totalFiltered = this.filteredData ? this.filteredData.length : 0;
    return Math.min(this.currentPage * this.itemsPerPage, totalFiltered);
  }

  getTotalItems(): number {
    return this.filteredData ? this.filteredData.length : 0;
  }

}
