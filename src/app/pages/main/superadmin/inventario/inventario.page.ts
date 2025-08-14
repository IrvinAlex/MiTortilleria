import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { take } from 'rxjs';
import { AddUpdateInventarioComponent } from 'src/app/shared/components/add-update-inventario/add-update-inventario.component';
import { Chart } from 'chart.js/auto';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { User } from 'src/app/models/user.model';
import { ProductBodega } from 'src/app/models/productBodega.model';
import { UpdateInventarioComponent } from 'src/app/shared/components/update-inventario/update-inventario.component';
import { AsignarProductoComponent } from 'src/app/shared/components/asignar-producto/asignar-producto.component';
import { getFirestore, collection, query, where, Timestamp } from '@angular/fire/firestore';


@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
})
export class InventarioPage implements OnInit {

  data = [];
  dataGraficaLabels=[];
  dataGrafica=[];
  dataSelect = [];

  form = new FormGroup({
    id: new FormControl(''),
    name: new FormControl('', [Validators.required]),
    soldUnits: new FormControl(null, [Validators.required, Validators.min(0)])
  })


  isModalOpen = false;
  inventarioForm: FormGroup;
  filteredData = [...this.data]; // Duplicamos los datos para filtrar
  editingField: any = null; // Campo en edición
  editingFieldKey: string = ''; // Llave del campo en edición
  searchTerm = '';
  utilsSvc = inject(UtilsService);
  areColumnsVisible: boolean = false; // Inicializar como verdadero
  isAsignarDisabled: boolean = false;

  paginatedData = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  chart: any;

  public showStock: boolean = false;
  public showNombre: boolean = false;
  public showImagen: boolean = false;

  firebaseSvc = inject(FirebaseService);

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.setPage(1); // Inicializa en la página 1
    this.inventarioForm = this.formBuilder.group({
      nombre: [''],
      stock: [''],
      imagen: ['']
    });
  }

  utilSvc = inject(UtilsService);

  ngOnInit() {
    this.getDataGrafica();
    this.getUsers();
    this.getRegistroHoy();
  }

  doRefresh(event) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Definición de campos para facilitar el bucle en el HTML
  fields = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'stock', label: 'Stock' },
    { key: 'image', label: 'Imagen' },
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
  deleteItem(nombre) {
    const index = this.data.findIndex(d => d.nombre === nombre);
    if (index > -1) {
      this.data.splice(index, 1);
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.setPage(1);
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Abrir el modal
  async openAddInventarioModal() {
    const modal = await this.modalCtrl.create({
      component: AddUpdateInventarioComponent,
      componentProps: {
        inventarioForm: this.inventarioForm
      }
    });

    // Esperar a que el modal se cierre y manejar los datos devueltos
    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
        this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
        this.getDataGrafica();
    
        // Si tienes la referencia al gráfico, actualízalo
        if (this.chart) {
          // Actualizamos las etiquetas y los datos del gráfico
          this.chart.data.labels = this.dataGraficaLabels;  // Actualiza las etiquetas
          this.chart.data.datasets[0].data = this.dataGrafica;  // Actualiza los datos
          this.chart.update();  // Redibuja el gráfico con los nuevos datos
        }
        
        this.getUsers();
      }
    });

    return await modal.present();
  }

  // Abrir el modal
  async openAsignarProductoModal() {
    const modal = await this.modalCtrl.create({
      component: AsignarProductoComponent,
      componentProps: {
        inventarioForm: this.inventarioForm
      }
    });

    // Esperar a que el modal se cierre y manejar los datos devueltos
    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.success) {  // Verificamos que el resultado tenga éxito
        this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
        this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
        this.getDataGrafica();
    
        // Si tienes la referencia al gráfico, actualízalo
        if (this.chart) {
          // Actualizamos las etiquetas y los datos del gráfico
          this.chart.data.labels = this.dataGraficaLabels;  // Actualiza las etiquetas
          this.chart.data.datasets[0].data = this.dataGrafica;  // Actualiza los datos
          this.chart.update();  // Redibuja el gráfico con los nuevos datos
        }
    
        this.getUsers();
      }
    });

    return await modal.present();
  }

  // Abrir el modal
  async openUpdateInventarioModal(nombre) {
    
    const modal = await this.modalCtrl.create({
      component: UpdateInventarioComponent,
      componentProps: {
        inventarioForm: this.inventarioForm,
        nombre: nombre
      }
    });

    // Esperar a que el modal se cierre y manejar los datos devueltos
    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
        this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
        this.getDataGrafica();
    
        // Si tienes la referencia al gráfico, actualízalo
        if (this.chart) {
          // Actualizamos las etiquetas y los datos del gráfico
          this.chart.data.labels = this.dataGraficaLabels;  // Actualiza las etiquetas
          this.chart.data.datasets[0].data = this.dataGrafica;  // Actualiza los datos
          this.chart.update();  // Redibuja el gráfico con los nuevos datos
        }
        
        this.getUsers();
      }
    });

    return await modal.present();
  }

  // Cerrar el modal
  closeModal() {
    this.modalCtrl.dismiss();
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
    this.showNombre = !this.showNombre;
    this.showImagen = !this.showImagen;
    this.areColumnsVisible = !this.areColumnsVisible;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowField(fieldKey: string): boolean {
    switch (fieldKey) {
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }

  renderChartInventario() {const ctx = document.getElementById('ChartInventario') as HTMLCanvasElement;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.dataGraficaLabels,
        datasets: [
          {
            label: 'Reporte diario',
            data: this.dataGrafica,
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',   // Color para Enero
              'rgba(54, 162, 235, 0.6)',   // Color para Febrero
              'rgba(255, 206, 86, 0.6)',   // Color para Marzo
              'rgba(75, 192, 192, 0.6)',   // Color para Abril
              'rgba(153, 102, 255, 0.6)',  // Color para Mayo
              'rgba(255, 159, 64, 0.6)'    // Color para Junio
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value + ' Toneladas'; // Agregar texto al valor del eje Y
              }
            }
          },
          x: {
            beginAtZero: true
          }
        }
      }
    });
  }

  getUsers() {
    let query = [];
    this.firebaseSvc.getCollectionData('inventario_bodega',query).subscribe((products: ProductBodega[]) => {
      // Transforma los usuarios a la estructura de `data`
      this.data = products.map(product => ({
        id: product.id,
        nombre: product.name,
        stock: (50*product.stock/1000),
        image: product.image
      }));
  
      this.paginatedData = [...this.data]; // Actualiza `paginatedData` con los datos transformados
      this.setPage(1); // Inicia la paginación en la primera página
    });
  }

  getDataGrafica() {
    let query = [];
    this.firebaseSvc.getCollectionData('inventario_bodega', query).subscribe((products: ProductBodega[]) => {
      // Extrae solo el campo 'name' de cada producto y lo guarda en dataGrafica
      this.dataGraficaLabels = products.map(product => product.name);
      this.dataGrafica = products.map(product => (50*product.stock/1000));
  
      this.renderChartInventario();
    });
  }

  getRegistroHoy() {
    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDia = new Date(hoy.setHours(23, 59, 59, 999));
  
    const inicioTimestamp = Timestamp.fromDate(inicioDia);
    const finTimestamp = Timestamp.fromDate(finDia);
  
    const queryConditions = [
      where('fechaAsignacion', '>=', inicioTimestamp),
      where('fechaAsignacion', '<=', finTimestamp),
    ];
  
    this.firebaseSvc.getCollectionData('registro_asignacion', queryConditions).subscribe({
      next: (resultados) => {
        this.isAsignarDisabled = resultados.length > 0; // Desactiva si hay registros hoy
        console.log(
          this.isAsignarDisabled
            ? 'El botón está deshabilitado porque hay registros hoy.'
            : 'El botón está habilitado porque no hay registros hoy.'
        );
      },
      error: (error) => {
        console.error('Error obteniendo registros:', error);
        this.isAsignarDisabled = false; // Por seguridad, habilita el botón en caso de error
      },
    });
  }
}
