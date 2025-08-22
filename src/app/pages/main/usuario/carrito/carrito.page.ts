import { Component, OnInit } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { AddProductCartComponent } from 'src/app/shared/components/add-product-cart/add-product-cart.component';
import { AlertController } from '@ionic/angular';
import { where } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.page.html',
  styleUrls: ['./carrito.page.scss'],
})
export class CarritoPage implements OnInit {
  cart: any;
  cartDetails: any[] = [];
  loading: boolean = false;
  discount: number = 0;
  couponCode: string = '';
  discountAmount: number = 0;
  porcentaje: number = 0;
  isApplyingCoupon: boolean = false;
  itemAnimations: { [key: string]: boolean } = {};

  constructor(private utilsSvc: UtilsService, private firebaseSvc: FirebaseService, private alertCtrl: AlertController) {}

  ngOnInit() {
    const storedCoupon = this.utilsSvc.getFromLocalStorage('appliedCoupon');
    console.log('Cupón almacenado:', storedCoupon);
    if (!storedCoupon) this.discountAmount = 0;;
    
    this.getCartDetails();
    this.applyStoredCoupon();
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
    
    this.cart = this.utilsSvc.getFromLocalStorage('carrito')[0];
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
              component: AddProductCartComponent,
              cssClass: 'app-terms',
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
            const index = this.cart.detalle_carrito.findIndex(
              (product: any) => product.id === item.id || product.uid_producto === item.uid_producto
            );

            if (index > -1) {
              // Eliminar el producto del array
              this.cart.detalle_carrito.splice(index, 1);
              this.cartDetails.splice(index, 1);

              // Actualizar el total del carrito
              this.cart.total = this.cart.detalle_carrito.reduce((acc, curr) => acc + curr.subtotal, 0);

              // Guardar los cambios en el localStorage
              this.utilsSvc.setElementInLocalstorage('carrito', [this.cart]);

              // Eliminar el producto de Firebase
              const userId = this.utilsSvc.getFromLocalStorage('user').uid;
              const carritoId = this.cart.id;
              const detalleCarritoId = item.id;

              try {
                await this.firebaseSvc.deleteDocumet(`users/${userId}/carrito/${carritoId}/detalle_carrito/${detalleCarritoId}`);
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
      this.utilsSvc.routerLink('/main/metodo-entrega');
    }
  }

  applyDiscount() {
    if (this.discount > 0 && this.discount <= 100) {
      const discountAmount = (this.cart.total * (this.discount / 100));
      this.cart.total -= discountAmount;
    }
  }

  applyStoredCoupon() {
    const storedCoupon = this.utilsSvc.getFromLocalStorage('appliedCoupon');
    if (storedCoupon) {
      // Always recalculate discountAmount based on current cart total
      this.discountAmount = (this.cart.total * (storedCoupon['porcentaje'] / 100));
      this.porcentaje = storedCoupon['porcentaje'];
    }
  }

  async applyCoupon() {
    if (this.isApplyingCoupon) return;
    
    this.isApplyingCoupon = true;
    
    const userId = this.utilsSvc.getFromLocalStorage('user').uid;
    const usedCoupons = this.utilsSvc.getFromLocalStorage('usedCoupons') || [];
    
    if (usedCoupons.includes(this.couponCode)) {
      this.utilsSvc.presentToast({
        message: 'Este cupón ya ha sido aplicado',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
      this.isApplyingCoupon = false;
      return;
    }
  
    const couponQuery = this.firebaseSvc.getCollectionData('cupones', [where('codigo', '==', this.couponCode)]);
  
    couponQuery.subscribe(async (coupons) => {
      if (coupons.length > 0) {
        const coupon = coupons[0];
        const userOrders = await firstValueFrom(this.firebaseSvc.getCollectionData(`pedidos`, [where('uid_cliente', '==', userId)]));
        const orderCount = userOrders.length;
        console.log('Número de compras:', orderCount);
  
        if (orderCount >= coupon['numero_compras']) {
          // Always recalculate discountAmount based on current cart total
          this.discountAmount = (this.cart.total * (coupon['porcentaje']/100)) ;
          this.porcentaje = coupon['porcentaje'];
          usedCoupons.push(this.couponCode);
          usedCoupons.push(this.porcentaje);
          this.utilsSvc.setElementInLocalstorage('usedCoupons', usedCoupons);
          this.utilsSvc.setElementInLocalstorage('appliedCoupon', coupon);
          this.utilsSvc.presentToast({
            message: 'Cupón aplicado con éxito',
            duration: 2500,
            color: 'primary',
            position: 'bottom',
            icon: 'checkmark-circle-outline'
          });
        } else {
          this.utilsSvc.presentToast({
            message: 'No cumples con los requisitos para aplicar este cupón',
            duration: 2500,
            color: 'danger',
            position: 'bottom',
            icon: 'alert-circle-outline'
          });
        }
      } else {
        this.utilsSvc.presentToast({
          message: 'Cupón no válido',
          duration: 2500,
          color: 'danger',
          position: 'bottom',
          icon: 'alert-circle-outline'
        });
      }
      this.isApplyingCoupon = false;
    });
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
