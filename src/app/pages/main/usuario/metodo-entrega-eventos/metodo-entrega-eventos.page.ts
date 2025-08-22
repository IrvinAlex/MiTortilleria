import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsService } from 'src/app/services/utils.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { EntregaDomicilioEventosComponent } from 'src/app/shared/components/entrega-domicilio-eventos/entrega-domicilio-eventos.component';
import { EntregaDomicilioComponent } from 'src/app/shared/components/entrega-domicilio/entrega-domicilio.component';
import { EntregaNegocioEventosComponent } from 'src/app/shared/components/entrega-negocio-eventos/entrega-negocio-eventos.component';
import { EntregaNegocioComponent } from 'src/app/shared/components/entrega-negocio/entrega-negocio.component';
import { ConfirmarDireccionComponent } from 'src/app/shared/components/confirmar-direccion/confirmar-direccion.component';

@Component({
  selector: 'app-metodo-entrega-eventos',
  templateUrl: './metodo-entrega-eventos.page.html',
  styleUrls: ['./metodo-entrega-eventos.page.scss'],
})
export class MetodoEntregaEventosPage implements OnInit {

  selectedMethod: string = '';
  selectedDate: string = '';
  selectedTime: string = '';
  cart: any;
  discountAmount: number = 0;
  porcentaje: number = 0;
  minDate: string = '';
  maxDate: string = '';
  
  // Add new properties for delivery validation
  readonly MINIMUM_WEIGHT_FOR_FREE_DELIVERY = 60; // kg
  readonly DELIVERY_FEE = 50; // Cost for delivery under minimum weight
  totalWeight: number = 0;
  deliveryFee: number = 0;
  showMinimumOrderMessage: boolean = false;

  constructor(
    private router: Router, 
    private utilsSvc: UtilsService,
    private firebaseSvc: FirebaseService
  ) { }

  ngOnInit() {
    this.setDateLimits();
    this.setDefaultDate();
    this.getCartDetails();
    this.applyStoredCoupon();
    this.calculateTotalWeight();
  }

  setDateLimits() {
    const today = new Date();
    // Establecer minDate a las 00:00:00 del día actual
    today.setHours(0, 0, 0, 0);
    this.minDate = today.toISOString();

    // Maximum date is 1 month from today (not 6 months)
    const maxDate = new Date();
    maxDate.setMonth(today.getMonth() + 1);
    maxDate.setHours(23, 59, 59, 999); // Fin del día
    this.maxDate = maxDate.toISOString();
  }

  // Add method to get minimum allowed time for today
  getMinTimeForToday(): string | undefined {
    const now = new Date();
    const selectedDate = new Date(this.selectedDate);
    
    // Only set minimum time if selected date is today
    if (selectedDate.toDateString() === now.toDateString()) {
      const minTime = new Date(now);
      minTime.setHours(minTime.getHours() + 2); // Add 2 hours minimum anticipation
      
      // If the calculated min time is before business hours, set to 9 AM
      if (minTime.getHours() < 9) {
        minTime.setHours(9, 0, 0, 0);
      }
      
      // Format time as HH:MM for ion-datetime
      const hours = minTime.getHours().toString().padStart(2, '0');
      const minutes = minTime.getMinutes().toString().padStart(2, '0');
      
      return `${hours}:${minutes}`;
    }
    
    // For future dates, no minimum time restriction (will start from 9 AM by default)
    return undefined;
  }

  setDefaultDate() {
    // Set current date as default
    const today = new Date();
    this.selectedDate = today.toISOString();
    
    // Set default time (current time + 2 hours, minimum anticipation)
    const defaultTime = new Date();
    const minAdvanceHours = 2; // Minimum 2 hours anticipation
    defaultTime.setHours(defaultTime.getHours() + minAdvanceHours);
    
    // If it's past business hours (after 6 PM to allow 2 hours), set to next day 9 AM
    if (defaultTime.getHours() >= 20) {
      const nextAvailableDay = new Date(today);
      nextAvailableDay.setDate(nextAvailableDay.getDate() + 1);
      nextAvailableDay.setHours(9, 0, 0, 0);
      this.selectedDate = nextAvailableDay.toISOString();
      this.selectedTime = nextAvailableDay.toISOString();
    } else {
      // Ensure the time is within business hours
      if (defaultTime.getHours() < 9) {
        defaultTime.setHours(9, 0, 0, 0);
      }
      // Format the time properly for ion-datetime
      const formattedTime = defaultTime.toISOString();
      this.selectedTime = formattedTime;
    }
  }

  onMethodChange(method: string) {
    this.selectedMethod = method;
    this.updateDeliveryFee();
    this.showMinimumOrderMessage = method === 'domicilio' && this.totalWeight < this.MINIMUM_WEIGHT_FOR_FREE_DELIVERY;
  }

  calculateTotalWeight() {
    this.totalWeight = 0;
    if (this.cart && this.cart.detalle_carrito) {
      this.totalWeight = this.cart.detalle_carrito.reduce((total, item) => {
        return total + (item.cantidad || 0);
      }, 0);
    }
  }

  updateDeliveryFee() {
    if (this.selectedMethod === 'domicilio' && this.totalWeight < this.MINIMUM_WEIGHT_FOR_FREE_DELIVERY) {
      this.deliveryFee = this.DELIVERY_FEE;
    } else {
      this.deliveryFee = 0;
    }
  }

  getRemainingWeightForFreeDelivery(): number {
    return Math.max(0, this.MINIMUM_WEIGHT_FOR_FREE_DELIVERY - this.totalWeight);
  }

  isEligibleForFreeDelivery(): boolean {
    return this.totalWeight >= this.MINIMUM_WEIGHT_FOR_FREE_DELIVERY;
  }

  async continue() {
    if (this.selectedMethod && this.selectedDate && this.selectedTime) {
      // Validate selected date is within allowed range
      if (!this.isValidDate()) {
        this.utilsSvc.presentToast({
          message: 'Por favor selecciona una fecha válida (desde hoy hasta 1 mes)',
          duration: 3000,
          color: 'warning',
          position: 'top'
        });
        return;
      }

      // Validate business hours first
      if (!this.isWithinBusinessHours()) {
        this.utilsSvc.presentToast({
          message: 'Horario de atención: Lunes a Domingo de 9:00 AM a 8:00 PM',
          duration: 4000,
          color: 'warning',
          position: 'top'
        });
        return;
      }

      // Validate selected time (including anticipation and past time check)
      if (!this.isValidTime()) {
        const selectedDate = new Date(this.selectedDate);
        const now = new Date();
        
        if (selectedDate.toDateString() === now.toDateString()) {
          this.utilsSvc.presentToast({
            message: 'Para hoy, la hora debe ser al menos 2 horas después de la hora actual',
            duration: 4000,
            color: 'warning',
            position: 'top'
          });
        } else {
          this.utilsSvc.presentToast({
            message: 'Por favor selecciona una hora válida',
            duration: 3000,
            color: 'warning',
            position: 'top'
          });
        }
        return;
      }

      // Combine date and time
      const combinedDateTime = this.combineDateTime();

      // Save the selected method and date in local storage
      this.utilsSvc.saveInLocalStorage('selectedMethod', this.selectedMethod);
      this.cart.fecha_entrega = combinedDateTime;
      this.utilsSvc.saveInLocalStorage('carrito_eventos', [this.cart]);
      
      // Save pickup information to Firebase if method is 'negocio'
      if (this.selectedMethod === 'negocio') {
        await this.savePickupInfoToFirebase(combinedDateTime);
        
        const success = await this.utilsSvc.presentModal({
          component: EntregaNegocioEventosComponent,
          componentProps: {},
        });
        if (success) {
          this.utilsSvc.dismissModal(true);
        }
      }
      else if(this.selectedMethod === 'domicilio') {
        // Para entrega a domicilio, primero confirmar la dirección
        const addressConfirmed = await this.utilsSvc.presentModal({
          component: ConfirmarDireccionComponent,
          componentProps: {},
        });
        
        if (addressConfirmed) {
          // Si se confirmó la dirección, continuar con el proceso de entrega a domicilio
          const success = await this.utilsSvc.presentModal({
            component: EntregaDomicilioEventosComponent,
            componentProps: {},
          });
          if (success) {
            this.utilsSvc.dismissModal(true); // Dismiss the method selection modal
          }
        }
      }
    }
  }

  // Add method to save pickup information to Firebase
  async savePickupInfoToFirebase(pickupDateTime: string) {
    try {
      const userId = this.utilsSvc.getFromLocalStorage('user').uid;
      const carritoId = this.cart.id;
      
      // Update cart in Firebase with pickup information
      await this.firebaseSvc.updateDocumet(`users/${userId}/carrito_eventos/${carritoId}`, {
        metodo_entrega: 'negocio',
        fecha_entrega: pickupDateTime,
        hora_recoleccion: pickupDateTime,
        es_recoleccion_negocio: true,
        updated_at: new Date()
      });

      console.log('Información de recolección guardada en Firebase');
    } catch (error) {
      console.error('Error al guardar información de recolección:', error);
    }
  }

  isValidDate(): boolean {
    if (!this.selectedDate) return false;
    
    const selectedDate = new Date(this.selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const maxAllowedDate = new Date();
    maxAllowedDate.setMonth(today.getMonth() + 1); // 1 month from today
    maxAllowedDate.setHours(23, 59, 59, 999); // End of max day
    
    // Selected date must be today or later, but not more than 1 month
    return selectedDate >= today && selectedDate <= maxAllowedDate;
  }

  isValidTime(): boolean {
    if (!this.selectedTime || !this.selectedDate) return false;
    
    const selectedDate = new Date(this.selectedDate);
    const selectedTime = new Date(this.selectedTime);
    const now = new Date();
    
    // Combine selected date and time
    const combinedDateTime = new Date(selectedDate);
    combinedDateTime.setHours(
      selectedTime.getHours(), 
      selectedTime.getMinutes(), 
      0, // seconds
      0  // milliseconds
    );
    
    // If selected date is today
    if (selectedDate.toDateString() === now.toDateString()) {
      // The selected time must be at least 2 hours from now
      const minAllowedTime = new Date(now);
      minAllowedTime.setHours(minAllowedTime.getHours() + 2);
      
      // Also ensure it's not in the past (even if less than 2 hours)
      const currentTime = new Date(now);
      
      // The combined datetime must be:
      // 1. At least 2 hours from now
      // 2. Not in the past
      // 3. Within business hours
      return combinedDateTime >= minAllowedTime && combinedDateTime > currentTime;
    }
    
    // For future dates, any time within business hours is valid
    return true;
  }

  isWithinBusinessHours(): boolean {
    if (!this.selectedTime) return false;
    
    const selectedTime = new Date(this.selectedTime);
    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    
    // Business hours: 9:00 AM to 8:00 PM (9:00 - 20:00)
    const startHour = 9;  // 9 AM
    const endHour = 22;   // 8 PM
    
    // Convert time to minutes for easier comparison
    const selectedTimeInMinutes = hours * 60 + minutes;
    const startTimeInMinutes = startHour * 60;      // 9:00 AM = 540 minutes
    const endTimeInMinutes = endHour * 60;          // 8:00 PM = 1200 minutes
    
    return selectedTimeInMinutes >= startTimeInMinutes && selectedTimeInMinutes <= endTimeInMinutes;
  }

  combineDateTime(): string {
    const date = new Date(this.selectedDate);
    const time = new Date(this.selectedTime);
    
    // Create new date with selected date and time
    const combinedDate = new Date(date);
    combinedDate.setHours(
      time.getHours(), 
      time.getMinutes(), 
      0, // seconds
      0  // milliseconds
    );
    
    return combinedDate.toISOString();
  }

  // Add helper method to check if selected date is today
  isSelectedDateToday(): boolean {
    if (!this.selectedDate) return false;
    return new Date(this.selectedDate).toDateString() === new Date().toDateString();
  }

  // Add method to get formatted date for display
  getFormattedDateTime(): string {
    if (!this.selectedDate || !this.selectedTime) return '';
    
    const combined = this.combineDateTime();
    const date = new Date(combined);
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCartDetails() {
    this.cart = this.utilsSvc.getFromLocalStorage('carrito_eventos')[0];
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
    
    let total = this.cart.total;
    
    if (this.discountAmount > 0) {
      total = total - this.discountAmount;
    }
    
    // Add delivery fee if applicable
    total = total + this.deliveryFee;
    
    return total;
  }

  onTimeChange(event: any) {
    this.selectedTime = event.detail.value;
    
    // Auto-validate when time changes
    if (this.isSelectedDateToday() && this.selectedTime) {
      const isValid = this.isValidTime();
      const isWithinHours = this.isWithinBusinessHours();
      
      if (!isValid || !isWithinHours) {
        // Show a subtle hint that the time might not be valid
        console.log('Time validation:', { isValid, isWithinHours });
      }
    }
  }
}
