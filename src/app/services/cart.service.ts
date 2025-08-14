import { inject, Injectable } from '@angular/core';
import { UtilsService } from './utils.service';
import { FirebaseService } from './firebase.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private cart: any = { total: 0, detalle_carrito: [] };
  utilsSvc = inject(UtilsService);
  firebaseSvc = inject(FirebaseService);

  user(): User {
    return this.utilsSvc.getFromLocalStorage('user');
  }

  async addToCart(total: number, detalle_carrito: any) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    let carrito = this.utilsSvc.getFromLocalStorage('carrito');
    console.log("--------------------------");
    console.log('Carrito antes de agregar:', carrito);
    if (!carrito[0] || typeof carrito[0] !== 'object') {
      carrito[0] = { id: this.firebaseSvc.firestore.createId(), total: 0, detalle_carrito: [] };
    }

    total = isNaN(total) ? 0 : total;
    carrito[0].total = isNaN(carrito[0].total) ? 0 : carrito[0].total;
    carrito[0].total += total;
    if (!Array.isArray(carrito[0].detalle_carrito)) {
      carrito[0].detalle_carrito = [];
    }
    const detalleCarritoId = this.firebaseSvc.firestore.createId();
    detalle_carrito.id = detalleCarritoId;
    carrito[0].detalle_carrito.push(detalle_carrito);
    this.utilsSvc.setElementInLocalstorage('carrito', carrito);

    const userId = this.user().uid;
    const carritoId = carrito[0].id;

    try {
      await this.firebaseSvc.setDocument(`users/${userId}/carrito/${carritoId}/detalle_carrito/${detalleCarritoId}`, detalle_carrito);
      await this.firebaseSvc.updateDocumet(`users/${userId}/carrito/${carritoId}`, { total: carrito[0].total });
      console.log('Carrito actualizado en Firebase:', carrito);
    } catch (error) {
      console.error('Error al actualizar el carrito en Firebase:', error);
    } finally {
      await loading.dismiss();
    }
  }

  async updateProductInCart(productId: string, cantidad: number, subtotal: number) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    let carrito = this.utilsSvc.getFromLocalStorage('carrito');
    if (carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      const productIndex = carrito[0].detalle_carrito.findIndex((item: any) => item.uid_producto === productId);
      if (productIndex !== -1) {
        const oldSubtotal = carrito[0].detalle_carrito[productIndex].subtotal;
        carrito[0].detalle_carrito[productIndex].cantidad = cantidad;
        carrito[0].detalle_carrito[productIndex].subtotal = subtotal;
        carrito[0].total = carrito[0].total - oldSubtotal + subtotal;
        this.utilsSvc.setElementInLocalstorage('carrito', carrito);

        const userId = this.user().uid;
        const carritoId = carrito[0].id;
        const detalleCarritoId = carrito[0].detalle_carrito[productIndex].id;

        try {
          await this.firebaseSvc.updateDocumet(`users/${userId}/carrito/${carritoId}`, {
            total: carrito[0].total,
          });
          await this.firebaseSvc.updateDocumet(`users/${userId}/carrito/${carritoId}/detalle_carrito/${detalleCarritoId}`, {
            cantidad,
            subtotal,
          });
          console.log('Producto actualizado en Firebase:', carrito);
        } catch (error) {
          console.error('Error al actualizar el producto en Firebase:', error);
        } finally {
          await loading.dismiss();
        }
      }
    }
  }

  getCart() {
    return this.cart;
  }
}
