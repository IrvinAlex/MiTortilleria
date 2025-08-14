import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
})
export class InventarioPage implements OnInit {

  data = [
    { nombre: 'Producto 1', stock: 50, costoUnidad: 10, precioFinal: 15, ganancia: 5, categoria: 'Categoría 1', proveedor: 'Proveedor 1', medida: 'kg', codigo: 'frj', codigoBarras: '8486628' },
    { nombre: 'Producto 2', stock: 30, costoUnidad: 20, precioFinal: 25, ganancia: 5, categoria: 'Categoría 2', proveedor: 'Proveedor 2', medida: 'litro' },
    { nombre: 'Producto 3', stock: 100, costoUnidad: 5, precioFinal: 8, ganancia: 3, categoria: 'Categoría 1', proveedor: 'Proveedor 3', medida: 'unidad' },
    { nombre: 'Producto 4', stock: 20, costoUnidad: 50, precioFinal: 60, ganancia: 10, categoria: 'Categoría 3', proveedor: 'Proveedor 4', medida: 'kg' },
    { nombre: 'Producto 5', stock: 80, costoUnidad: 15, precioFinal: 20, ganancia: 5, categoria: 'Categoría 2', proveedor: 'Proveedor 5', medida: 'litro' },
    { nombre: 'Producto 6', stock: 40, costoUnidad: 30, precioFinal: 40, ganancia: 10, categoria: 'Categoría 3', proveedor: 'Proveedor 6', medida: 'unidad' },
    { nombre: 'Producto 7', stock: 60, costoUnidad: 8, precioFinal: 12, ganancia: 4, categoria: 'Categoría 1', proveedor: 'Proveedor 7', medida: 'kg', codigo: 'arf', codigoBarras: '965984984' },
    { nombre: 'Producto 8', stock: 10, costoUnidad: 100, precioFinal: 120, ganancia: 20, categoria: 'Categoría 4', proveedor: 'Proveedor 8', medida: 'litro' },
    { nombre: 'Producto 9', stock: 200, costoUnidad: 3, precioFinal: 5, ganancia: 2, categoria: 'Categoría 1', proveedor: 'Proveedor 9', medida: 'unidad' },
    { nombre: 'Producto 10', stock: 90, costoUnidad: 12, precioFinal: 18, ganancia: 6, categoria: 'Categoría 2', proveedor: 'Proveedor 10', medida: 'kg' },
    { nombre: 'Producto 11', stock: 70, costoUnidad: 25, precioFinal: 35, ganancia: 10, categoria: 'Categoría 3', proveedor: 'Proveedor 11', medida: 'litro' },
    { nombre: 'Producto 12', stock: 35, costoUnidad: 40, precioFinal: 50, ganancia: 10, categoria: 'Categoría 4', proveedor: 'Proveedor 12', medida: 'unidad' },
    { nombre: 'Producto 13', stock: 120, costoUnidad: 6, precioFinal: 9, ganancia: 3, categoria: 'Categoría 1', proveedor: 'Proveedor 13', medida: 'kg' },
    { nombre: 'Producto 14', stock: 55, costoUnidad: 18, precioFinal: 25, ganancia: 7, categoria: 'Categoría 2', proveedor: 'Proveedor 14', medida: 'litro' },
    { nombre: 'Producto 15', stock: 65, costoUnidad: 22, precioFinal: 30, ganancia: 8, categoria: 'Categoría 3', proveedor: 'Proveedor 15', medida: 'unidad' },
    { nombre: 'Producto 16', stock: 25, costoUnidad: 55, precioFinal: 70, ganancia: 15, categoria: 'Categoría 4', proveedor: 'Proveedor 16', medida: 'kg' },
    { nombre: 'Producto 17', stock: 95, costoUnidad: 11, precioFinal: 16, ganancia: 5, categoria: 'Categoría 1', proveedor: 'Proveedor 17', medida: 'litro' },
    { nombre: 'Producto 18', stock: 85, costoUnidad: 14, precioFinal: 19, ganancia: 5, categoria: 'Categoría 2', proveedor: 'Proveedor 18', medida: 'unidad' },
    { nombre: 'Producto 19', stock: 45, costoUnidad: 35, precioFinal: 45, ganancia: 10, categoria: 'Categoría 3', proveedor: 'Proveedor 19', medida: 'kg' },
    { nombre: 'Producto 20', stock: 15, costoUnidad: 60, precioFinal: 80, ganancia: 20, categoria: 'Categoría 4', proveedor: 'Proveedor 20', medida: 'litro' }
];


  isModalOpen = false;
  productForm: FormGroup;
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

  public showStock: boolean = false;
  public showCosto: boolean = false;
  public showPrecio: boolean = false;
  public showGanancia: boolean = false;
  public showCategoria: boolean = false;
  public showProveedor: boolean = false;
  public showMedida: boolean = false;
  public showCodigo: boolean = false;
  public showCodigoBarras: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.setPage(1); // Inicializa en la página 1
    this.productForm = this.formBuilder.group({
      nombre: [''],
      stock: [''],
      costoUnidad: [''],
      precioFinal: [''],
      ganancia: [''],
      categoria: [''],
      proveedor: [''],
      medida: [''],
      codigo: [''],
      codigoBarras: ['']
    });
  }

  ngOnInit() {}

  // Definición de campos para facilitar el bucle en el HTML
  fields = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'stock', label: 'Stock' },
    { key: 'costoUnidad', label: 'Costo Unidad' },
    { key: 'precioFinal', label: 'Precio Final' },
    { key: 'ganancia', label: 'Ganancia' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'medida', label: 'Medida' },
    { key: 'codigo', label: 'Código' },
    { key: 'codigoBarras', label: 'Código de Barras' }
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
    const index = this.data.findIndex(d => d.nombre === item.nombre && d.proveedor === item.proveedor);
    if (index > -1) {
      this.data.splice(index, 1);
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.setPage(1);
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Abrir el modal
  async openAddProductModal() {
    const modal = await this.modalCtrl.create({
      component: AddUpdateProductComponent,
      componentProps: {
        productForm: this.productForm
      }
    });

    // Esperar a que el modal se cierre y manejar los datos devueltos
    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.data.push(result.data); // Agregar el producto a la lista de datos
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
      this.data.push(this.productForm.value);
      this.paginatedData = [...this.data]; //  en este  apartado actualizamos la lista filtrada
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
    this.showStock = !this.showStock;
    this.showCosto = !this.showCosto;
    this.showPrecio = !this.showPrecio;
    this.showGanancia = !this.showGanancia;
    this.showCategoria = !this.showCategoria;
    this.showProveedor = !this.showProveedor;
    this.showMedida = !this.showMedida;
    this.showCodigo = !this.showCodigo;
    this.showCodigoBarras = !this.showCodigoBarras;
    this.areColumnsVisible = !this.areColumnsVisible;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowField(fieldKey: string): boolean {
    switch (fieldKey) {
      case 'ganancia':
        return this.showGanancia;
      case 'categoria':
        return this.showCategoria;
      case 'proveedor':
        return this.showProveedor;
      case 'medida':
        return this.showMedida;
      case 'codigo':
        return this.showCodigo;
      case 'codigoBarras':
        return this.showCodigoBarras;
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }

}
