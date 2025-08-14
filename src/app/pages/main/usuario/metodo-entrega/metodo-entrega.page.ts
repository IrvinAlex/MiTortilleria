import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsService } from 'src/app/services/utils.service';
import { EntregaDomicilioComponent } from 'src/app/shared/components/entrega-domicilio/entrega-domicilio.component';
import { EntregaNegocioComponent } from 'src/app/shared/components/entrega-negocio/entrega-negocio.component';
import { ConfirmarDireccionComponent } from 'src/app/shared/components/confirmar-direccion/confirmar-direccion.component';

@Component({
  selector: 'app-metodo-entrega',
  templateUrl: './metodo-entrega.page.html',
  styleUrls: ['./metodo-entrega.page.scss'],
})
export class MetodoEntregaPage implements OnInit {

  selectedMethod: string = '';
  cart: any;
  discountAmount: number = 0;
  porcentaje: number = 0;

  constructor(private router: Router, private utilsSvc: UtilsService) { }

  ngOnInit() {
    this.getCartDetails();
    this.applyStoredCoupon();
  }

  onMethodChange(method: string) {
    this.selectedMethod = method;
  }

  async continue() {
    if (this.selectedMethod) {
      // Save the selected method in local storage
      this.utilsSvc.saveInLocalStorage('selectedMethod', this.selectedMethod);
      console.log('Método seleccionado:', this.selectedMethod);
      
      // Navigate to the appropriate page based on the selected method
      if (this.selectedMethod === 'negocio') {
        const success = await this.utilsSvc.presentModal({
          component: EntregaNegocioComponent,
          componentProps: {},
        });
        if (success) {
          this.utilsSvc.dismissModal(true); // Dismiss the method selection modal
        }
        
      } else if (this.selectedMethod === 'domicilio') {
        // Para entrega a domicilio, primero confirmar la dirección
        const addressConfirmed = await this.utilsSvc.presentModal({
          component: ConfirmarDireccionComponent,
          componentProps: {},
        });
        
        if (addressConfirmed) {
          // Si se confirmó la dirección, continuar con el proceso de entrega a domicilio
          const success = await this.utilsSvc.presentModal({
            component: EntregaDomicilioComponent,
            componentProps: {},
          });
          if (success) {
            this.utilsSvc.dismissModal(true); // Dismiss the method selection modal
          }
        }
      }
    }
  }

  getCartDetails() {
    this.cart = this.utilsSvc.getFromLocalStorage('carrito')[0];
  }

  applyStoredCoupon() {
    if (this.cart) {
      const storedCoupon = this.utilsSvc.getFromLocalStorage('appliedCoupon');
      if (storedCoupon) {
        this.discountAmount = (this.cart.total * storedCoupon['porcentaje']) / 100;
        this.porcentaje = storedCoupon['porcentaje'];
      }
    }
  }

  getTotalAmount(): number {
    if (!this.cart) return 0;
    
    if (this.discountAmount > 0) {
      return this.cart.total - this.discountAmount;
    }
    
    return this.cart.total;
  }
}
