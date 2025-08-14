import { Component, OnInit } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { UtilsService } from 'src/app/services/utils.service';
import { FirebaseService } from 'src/app/services/firebase.service';

@Component({
  selector: 'app-recibo-pago',
  templateUrl: './recibo-pago.page.html',
  styleUrls: ['./recibo-pago.page.scss'],
})
export class ReciboPagoPage implements OnInit {
  cart: any;

  constructor(private utilsSvc: UtilsService, private firebaseSvc: FirebaseService) {}

  async ngOnInit() {
    // Register Spanish locale
    registerLocaleData(localeEs);

    this.cart = {
      ...this.utilsSvc.getFromLocalStorage('pedido'),
      detalle_carrito: this.utilsSvc.getFromLocalStorage('detalle_pedido')
    };

    // Fetch product and option names
    for (let item of this.cart.detalle_carrito) {
      const product = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}`);
      const option = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}/opciones/${item.uid_opcion}`);
      item.producto = product ? product : {};
      item.opcion = option ? option : {};
    }

    console.log('Pedido:', this.cart);

    // Remove items from localStorage
    localStorage.removeItem('pedido');
    localStorage.removeItem('detalle_pedido');
    localStorage.removeItem('usedCoupons');
    localStorage.removeItem('appliedCoupon');
  }
}
