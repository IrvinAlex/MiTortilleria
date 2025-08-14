import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddCloseCajaComponent } from 'src/app/shared/components/add-close-caja/add-close-caja.component';
import { AddUpdateUserComponent } from 'src/app/shared/components/add-update-user/add-update-user.component';
import { Corte } from 'src/app/models/corte.model';
import { AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { CloseCajaComponent } from 'src/app/shared/components/close-caja/close-caja.component';

@Component({
  selector: 'app-corte-caja',
  templateUrl: './corte-caja.page.html',
  styleUrls: ['./corte-caja.page.scss'],
})
export class CorteCajaPage implements OnInit {
  corteCaja$: Observable<any[]>; // Para obtener la colección de corte de caja
  corteCajaExiste: boolean = false; // Bandera para habilitar/deshabilitar el botón
  corteCajaHoyExiste: boolean = false; // Bandera para habilitar/deshabilitar el botón de apertura
  corteCajaAbierta: boolean = false; // Bandera para habilitar/deshabilitar el botón de cierre

  data = [];

  isModalOpen = false;
  corteForm: FormGroup;
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

  public showMontoInicio: boolean = false;
  public showMontoFinal: boolean = false;
  public showFecha: boolean = false;
  public showGanancias: boolean = false;
  public showEstatus: boolean = false;

  firebaseSvc = inject(FirebaseService);

  viewMode: 'table' | 'cards' = 'table';

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private firebaseService: FirebaseService,
    private alertController: AlertController
  ) {
    this.setPage(1); // Inicializa en la página 1
    this.corteForm = this.formBuilder.group({
      monto_inicio: [''],
      monto_final: [''],
      fecha: [''],
      ganancias: [''],
      estatus: [''],
    });
  }

  // Helper para comparar solo por día/mes/año
  private isSameDay(dateLike: any): boolean {
    const d = new Date(dateLike);
    const t = new Date();
    return (
      d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
    );
  }

  ngOnInit() {
    this.getCorte();
    this.corteCaja$ = this.firebaseService.obtenerColeccion('corte_caja');
    this.corteCaja$.subscribe(cortes => {
      // Solo considerar registros de HOY que estén ABIERTOS
      this.corteCajaAbierta = cortes.some(corte => 
        corte.estatus === 'Caja aperturada' && this.isSameDay(corte.fecha)
      );
      
      // Verificar si hay alguna caja abierta hoy para deshabilitar apertura
      this.corteCajaHoyExiste = this.corteCajaAbierta;
      
      this.corteCajaExiste = cortes.length > 0;
    });
  }
  
  doRefresh(event) {
    this.corteCaja$ = this.firebaseService.obtenerColeccion('corte_caja');
    this.corteCaja$.subscribe(cortes => {
      // Solo considerar registros de HOY que estén ABIERTOS
      this.corteCajaAbierta = cortes.some(corte => 
        corte.estatus === 'Caja aperturada' && this.isSameDay(corte.fecha)
      );
      
      // Verificar si hay alguna caja abierta hoy para deshabilitar apertura
      this.corteCajaHoyExiste = this.corteCajaAbierta;
      
      this.corteCajaExiste = cortes.length > 0;
      event.target.complete();
    });
  }

  // Definición de campos para facilitar el bucle en el HTML
  fields = [
    { key: 'monto_inicio', label: 'Monto inicial' },
    { key: 'monto_final', label: 'Monto final' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'ganancias', label: 'Ganancias' },
    { key: 'estatus', label: 'Estatus' },
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
  
  async editItem(monto_inicio: number, monto_final: number, uid: string) {
    // Crear un objeto con los parámetros
    const item = {
      monto_inicio: monto_inicio,
      monto_final: monto_final,
      uid: uid
    };
  
    try {
      // Abrir el modal y pasar el objeto 'item' como prop
      const modal = await this.modalCtrl.create({
        component: AddCloseCajaComponent, // Componente hijo
        componentProps: {
          corte: item, // Pasamos el objeto con los parámetros
        },
      });
      
      modal.onDidDismiss().then((result) => {
        if (result.data) {
          const index = this.data.findIndex(d => d.uid === result.data.uid);
          if (index > -1) {
            this.data[index] = result.data; // Actualiza la lista de datos
          }
          this.paginatedData = [...this.data]; // Actualiza la tabla
          this.cdr.detectChanges(); // Detecta los cambios
        }
      });
  
      await modal.present();
    } catch (error) {
      console.error('Error al abrir el modal:', error);
    }
  }

    // Abrir el modal
  async openAddCorteModal() {
    const modal = await this.modalCtrl.create({
      component: AddCloseCajaComponent,
      componentProps: {
        corteForm: this.corteForm
      }
    });

    // Esperar a que el modal se cierre y manejar los datos devueltos
    modal.onDidDismiss().then((result) => {
      if (result.data?.success) { 
        // Habilitar "Cerrar caja" inmediatamente después de aperturar
        this.corteCajaAbierta = true;
        this.corteCajaHoyExiste = true;
        // Recargar los datos
        this.getCorte();
        this.cdr.detectChanges();
      }
    });

    return await modal.present();
  }

  async openUpdateCorteModal(paginatedData: any[]) {
    // Buscar el corte abierto de hoy
    const corteAbierto = this.data.find(item => 
      item.estatus === 'Caja aperturada' && this.isSameDay(new Date())
    );

    if (!corteAbierto) {
      this.utilsSvc.presentToast({
        message: 'No hay una caja abierta para cerrar.',
        duration: 2000,
        color: 'warning',
      });
      return;
    }

    console.log('Corte abierto encontrado:', corteAbierto);
    
    const modal = await this.modalCtrl.create({
      component: AddCloseCajaComponent,
      componentProps: {
        corte: corteAbierto,
      },
    });
  
    modal.onDidDismiss().then((result) => {
      if (result.data?.success) { 
        // Deshabilitar "Cerrar caja" inmediatamente después de cerrar
        this.corteCajaAbierta = false;
        // Permitir apertura nuevamente ya que no hay caja abierta
        this.corteCajaHoyExiste = false;
        // Recargar los datos
        this.getCorte();
        this.cdr.detectChanges();
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
    if (this.corteForm.valid) {
      this.data.push(this.corteForm.value); // Agregar producto a la lista
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.corteForm.reset(); // Resetear el formulario
      this.closeModal(); // Cerrar modal
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Agrega un nuevo producto y cierra el modal
  addProduct() {
    if (this.corteForm.valid) {
      this.data.push(this.corteForm.value);
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.corteForm.reset();
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
    this.showMontoInicio = !this.showMontoInicio;
    this.showMontoFinal = !this.showMontoFinal;
    this.showFecha = !this.showFecha;
    this.showGanancias = !this.showGanancias;
    this.showEstatus = !this.showEstatus;
    this.areColumnsVisible = !this.areColumnsVisible;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowField(fieldKey: string): boolean {
    switch (fieldKey) {
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }

  getCorte() {
    this.firebaseService.obtenerColeccionFecha('corte_caja').subscribe((cortes: Corte[]) => {
      this.data = cortes.map(corte => ({
        uid: corte.uid,
        monto_inicio: parseFloat(corte.monto_inicio?.toString()) || 0,
        monto_final: parseFloat(corte.monto_final?.toString()) || 0,
        fecha: new Intl.DateTimeFormat('es-ES', {
          year: 'numeric',
          month: 'long',
          day: '2-digit',
        }).format(new Date(corte.fecha)),
        ganancias: parseFloat(corte.ganancias?.toString()) || 0,
        estatus: corte.estatus,
      }));
  
      this.paginatedData = [...this.data];
      this.setPage(1);
    });
  }
  
  // Método para asignar permisos según el tipo de usuario
  getPermissions(typeProfile: number): string {
    switch (typeProfile) {
      case 1:
        return 'Super administrador';
      case 2:
        return 'Administrador';
      default:
        return 'cliente';
    }
  }

  // Nuevos métodos para estadísticas
  getTotalGanancias(): number {
    return this.data.reduce((total, item) => {
      const ganancias = typeof item.ganancias === 'string' ? parseFloat(item.ganancias) : item.ganancias;
      return total + (ganancias || 0);
    }, 0);
  }

  getOperacionesHoy(): number {
    return this.data.filter(item => this.isSameDay(item.fecha)).length;
  }

  getEstadoCaja(): string {
    if (this.corteCajaAbierta) return 'Abierta';
    
    // Verificar si hay algún corte cerrado hoy
    const corteCerradoHoy = this.data.some(item => 
      item.estatus === 'Caja cerrada' && this.isSameDay(new Date())
    );
    
    if (corteCerradoHoy) return 'Cerrada';
    return 'Sin operar';
  }

  getStatusClass(estatus: string): string {
    return estatus === 'Caja aperturada' ? 'status-open' : 'status-closed';
  }

  toggleView() {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
  }
}
