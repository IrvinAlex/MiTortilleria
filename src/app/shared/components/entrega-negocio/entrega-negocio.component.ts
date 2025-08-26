import { Component, inject, OnInit } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { EmailService } from 'src/app/services/email.service';

@Component({
  selector: 'app-entrega-negocio',
  templateUrl: './entrega-negocio.component.html',
  styleUrls: ['./entrega-negocio.component.scss'],
})
export class EntregaNegocioComponent implements OnInit {
  selectedPayment: string | null = null;
  confirming: boolean = false;
  paymentConfirmed: boolean = false;
  utilsSvc = inject(UtilsService);
  firebaseSvc = inject(FirebaseService);
  emailSvc = inject(EmailService);
  cart: any;
  discountAmount: number = 0;
  porcentaje: number = 0;
  serviceFee: number = 10; // Cargo de servicio fijo, puedes cambiar el valor

  constructor() {}

  ngOnInit() {
    this.getCartDetails();
    this.applyStoredCoupon();
  }

  private async sendOrderConfirmationEmail(pedidoId: string, orderType: string) {
    try {
      const user = this.utilsSvc.getFromLocalStorage('user');
      const orderData = {
        orderId: pedidoId,
        customerEmail: user.email,
        customerName: user.name || user.email,
        fecha: new Date(),
        estatus: 'Pedido confirmado',
        tipo_pago: orderType,
        items: this.cart.detalle_carrito,
        subtotal: this.cart.total,
        discountAmount: this.cart.total * (this.porcentaje / 100),
        discountPercent: this.porcentaje,
        transportFee: 0, // Sin tarifa de transporte para entrega en negocio
        // serviceFee: this.serviceFee, // Elimina el cargo de servicio del email
        total: this.cart.total - (this.cart.total * (this.porcentaje / 100)) // Solo subtotal menos descuento
      };

      await this.emailSvc.sendOrderConfirmationEmail(orderData);
      console.log('Email de confirmación enviado exitosamente');
    } catch (error) {
      console.error('Error al enviar email de confirmación:', error);
      // No mostrar error al usuario para no interrumpir el flujo
    }
  }

  renderPayPalButton() {
    // Esperar que el contenedor exista
    const paypalButtonContainer = document.getElementById('paypal-button-container');
    if (paypalButtonContainer) {
      (window as any).paypal.Buttons({
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: this.cart.total - (this.cart.total * (this.porcentaje / 100)), // Solo subtotal menos descuento
                },
                shipping_address: {
                  country_code: 'MX'
                }
              },
            ],
            shipping_preference: 'SET_PROVIDED_ADDRESS'
          });
        },
        onApprove: async (data, actions) => {
          return actions.order.capture().then(async (details) => {
            console.log('Pago completado:', details);

            const loading = await this.utilsSvc.loading();
            await loading.present();

            // Validar stock de productos
            let outOfStock = false;
            for (let item of this.cart.detalle_carrito) {
              const product = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}`);
              if (product && product['stock'] < item.cantidad) {
                outOfStock = true;
                break;
              }
            }

            if (outOfStock) {
              loading.dismiss();
              this.utilsSvc.presentToast({
                message: 'Uno o más productos en tu carrito no tienen stock.',
                duration: 2500,
                color: 'danger',
                position: 'bottom',
                icon: 'alert-circle-outline'
              });
              return;
            }

            this.confirming = true;
            setTimeout(() => {
              this.confirming = false;
              this.paymentConfirmed = true;
            }, 3000); // Duración de la animación

            // Asegura que el color vuelva al original después de la animación
            setTimeout(async () => {
              const button = document.querySelector('.confirm-button') as HTMLElement;
              if (button) {
                button.classList.add('complete');
              }

              // Guardar carrito y detalles en localStorage
              const userId = this.utilsSvc.getFromLocalStorage('user').uid;
              const pedido = {
                estatus: 'Pedido confirmado',
                fecha: new Date(),
                fecha_entrega: new Date(),
                pago_confirmado: true,
                tipo_pago: 'Tarjeta',
                total: this.cart.total - (this.cart.total * (this.porcentaje / 100)), // Solo subtotal menos descuento
                // serviceFee: this.serviceFee, // Elimina el cargo de servicio del pedido
                uid_cliente: userId
              };
              const detalle_pedido = this.cart.detalle_carrito.map(item => ({
                cantidad: item.cantidad,
                subtotal: item.subtotal,
                uid_producto: item.uid_producto,
                uid_opcion: item.uid_opcion
              }));
              this.utilsSvc.setElementInLocalstorage('pedido', pedido);
              this.utilsSvc.setElementInLocalstorage('detalle_pedido', detalle_pedido);

              // Eliminar elementos del carrito en Firebase
              const carritoId = this.cart.id;
              for (let item of this.cart.detalle_carrito) {
                await this.firebaseSvc.deleteDocumet(`users/${userId}/carrito/${carritoId}/detalle_carrito/${item.id}`);
                
                // Actualizar stock de productos
                const product = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}`);
                console.log('Producto:', product);
                if (product) {
                  const newStock = product['stock'] - item.cantidad;
                  await this.firebaseSvc.updateDocumet(`productos/${item.uid_producto}`, { stock: newStock });
                }
              }

              // Agregar información a la colección "pedidos"
              const pedidoId = await this.firebaseSvc.addDocument('pedidos', pedido);

              // Agregar detalles del pedido
              for (let item of this.cart.detalle_carrito) {
                await this.firebaseSvc.addDocument(`pedidos/${pedidoId.id}/detalle_pedido`, {
                  cantidad: item.cantidad,
                  subtotal: item.subtotal,
                  uid_producto: item.uid_producto,
                  uid_opcion: item.uid_opcion
                });
              }

              // Enviar email de confirmación
              await this.sendOrderConfirmationEmail(pedidoId.id, 'Tarjeta');

              // Actualizar el carrito en Firebase
              await this.firebaseSvc.updateDocumet(`users/${userId}/carrito/${carritoId}`, { total: 0 });

              // Eliminar elementos del carrito en localStorage
              this.cart.detalle_carrito = [];
              this.cart.total = 0;
              this.utilsSvc.setElementInLocalstorage('carrito', [this.cart]);

              // Eliminar elemento de localstorage
              localStorage.removeItem('selectedMethod');
              loading.dismiss();
              this.utilsSvc.presentToast({
                message: 'Pedido confirmado',
                duration: 2500,
                color: 'primary',
                position: 'bottom',
                icon: 'alert-circle-outline'
              });
              this.paymentConfirmed = false;
              this.utilsSvc.dismissModal(true); // Dismiss the payment modal
              this.utilsSvc.routerLink('/main/confirmacion-pago'); // Navigate to the receipt page
            }, 3000);
          });
        },
        onError: (err) => {
          console.error('Error en el pago:', err);
          alert('Hubo un problema con el pago. Por favor, inténtalo de nuevo.');
        },
      }).render('#paypal-button-container');  // Asegúrate de que el contenedor está presente
    } else {
      console.error('Contenedor #paypal-button-container no encontrado.');
    }
  }

  async onPaymentChange(paymentMethod: string) {
    this.selectedPayment = paymentMethod;
    if (paymentMethod === 'paypal') {
      const loading = await this.utilsSvc.loading();
      await loading.present();
      setTimeout(() => {
        this.renderPayPalButton();
        loading.dismiss();
      }, 1500);
    }
  }

  async confirmPayment() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    // Validar stock de productos
    let outOfStock = false;
    for (let item of this.cart.detalle_carrito) {
      const product = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}`);
      if (product && product['stock'] < item.cantidad) {
        outOfStock = true;
        break;
      }
    }

    if (outOfStock) {
      loading.dismiss();
      this.utilsSvc.presentToast({
        message: 'Uno o más productos en tu carrito no tienen stock.',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
      return;
    }

    this.confirming = true;
    setTimeout(() => {
      this.confirming = false;
      this.paymentConfirmed = true;
    }, 3000); // Duración de la animación

    // Asegura que el color vuelva al original después de la animación
    setTimeout(async () => {
      const button = document.querySelector('.confirm-button') as HTMLElement;
      if (button) {
        button.classList.add('complete');
      }

      // Guardar carrito y detalles en localStorage
      const userId = this.utilsSvc.getFromLocalStorage('user').uid;
      const pedido = {
        estatus: 'Pedido confirmado',
        fecha: new Date(),
        fecha_entrega: new Date(),
        pago_confirmado: false,
        tipo_pago: 'Efectivo',
        total: this.cart.total - (this.cart.total * (this.porcentaje / 100)), // Solo subtotal menos descuento
        // serviceFee: this.serviceFee, // Elimina el cargo de servicio del pedido
        uid_cliente: userId
      };
      const detalle_pedido = this.cart.detalle_carrito.map(item => ({
        cantidad: item.cantidad,
        subtotal: item.subtotal,
        uid_producto: item.uid_producto,
        uid_opcion: item.uid_opcion
      }));
      this.utilsSvc.setElementInLocalstorage('pedido', pedido);
      this.utilsSvc.setElementInLocalstorage('detalle_pedido', detalle_pedido);

      // Eliminar elementos del carrito en Firebase
      const carritoId = this.cart.id;
      for (let item of this.cart.detalle_carrito) {
        await this.firebaseSvc.deleteDocumet(`users/${userId}/carrito/${carritoId}/detalle_carrito/${item.id}`);
        
        // Actualizar stock de productos
        const product = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}`);
        console.log('Producto:', product);
        if (product) {
          const newStock = product['stock'] - item.cantidad;
          await this.firebaseSvc.updateDocumet(`productos/${item.uid_producto}`, { stock: newStock });
        }
      }

      // Agregar información a la colección "pedidos"
      const pedidoId = await this.firebaseSvc.addDocument('pedidos', pedido);

      // Agregar detalles del pedido
      for (let item of this.cart.detalle_carrito) {
        await this.firebaseSvc.addDocument(`pedidos/${pedidoId.id}/detalle_pedido`, {
          cantidad: item.cantidad,
          subtotal: item.subtotal,
          uid_producto: item.uid_producto,
          uid_opcion: item.uid_opcion
        });
      }

      // Enviar email de confirmación
      await this.sendOrderConfirmationEmail(pedidoId.id, 'Efectivo');

      // Actualizar el carrito en Firebase
      await this.firebaseSvc.updateDocumet(`users/${userId}/carrito/${carritoId}`, { total: 0 });

      // Eliminar elementos del carrito en localStorage
      this.cart.detalle_carrito = [];
      this.cart.total = 0;
      this.utilsSvc.setElementInLocalstorage('carrito', [this.cart]);

      // Eliminar elemento de localstorage
      localStorage.removeItem('selectedMethod');
      loading.dismiss();
      this.utilsSvc.presentToast({
        message: 'Pedido confirmado',
        duration: 2500,
        color: 'primary',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
      this.paymentConfirmed = false;
      this.utilsSvc.dismissModal(true); // Dismiss the payment modal
      this.utilsSvc.routerLink('/main/confirmacion-pago');
    }, 3000);
  }

  async getCartDetails() {
    const loading = await this.utilsSvc.loading();
    await loading.present();
    this.cart = this.utilsSvc.getFromLocalStorage('carrito')[0];
    for (let item of this.cart.detalle_carrito) {
      const product = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}`);
      const option = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}/opciones/${item.uid_opcion}`);
      item.producto = product ? product : {};
      item.opcion = option ? option : {};
    }
    loading.dismiss();
  }

  applyStoredCoupon() {
    this.cart = this.utilsSvc.getFromLocalStorage('carrito')[0];
    if (this.cart) {
      const storedCoupon = this.utilsSvc.getFromLocalStorage('appliedCoupon');
      if (storedCoupon) {
        this.discountAmount = (this.cart.total * storedCoupon['porcentaje']) / 100;
        this.porcentaje = storedCoupon['porcentaje'];
        this.cart.total -= this.discountAmount;
      }
      // Elimina la suma del cargo de servicio
      // this.cart.total += this.serviceFee;
    }
  }
}
