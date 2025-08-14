import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsService } from 'src/app/services/utils.service';
import { EntregaDomicilioNegocioComponent } from 'src/app/shared/components/entrega-domicilio-negocio/entrega-domicilio-negocio.component';
import { EntregaNegocioNegocioComponent } from 'src/app/shared/components/entrega-negocio-negocio/entrega-negocio-negocio.component';
import { ConfirmarDireccionComponent } from 'src/app/shared/components/confirmar-direccion/confirmar-direccion.component';

@Component({
  selector: 'app-metodo-entrega-negocio',
  templateUrl: './metodo-entrega-negocio.page.html',
  styleUrls: ['./metodo-entrega-negocio.page.scss'],
})
export class MetodoEntregaNegocioPage implements OnInit {

  selectedMethod: string = '';
  selectedDate: string = '';
  selectedTime: string = '';
  cart: any;
  discountAmount: number = 0;
  porcentaje: number = 0;
  minDate: string = new Date().toISOString();

  constructor(private router: Router, private utilsSvc: UtilsService) { 
    // Initialize selectedDate with today's date
    this.selectedDate = new Date().toISOString();
    // Initialize selectedTime with current time
    this.selectedTime = new Date().toISOString();
  }

  ngOnInit() {
    this.getCartDetails();
    this.applyStoredCoupon();
  }

  onMethodChange(method: string) {
    this.selectedMethod = method;
  }

  async continue() {
    if (this.selectedMethod && this.selectedDate && this.selectedTime) {
      // Save the selected method, date and time in local storage
      this.utilsSvc.saveInLocalStorage('selectedMethod', this.selectedMethod);
      this.cart.fecha_entrega = this.selectedDate;
      this.cart.hora_entrega = this.selectedTime;
      this.utilsSvc.saveInLocalStorage('carrito_negocio', [this.cart]);
      console.log('Método seleccionado:', this.selectedMethod);
      console.log('Fecha seleccionada:', this.selectedDate);
      console.log('Hora seleccionada:', this.selectedTime);
      console.log('Carrito:', this.cart);
      
      // Navigate to the appropriate page based on the selected method
      if (this.selectedMethod === 'negocio') {
        const success = await this.utilsSvc.presentModal({
          component: EntregaNegocioNegocioComponent,
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
            component: EntregaDomicilioNegocioComponent,
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
    this.cart = this.utilsSvc.getFromLocalStorage('carrito_negocio')[0];
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
