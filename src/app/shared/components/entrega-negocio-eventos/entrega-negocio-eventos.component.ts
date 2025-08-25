import { Component, inject, OnInit } from '@angular/core';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { EmailService } from 'src/app/services/email.service';

@Component({
  selector: 'app-entrega-negocio-eventos',
  templateUrl: './entrega-negocio-eventos.component.html',
  styleUrls: ['./entrega-negocio-eventos.component.scss'],
})
export class EntregaNegocioEventosComponent  implements OnInit {

  selectedPayment: string | null = null;
  confirming: boolean = false;
  paymentConfirmed: boolean = false;
  utilsSvc = inject(UtilsService);
  firebaseSvc = inject(FirebaseService);
  emailSvc = inject(EmailService);
  cart: any;
  discountAmount: number = 0;
  porcentaje: number = 0;
  readonly MINIMUM_WEIGHT_FOR_FREE_DELIVERY = 60; // kg
  totalWeight: number = 0;

  constructor() {}

  ngOnInit() {
    this.getCartDetails();
    // El cálculo del peso total se debe hacer después de cargar el carrito
    // Se elimina la llamada aquí y se pone después de cargar el carrito
    // this.calculateTotalWeight();
  }

  calculateTotalWeight() {
    this.totalWeight = 0;
    if (this.cart && this.cart.detalle_carrito) {
      this.totalWeight = this.cart.detalle_carrito.reduce((total, item) => {
        return total + (item.cantidad || 0);
      }, 0);
    }
  }

  isEligibleForFreeDelivery(): boolean {
    return this.totalWeight >= this.MINIMUM_WEIGHT_FOR_FREE_DELIVERY;
  }

  getRemainingWeightForFreeDelivery(): number {
    return Math.max(0, this.MINIMUM_WEIGHT_FOR_FREE_DELIVERY - this.totalWeight);
  }

  private async sendOrderConfirmationEmail(pedidoId: string, orderType: string) {
    try {
      const user = this.utilsSvc.getFromLocalStorage('user');
      const orderData = {
        orderId: pedidoId,
        customerEmail: user.email,
        customerName: user.name || user.email,
        fecha: new Date(),
        fechaRecoleccion: new Date(this.cart.fecha_entrega), // Add pickup date
        estatus: 'Pedido confirmado',
        tipo_pago: orderType,
        metodo_entrega: 'negocio', // Specify pickup method
        es_recoleccion_negocio: true, // Flag for business pickup
        items: this.cart.detalle_carrito,
        subtotal: this.cart.total,
        discountAmount: this.cart.total * (this.porcentaje / 100),
        discountPercent: this.porcentaje,
        transportFee: 0, // No transport fee for pickup
        total: this.cart.total - (this.cart.total * (this.porcentaje / 100))
      };

      // Send pickup-specific email instead of regular order confirmation
      await this.emailSvc.sendPickupScheduleEmail(orderData);
      console.log('Email de confirmación de recolección enviado exitosamente');
    } catch (error) {
      console.error('Error al enviar email de confirmación:', error);
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
                  value: this.cart.total-(this.cart.total*(this.porcentaje/100)), // Precio total del pago
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
                fecha_entrega: this.cart.fecha_entrega,
                hora_recoleccion: this.cart.fecha_entrega,
                metodo_entrega: 'negocio',
                es_recoleccion_negocio: true,
                pago_confirmado: true,
                tipo_pago: 'Tarjeta',
                total: this.cart.total-(this.cart.total*(this.porcentaje/100)),
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
                await this.firebaseSvc.deleteDocumet(`users/${userId}/carrito_eventos/${carritoId}/detalle_carrito/${item.id}`);
                
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
              await this.firebaseSvc.updateDocumet(`users/${userId}/carrito_eventos/${carritoId}`, { total: 0 });

              // Eliminar elementos del carrito en localStorage
              this.cart.detalle_carrito = [];
              this.cart.total = 0;
              this.utilsSvc.setElementInLocalstorage('carrito_eventos', [this.cart]);

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
        fecha_entrega: this.cart.fecha_entrega,
        hora_recoleccion: this.cart.fecha_entrega, // Add pickup time
        metodo_entrega: 'negocio', // Add delivery method
        es_recoleccion_negocio: true, // Flag for business pickup
        pago_confirmado: false,
        tipo_pago: 'Efectivo',
        total: this.cart.total-(this.cart.total*(this.porcentaje/100)),
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
        await this.firebaseSvc.deleteDocumet(`users/${userId}/carrito_eventos/${carritoId}/detalle_carrito/${item.id}`);
        
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
      await this.firebaseSvc.updateDocumet(`users/${userId}/carrito_eventos/${carritoId}`, { total: 0 });

      // Eliminar elementos del carrito en localStorage
      this.cart.detalle_carrito = [];
      this.cart.total = 0;
      this.utilsSvc.setElementInLocalstorage('carrito_eventos', [this.cart]);

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
    this.cart = this.utilsSvc.getFromLocalStorage('carrito_eventos')[0];
    for (let item of this.cart.detalle_carrito) {
      const product = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}`);
      const option = await this.firebaseSvc.getDocument(`productos/${item.uid_producto}/opciones/${item.uid_opcion}`);
      item.producto = product ? product : {};
      item.opcion = option ? option : {};
    }
    loading.dismiss();
    // Calcular el peso total después de cargar los detalles
    this.calculateTotalWeight();
  }

  applyStoredCoupon() {
    this.cart = this.utilsSvc.getFromLocalStorage('carrito_eventos')[0];
    if (this.cart) {
      const storedCoupon = this.utilsSvc.getFromLocalStorage('appliedCoupon');
      if (storedCoupon) {
        this.discountAmount = (this.cart.total * storedCoupon['porcentaje']) / 100;
        this.porcentaje = storedCoupon['porcentaje'];
        this.cart.total -= this.discountAmount;
      }
      // Calcular el peso total después de aplicar el cupón
      this.calculateTotalWeight();
    }
  }

}
