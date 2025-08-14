import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { where } from 'firebase/firestore';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddProductCartEventsComponent } from 'src/app/shared/components/add-product-cart-events/add-product-cart-events.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-carrito-eventos',
  templateUrl: './carrito-eventos.page.html',
  styleUrls: ['./carrito-eventos.page.scss'],
})
export class CarritoEventosPage implements OnInit {
  cart: any;
  cartDetails: any[] = [];
  loading: boolean = false;
  itemAnimations: { [key: string]: boolean } = {};

  constructor(private utilsSvc: UtilsService, private firebaseSvc: FirebaseService, private alertCtrl: AlertController) {}

  ngOnInit() {
    this.getCartDetails();
  }

  doRefresh(event) {
    setTimeout(() => {
      this.getCartDetails();
      event.target.complete();
    }, 1000);
  }

  async getCartDetails() {
    this.cart = [];
    this.cartDetails = [];
    
    this.cart = this.utilsSvc.getFromLocalStorage('carrito_eventos')[0];
    for (let item of this.cart.detalle_carrito) {
      const product = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}`);
      const option = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}/opciones/${item.uid_opcion}`);
      this.cartDetails.push({ ...item, product, option });
    }
    
    this.loading = true;
    setTimeout(async () => {
      this.loading = false;
      
    }, 500);
  }
  
  async editProduct(item: any) { 
    const opcionesPath = `productos/${item.uid_producto}/opciones`; 
    //OBTENER LOS DETALLES DEL CARRITO
    let sub4 = this.firebaseSvc.getCollectionData(opcionesPath, []).subscribe({
      next: async (detalle: any) => {
        if (detalle && detalle.length > 0) { // Aseguramos que 'detalle' tenga datos
          item.product.opciones = detalle;
          item.product.id = item.uid_producto;
          console.log('Opciones del producto:', item.product);
          try {
            // Mostrar el modal y esperar el resultado
            let success = await this.utilsSvc.presentModal({
              component: AddProductCartEventsComponent,
              cssClass: 'app-product-cart-events',
              componentProps: { producto: item.product },
            });
    
            if (success) {
              // Actualizar el carrito con los nuevos detalles
              this.doRefresh({ target: { complete: () => {} } });
              this.utilsSvc.dismissModal(); // Dismiss the first modal opened in carrito
            }
          } catch (error) {
            console.error("Error al presentar el modal:", error);
          }
    
          // Finalmente, nos desuscribimos
          sub4.unsubscribe();
        } else {
          console.warn("El campo 'opciones' no contiene datos válidos.");
          sub4.unsubscribe(); // Incluso si no hay datos, nos desuscribimos
        }
      },
      error: (err: any) => {
        console.error("Error al obtener los datos:", err);
        sub4.unsubscribe();
      }
    });
  }

  async deleteProduct(item: any) {
    // Add deletion animation
    this.itemAnimations[item.id] = true;
    
    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que deseas eliminar este producto del carrito?',
      mode: 'ios',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            this.itemAnimations[item.id] = false;
          }
        },
        {
          text: 'Eliminar',
          handler: async () => {
            // Buscar el índice del producto en el carrito
            const index = this.cartDetails.findIndex(
              (product: any) => product.id === item.id
            );
  
            if (index > -1) {
              // Eliminar el producto del array
              this.cart.detalle_carrito.splice(index, 1);
              this.cartDetails.splice(index, 1);
  
              // Actualizar el total del carrito
              this.cart.total = this.cart.detalle_carrito.reduce((acc, curr) => acc + curr.subtotal, 0);
  
              // Guardar los cambios en el localStorage
              this.utilsSvc.setElementInLocalstorage('carrito_eventos', [this.cart]);
  
              // Eliminar el producto de Firebase
              const userId = this.utilsSvc.getFromLocalStorage('user').uid;
              const carritoId = this.cart.id;
              const detalleCarritoId = item.id;
  
              try {
                await this.firebaseSvc.deleteDocumet(`users/${userId}/carrito_eventos/${carritoId}/detalle_carrito/${detalleCarritoId}`);
                console.log('Producto eliminado de Firebase:', item);
              } catch (error) {
                console.error('Error al eliminar el producto de Firebase:', error);
              }
  
              // Add success animation
              this.utilsSvc.presentToast({
                message: 'Producto eliminado del carrito',
                duration: 2000,
                color: 'success',
                position: 'bottom',
                icon: 'checkmark-circle-outline'
              });
            } else {
              console.error('Producto no encontrado en el carrito');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async continuePurchase() {
    const direccion = this.utilsSvc.getFromLocalStorage('direccion');
    if (!direccion || direccion.length === 0) {
      const alert = await this.alertCtrl.create({
        header: 'Información requerida',
        message: 'Antes de continuar con tu compra, primero debes llenar tu información de ubicación en el menú perfil, opción "Mi dirección".',
        mode: 'ios',
        buttons: [
          {
            text: 'Aceptar',
            role: 'cancel',
          },
        ],
      });
  
      await alert.present();
    } else {
      // Proceed with the purchase
      this.utilsSvc.routerLink('/main/metodo-entrega-eventos');
    }
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
