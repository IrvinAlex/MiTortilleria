import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';
import { AddUpdateUserComponent } from 'src/app/shared/components/add-update-user/add-update-user.component';
import { User } from 'src/app/models/user.model';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-administracion',
  templateUrl: './administracion.page.html',
  styleUrls: ['./administracion.page.scss'],
})
export class AdministracionPage implements OnInit {

  data = [];


  isModalOpen = false;
  userForm: FormGroup;
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

  public showNombre: boolean = false;
  public showTipoUsuario: boolean = false;
  public showApellidoPaterno: boolean = false;
  public showApellidoMaterno: boolean = false;
  public showEmail: boolean = false;
  public showImage: boolean = false;

  firebaseSvc = inject(FirebaseService);

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private firebaseService: FirebaseService,
    private alertController: AlertController
  ) {
    this.setPage(1); // Inicializa en la página 1
    this.userForm = this.formBuilder.group({
      name: [''],
      father_Last_Name: [''],
      mother_Last_Name: [''],
      email: [''],
      image: [''],
      type_profile: [''],
      password_Change: ['']
    });
  }

  ngOnInit() {
    this.getUsers();
  }
  doRefresh(event) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Definición de campos para facilitar el bucle en el HTML
  fields = [
    { key: 'name', label: 'Nombre' },
    { key: 'father_Last_Name', label: 'Apellido paterno' },
    { key: 'mother_Last_Name', label: 'Apellido materno' },
    { key: 'type_profile', label: 'Tipo de usuario' },
    { key: 'email', label: 'Correo' },
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
  deleteItem(item: any) {
    if (item.type_profile !== 'cliente') {
      this.utilsSvc.presentToast({
        message: 'Solo se pueden eliminar clientes de perfil 3.',
        duration: 2000,
        color: 'warning',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
      return;
    }
    this.presentConfirmDeleteAlert(item);
  }


  // Método para mostrar la alerta de confirmación
  async presentConfirmDeleteAlert(item: any) {
    const alert = await this.alertController.create({
      header: 'Confirmación',
      message: `¿Estás seguro de que deseas eliminar al usuario ${item.name}?`,
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
      const path = `users/${item.uid}`;  // Ruta del documento en Firestore
      this.firebaseSvc.deleteDocumet(path)
        .then(() => {
          this.utilsSvc.presentToast({
            message: 'Usuario eliminado exitosamente.',
            duration: 1500,
            color: 'success',
            position: 'middle',
            icon: 'checkmark-circle-outline',
          });
          console.log("Documento eliminado de Firestore");
        })
        .catch(error => {
          this.utilsSvc.presentToast({
            message: 'Error al eliminar el usuario.',
            duration: 2500,
            color: 'danger',
            position: 'middle',
            icon: 'alert-circle-outline',
          });
          console.error("Error al eliminar el documento: ", error);
        });
    } else {
      this.utilsSvc.presentToast({
        message: 'Usuario no encontrado en la lista.',
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
        component: AddUpdateUserComponent, // Componente correcto
        componentProps: {
          user: item, // Pasamos los datos del usuario al modal
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
  async openAddUserModal() {
    const modal = await this.modalCtrl.create({
      component: AddUpdateUserComponent,
      componentProps: {
        userForm: this.userForm
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
    if (this.userForm.valid) {
      this.data.push(this.userForm.value); // Agregar producto a la lista
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.userForm.reset(); // Resetear el formulario
      this.closeModal(); // Cerrar modal
      this.cdr.detectChanges(); // Aseguramos que los cambios se detecten
    }
  }

  // Agrega un nuevo producto y cierra el modal
  addProduct() {
    if (this.userForm.valid) {
      this.data.push(this.userForm.value);
      this.paginatedData = [...this.data]; // Actualizamos la lista filtrada
      this.userForm.reset();
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
    this.showNombre = !this.showNombre;
    this.showApellidoPaterno = !this.showApellidoPaterno;
    this.showApellidoMaterno = !this.showApellidoMaterno;
    this.showEmail = !this.showEmail;
    this.showTipoUsuario = !this.showTipoUsuario;
    this.showImage = !this.showImage;
    this.areColumnsVisible = !this.areColumnsVisible;
  }

  // Método para verificar si se debe mostrar un campo
  shouldShowField(fieldKey: string): boolean {
    switch (fieldKey) {
      case 'image':
        return this.showImage;
      case 'email':
        return this.showEmail;
      default:
        return true; // Siempre mostrar el campo "nombre" y "acciones"
    }
  }

  getUsers() {
    this.firebaseService.obtenerColeccion('users').subscribe((users: User[]) => {
      // Transforma los usuarios a la estructura de `data`
      this.data = users.map(user => ({
        uid: user.uid,
        name: user.name,
        father_Last_Name: user.father_Last_Name,
        mother_Last_Name: user.mother_Last_Name,
        email: user.email,
        type_profile: this.getPermissions(user.type_profile),
        image: user.image,
        password_Change: user.password_Change
      }));


      this.paginatedData = [...this.data]; // Actualiza `paginatedData` con los datos transformados
      this.setPage(1); // Inicia la paginación en la primera página
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


}
