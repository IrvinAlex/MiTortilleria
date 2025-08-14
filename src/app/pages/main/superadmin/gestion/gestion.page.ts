import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AlertController } from '@ionic/angular';
import { AddUpdateGestionComponent } from 'src/app/shared/components/add-update-gestion/add-update-gestion.component';
import { Producto } from 'src/app/models/producto.model';
import { AddUpdatePreciosComponent } from 'src/app/shared/components/add-update-precios/add-update-precios.component';

@Component({
  selector: 'app-gestion',
  templateUrl: './gestion.page.html',
  styleUrls: ['../gestion/gestion.page.scss'],
})
export class GestionPage implements OnInit {

  data = [];
  dataSub = [];

  form = new FormGroup({
    uid: new FormControl(''),
    imagen: new FormControl('', [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.minLength(4)]),
    descripcion: new FormControl('', [Validators.required, Validators.minLength(4)]),
    unidad: new FormControl(null, [Validators.required, Validators.min(0)]),
    disponible: new FormControl(false, [Validators.required]),
  })

  formSub = new FormGroup({
    uid: new FormControl(''),
    uidProducto: new FormControl(''),
    nombreProducto: new FormControl('', [Validators.required, Validators.minLength(4)]),
    nombre: new FormControl('', [Validators.required, Validators.minLength(4)]),
    precio: new FormControl(null, [Validators.required, Validators.min(0)]),
    granel: new FormControl(false, [Validators.required]), 
  })


  isModalOpen = false;
  productForm: FormGroup;
  productFormSub: FormGroup;
  filteredData = [...this.data]; // Duplicamos los datos para filtrar
  filteredDataSub = [...this.dataSub];
  editingField: any = null; // Campo en edición
  editingFieldKey: string = ''; // Llave del campo en edición
  searchTerm = '';
  utilsSvc = inject(UtilsService);
  areColumnsVisible: boolean = false;

  paginatedData = [];
  paginatedDataSub = [];
  currentPage = 1;
  currentPageSub = 1;
  itemsPerPage = 10;
  itemsPerPageSub = 10;
  totalPages = 0;
  totalPagesSub = 0;

  public showDescripcion: boolean = false;
  public showImagen: boolean = false;
  public showDisponible: boolean = false;
  public showNombre: boolean = false;
  public showStock: boolean = false;
  public showPrecio: boolean = false;
  public showGranel: boolean = false;
  public showTipoVenta: boolean = false;

  firebaseSvc = inject(FirebaseService);

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private firebaseService: FirebaseService,
    private alertController: AlertController
  ) {
    this.setPage(1); // Inicializa en la página 1
    this.productForm = this.formBuilder.group({
      nombre: [''],
      imagen: [''],
      descripcion: [''],
      stock: [''],
      disponible: [''],
    });
    this.productFormSub = this.formBuilder.group({
      nombreProducto: [''],
      nombre: [''],
      granel: [''],
      precio: [''],
    });
  }

  ngOnInit() {
    this.getProducts();
    this.getProductsSub();
  }

  doRefresh(event) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Definición de campos para facilitar el bucle en el HTML
  fields = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripcion' },
    { key: 'disponible', label: 'Disponibilidad' },
    { key: 'stock', label: 'Cantidad' },
    { key: 'imagen', label: 'Imagen' },
  ];

  fieldsSub = [
    { key: 'nombreProducto', label: 'Nombre' },
    { key: 'nombre', label: 'Tipo de venta' },
    { key: 'precio', label: 'Precio' },
    { key: 'granel', label: 'Granel' },
  ];

  // Método para buscar productos
  filterItems(event: any) {
    const query = event.target.value.toLowerCase();
    this.paginatedData = this.data.filter(item => {
      return Object.values(item).some(value => value.toString().toLowerCase().includes(query));
    });
    this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
  }

  // Método para buscar productos
  filterItemsSub(event: any) {
    const query = event.target.value.toLowerCase();
    this.paginatedDataSub = this.dataSub.filter(item => {
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

  // Método para ordenar la tabla por un campo
  sortTableSub(field: string) {
    this.paginatedDataSub.sort((a, b) => {
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

  //Método para eliminar un item
  deleteItem(item: any) {
    // Crear la alerta de confirmación
    this.presentConfirmDeleteAlert(item);
  }
  
  // Método para mostrar la alerta de confirmación
  async presentConfirmDeleteAlert(item: any) {
    const alert = await this.alertController.create({
      header: 'Confirmación',
      message: `¿Estás seguro de que deseas eliminar el producto ${item.nombre}?`,
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
      const path = `productos/${item.uid}`;  // Ruta del documento en Firestore
      this.firebaseSvc.deleteDocumet(path)
        .then(() => {
          this.utilsSvc.presentToast({
            message: 'Porducto eliminado exitosamente.',
            duration: 1500,
            color: 'success',
            position: 'middle',
            icon: 'checkmark-circle-outline',
          });
        })
        .catch(error => {
          this.utilsSvc.presentToast({
            message: 'Error al eliminar el producto.',
            duration: 2500,
            color: 'danger',
            position: 'middle',
            icon: 'alert-circle-outline',
          });
        });
    } else {
      this.utilsSvc.presentToast({
        message: 'Producto no encontrado en la lista.',
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
        component: AddUpdateGestionComponent, // Componente correcto
        componentProps: {
          producto: item, // Pasamos los datos del producto al modal
        },
      });
  
      modal.onDidDismiss().then((result) => {
        if (result.data) {
          const index = this.data.findIndex(d => d.uid === result.data.uid);
          if (index > -1) {
            this.data[index] = result.data; // Actualiza la lista de productos
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
  async openAddProductModal() {
    const modal = await this.modalCtrl.create({
      component: AddUpdateGestionComponent,
      componentProps: {
        productForm: this.productForm
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
    if (this.productForm.valid) {
      this.data.push(this.productForm.value); // Agregar producto a la lista
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.productForm.reset(); // Resetear el formulario
      this.closeModal(); // Cerrar modal
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Agrega un nuevo producto y cierra el modal
  addProduct() {
    if (this.productForm.valid) {
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.productForm.reset();
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
    this.showDisponible = !this.showDisponible;
    this.showImagen = !this.showImagen;
    this.showDescripcion = !this.showDescripcion;
    this.showNombre = !this.showNombre;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowField(fieldKey: string): boolean {
    switch (fieldKey) {
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }
  
  getProducts() {
    this.firebaseService.obtenerColeccion('productos').subscribe((producto: Producto[]) => {
      // Transforma los usuarios a la estructura de `data`
      this.data = producto.map(producto => ({
        uid: producto.uid,
        nombre: producto.nombre,
        stock: producto.stock,
        precio: producto.precio_mostrador,
        imagen: producto.imagen,
        descripcion: producto.descripcion,
        disponible: producto.disponible, 
      }));
  
  
      this.paginatedData = [...this.data]; // Actualiza `paginatedData` con los datos transformados
      this.setPage(1); // Inicia la paginación en la primera página
    });
  }


  

    ///////////////////////////       SUBTABLA       //////////////////////////////

  //Método para eliminar un item
  deleteItemSub(item: any) {
    // Crear la alerta de confirmación
    this.presentConfirmDeleteAlertSub(item);
  }
  
  // Método para mostrar la alerta de confirmación
  async presentConfirmDeleteAlertSub(item: any) {
    const alert = await this.alertController.create({
      header: 'Confirmación',
      message: `¿Estás seguro de que deseas eliminar el producto ${item.nombre}?`,
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
            this.confirmDeleteItemSub(item);  // Proceder con la eliminación
          }
        }
      ]
    });
  
    await alert.present();
  }
  
  // Método para confirmar y proceder con la eliminación
  confirmDeleteItemSub(item: any) {
    // Buscar el índice del elemento en el arreglo por el uid
    const index = this.dataSub.findIndex(d => d.uid === item.uid);
  
    if (index > -1) {
      // Eliminar el elemento de la lista local
      this.dataSub.splice(index, 1);
      this.paginatedDataSub = [...this.dataSub]; // Actualizamos la lista filtrada
      this.setPage(1);
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
  
      // Llamar al servicio para eliminar el documento de Firestore
      const path = `productos/${item.uidProducto}/opciones/${item.uid}`;  // Ruta del documento en Firestore
      this.firebaseSvc.deleteDocumet(path)
        .then(() => {
          this.utilsSvc.presentToast({
            message: 'Porducto eliminado exitosamente.',
            duration: 1500,
            color: 'success',
            position: 'middle',
            icon: 'checkmark-circle-outline',
          });
        })
        .catch(error => {
          this.utilsSvc.presentToast({
            message: 'Error al eliminar el producto.',
            duration: 2500,
            color: 'danger',
            position: 'middle',
            icon: 'alert-circle-outline',
          });
        });
    } else {
      this.utilsSvc.presentToast({
        message: 'Producto no encontrado en la lista.',
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
    }
  }


  async editItemSub(item: any) {
    console.log(item);
    try {
      const modal = await this.modalCtrl.create({
        component: AddUpdatePreciosComponent, // Componente correcto
        componentProps: {
          producto: item, // Pasamos los datos del producto al modal
        },
      });
  
      modal.onDidDismiss().then((result) => {
        if (result.data) {
          const index = this.dataSub.findIndex(d => d.uid === result.data.uid);
          if (index > -1) {
            this.dataSub[index] = result.data; // Actualiza la lista de productos
          }
          this.paginatedDataSub = [...this.dataSub]; // Actualiza la tabla
          this.cdr.detectChanges(); // Detecta los cambios
          this.getProductsSub();
        }
      });
  
      await modal.present();
    } catch (error) {
    }
  }

  // Abrir el modal
  async openAddProductModalSub() {
    const modal = await this.modalCtrl.create({
      component: AddUpdatePreciosComponent,
      componentProps: {
        productFormSub: this.productFormSub, // Pasa el formulario al modal
      },
    });
  
    modal.onDidDismiss().then((result) => {
      if (result.data) {
        // Verifica si el producto es nuevo o si es una actualización
        const index = this.dataSub.findIndex(item => item.uid === result.data.uid);
  
        if (index > -1) {
          // Si existe, actualiza el producto
          this.dataSub[index] = result.data;
        } else {
          // Si no existe, agrégalo como nuevo
          this.dataSub.push(result.data);
        }
  
        // Actualiza la tabla visible
        this.paginatedDataSub = [...this.dataSub];
  
        // Forzar la detección de cambios
        this.cdr.detectChanges();
        this.getProductsSub();
      }
    });
  
    return await modal.present();
  }


  // Agregar producto y cerrar modal
  submitProductSub() {
    if (this.productFormSub.valid) {
      this.dataSub.push(this.productFormSub.value); // Agregar producto a la lista
      this.paginatedData = [...this.dataSub]; // Actualizamos la lista filtrada
      this.productFormSub.reset(); // Resetear el formulario
      this.closeModal(); // Cerrar modal
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Agrega un nuevo producto y cierra el modal
  addProductSub() {
    if (this.productFormSub.valid) {
      this.paginatedData = [...this.dataSub]; // Actualizamos la lista filtrada
      this.productFormSub.reset();
      this.closeModal();
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Método para cambiar de página
  setPageSub(page: number) {
    this.currentPageSub = page;
    const startIndex = (page - 1) * this.itemsPerPageSub;
    const endIndex = startIndex + this.itemsPerPageSub;
    this.paginatedDataSub = this.dataSub.slice(startIndex, endIndex); // Divide el array de productos
    this.totalPagesSub = Math.ceil(this.dataSub.length / this.itemsPerPageSub); // Total de páginas
  }

  // Ir a la página anterior
  previousPageSub() {
    if (this.currentPageSub > 1) {
      this.setPageSub(this.currentPageSub - 1);
    }
  }

  // Ir a la siguiente página
  nextPageSub() {
    if (this.currentPageSub < this.totalPagesSub) {
      this.setPageSub(this.currentPageSub + 1);
    }
  }

  // Método para alternar la visibilidad de las columnas
  toggleColumnsSub() {
    this.showPrecio = !this.showPrecio;
    this.showStock = !this.showStock;
    this.showGranel = !this.showGranel;
    this.showNombre = !this.showNombre;
    this.showTipoVenta = !this.showTipoVenta;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowFieldSub(fieldKey: string): boolean {
    switch (fieldKey) {
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }
  

  getProductsSub() {
    this.firebaseService.obtenerColeccion('productos').subscribe((producto: Producto[]) => {
      const productosConSubcoleccion = [];
  
  
      producto.forEach((producto) => {
        const nombrePro=producto.nombre;
        const uidPro=producto.uid;
  
        this.firebaseService.obtenerSubColeccion(`productos/${producto.uid}/opciones`).subscribe((subcoleccion) => {
  
          subcoleccion.forEach((subItem) => {
            productosConSubcoleccion.push({
              uid: producto.uid,
              uidProducto: uidPro,
              nombre: producto.nombre,
              nombreProducto: nombrePro,
              granel: producto.granel,
              precio: producto.precio_mostrador,
              ...subItem, // Combina datos del producto principal con los de la subcolección
            });
          });
  
  
          // Actualiza los datos y la tabla
          this.dataSub = productosConSubcoleccion;
          this.paginatedDataSub = [...this.dataSub];
          this.setPageSub(1);
        });
      });
    });
  }
}
