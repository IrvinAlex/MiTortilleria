import { Component, inject, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Product } from 'src/app/models/product.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';
import { orderBy, where } from 'firebase/firestore';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  firebaseSvc = inject(FirebaseService);  // Servicio para interactuar con Firebase
  utilSvc = inject(UtilsService);  // Servicio utilitario para funciones comunes

  products: Product[] = [];  // Lista de productos a mostrar
  loading: boolean = false;  // Bandera que indica si los productos están siendo cargados

  ngOnInit() {
    // Método de inicialización, puedes poner lógica aquí si es necesario
  }

  // Función que obtiene los datos del usuario desde el almacenamiento local
  user(): User {
    return this.utilSvc.getFromLocalStorage('user');
  }

  // Método que se ejecuta cuando la vista está a punto de entrar
  ionViewWillEnter() {
    // Aquí podrías llamar a `getproducts()` si deseas cargar los productos al entrar en la vista
    //this.getproducts();
  }

  // Método que se ejecuta cuando se hace un "pull to refresh" en la lista de productos
  doRefresh(event) {
    setTimeout(() => {
      this.getproducts();  // Recarga los productos
      event.target.complete();  // Completa el evento de refresh
    }, 1000);  // Retraso de 1 segundo
  }

  //========== Obtener Ganancias ===========

  // Función que calcula las ganancias totales de los productos
  getProfits() {
    return this.products.reduce((index, product) => index + product.price * product.soldUnits, 0);
  }

  //========== Obtener Productos ===========

  // Función que obtiene los productos de Firebase
  getproducts() {
    let path = `users/${this.user().uid}/products`;  // Ruta de los productos del usuario en Firebase

    this.loading = true;  // Establece la bandera de carga a true mientras se obtienen los productos
    let query = [
      orderBy('soldUnits', 'desc'),  // Ordena los productos por unidades vendidas en orden descendente
      // where('soldUnits', '>', 30)  // Puedes agregar filtros si lo necesitas
    ];

    // Se suscribe a los datos de los productos en Firebase
    let sub = this.firebaseSvc.getCollectionData(path, query).subscribe({
      next: (res: any) => {
        this.products = res;  // Asigna los productos a la propiedad `products`
        this.loading = false;  // Establece la bandera de carga a false cuando los productos se han cargado
        sub.unsubscribe();  // Des-suscribe después de obtener los datos
      }
    });
  }

  //========== Agregar o Actualizar producto ===========

  // Función para agregar o actualizar un producto
  async addUpdateProduct(product?: Product) {
    let success = await this.utilSvc.presentModal({
      component: AddUpdateProductComponent,  // Componente que se presenta en el modal
      cssClass: 'add-update-modal',  // Clase CSS personalizada para el modal
      componentProps: { product }  // Pasa el producto como propiedad al modal
    });

    if (success) this.getproducts();  // Si la operación fue exitosa, recarga los productos
  }

  // Función para confirmar la eliminación de un producto
  async confirmDeleteProduct(product: Product) {
    const alert = await this.utilSvc.presentAlert({
      header: 'Eliminar Producto',  // Título del alert
      message: '¿Quieres eliminar este producto?',  // Mensaje del alert
      mode: 'ios',  // Estilo del alert (iOS en este caso)
      buttons: [
        {
          text: 'Cancelar'  // Botón de cancelar
        }, {
          text: 'Confirmar',  // Botón de confirmar
          handler: () => {
            this.deleteProduct(product);  // Llama a la función para eliminar el producto
          }
        }
      ]
    });
  }

  //========== Eliminar producto ===========

  // Función para eliminar un producto
  async deleteProduct(product: Product) {
    let path = `users/${this.user().uid}/products/${product.id}`;  // Ruta del producto a eliminar
    const loading = await this.utilSvc.loading();  // Muestra un loading mientras se elimina el producto
    await loading.present();

    // Obtiene la ruta de la imagen asociada al producto
    let imagePath = await this.firebaseSvc.getFilePath(product.image);

    // Elimina el archivo de imagen asociado al producto
    await this.firebaseSvc.deleteFile(imagePath);

    // Elimina el producto del documento en Firebase
    this.firebaseSvc.deleteDocumet(path).then(async res => {

      // Filtra el producto eliminado de la lista de productos
      this.products = this.products.filter(p => p.id !== product.id);

      // Muestra un mensaje de éxito
      this.utilSvc.presentToast({
        message: `Producto eliminado exitosamente`,
        duration: 1500,  // Duración del toast
        color: 'success',  // Color del toast
        position: 'middle',  // Posición del toast
        icon: 'checkmark-circle-outline'  // Icono del toast
      });

    }).catch(error => {
      // Si ocurre un error, muestra un mensaje de error
      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,  // Duración del toast de error
        color: 'primary',  // Color del toast de error
        position: 'middle',  // Posición del toast de error
        icon: 'alert-circle-outline'  // Icono del toast de error
      });
    }).finally(() => {
      loading.dismiss();  // Finaliza el loading
    });
  }

}