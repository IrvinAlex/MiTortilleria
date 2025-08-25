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
  fechaRecoleccion: string = '';
  horaRecoleccion: string = '';
  horaEntrada: string = '09:00';
  horaSalida: string = '20:00';
  horaMinimaInput: string = '09:00';
  horaOpciones: { value: string; label: string; enabled: boolean }[] = [];

  constructor(
    private router: Router,
    private utilsSvc: UtilsService,
    private firebaseSvc: FirebaseService
  ) {}

  ngOnInit() {
    this.setDateLimits();
    this.setDefaultDate();
    this.getCartDetails();
    this.getHorarioTrabajo().then(() => {
      this.generarOpcionesHora();
    });
  }

  async getHorarioTrabajo() {
    try {
      const horarioDoc = await this.firebaseSvc.getDocument('horario/waeYL5UAeC3YyZ8BW3KT');
      if (horarioDoc) {
        this.horaEntrada = horarioDoc['hora_entrada'] || '09:00';
        this.horaSalida = horarioDoc['hora_salida'] || '20:00';
      }
    } catch (err) {
      this.horaEntrada = '09:00';
      this.horaSalida = '20:00';
    }
  }

  setDateLimits() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Asegura formato yyyy-MM-dd
    this.minDate = today.toISOString().slice(0, 10);
    const maxDate = new Date();
    maxDate.setMonth(today.getMonth() + 1);
    maxDate.setHours(23, 59, 59, 999);
    this.maxDate = maxDate.toISOString().slice(0, 10);
  }

  setDefaultDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.fechaRecoleccion = today.toISOString().slice(0, 10);
    this.horaRecoleccion = '';
  }

  onDateOrTimeChange() {
    this.updateHoraMinimaInput();
    this.generarOpcionesHora();
    // Validación mínima de fecha
    if (this.fechaRecoleccion && this.horaRecoleccion) {
      if (!this.isHoraDentroHorario(this.horaRecoleccion)) {
        this.utilsSvc.presentToast({
          message: `La hora debe estar entre ${this.horaMinimaInput} y ${this.horaSalida}`,
          duration: 2500,
          color: 'warning',
          position: 'bottom',
          icon: 'time-outline',
        });
        this.horaRecoleccion = '';
        return;
      }
    }
  }

  generarOpcionesHora() {
    let opciones: { value: string; label: string; enabled: boolean }[] = [];
    if (!this.horaEntrada || !this.horaSalida) {
      this.horaOpciones = [];
      return;
    }
    const [hE, mE] = this.horaEntrada.split(':').map(Number);
    const [hS, mS] = this.horaSalida.split(':').map(Number);

    let hoy = new Date();
    
    let fechaSel: Date | null = null;
    if (this.fechaRecoleccion) {
      fechaSel = new Date(this.fechaRecoleccion);
    }
    let esHoy =
      fechaSel &&
      fechaSel.getFullYear() === hoy.getFullYear() &&
      fechaSel.getMonth() === hoy.getMonth() &&
      fechaSel.getDate() + 1 === hoy.getDate();

    // Si es hoy y ya terminó el horario, deshabilita todas las opciones y muestra toast
    if (esHoy) {
      const nowMinutes = hoy.getHours() * 60 + hoy.getMinutes();
      const salidaMinutes = hS * 60 + mS;
      if (nowMinutes >= salidaMinutes) {
        this.horaOpciones = [];
        this.utilsSvc.presentToast({
          message: 'El horario de hoy ya terminó. Por favor selecciona otro día.',
          duration: 3500,
          color: 'danger',
          position: 'top',
          icon: 'time-outline'
        });
        return;
      }
    }

    let minHour = hE;
    let minMin = mE;
    if (esHoy) {
      const nowHour = hoy.getHours();
      const nowMin = hoy.getMinutes();
      let actualMin = Math.ceil(nowMin / 15) * 15;
      let actualHour = nowHour;
      if (actualMin === 60) { actualHour++; actualMin = 0; }
      if (actualHour < hE || (actualHour === hE && actualMin < mE)) {
        minHour = hE;
        minMin = mE;
      } else {
        minHour = actualHour;
        minMin = actualMin;
      }
    }
    let start = minHour * 60 + minMin;
    let end = hS * 60 + mS;
    for (let min = hE * 60 + mE; min <= end; min += 15) {
      if (esHoy && min < start) continue;
      const hour = Math.floor(min / 60);
      const minute = min % 60;
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = this.formatHoraAMPM(value);
      opciones.push({ value, label, enabled: true });
    }
    this.horaOpciones = opciones;
    if (this.horaRecoleccion && !opciones.find(o => o.value === this.horaRecoleccion)) {
      this.horaRecoleccion = '';
    }
  }

  updateHoraMinimaInput() {
    if (!this.fechaRecoleccion) {
      this.horaMinimaInput = this.horaEntrada;
      return;
    }
    const hoy = new Date();
    const fechaSel = new Date(this.fechaRecoleccion);
    if (
      fechaSel.getFullYear() === hoy.getFullYear() &&
      fechaSel.getMonth() === hoy.getMonth() &&
      fechaSel.getDate() === hoy.getDate()
    ) {
      const nowHour = hoy.getHours();
      const nowMin = hoy.getMinutes();
      const [hE, mE] = this.horaEntrada.split(':').map(Number);
      let minHour = Math.max(hE, nowHour);
      let minMin = minHour === nowHour ? nowMin : mE;
      if (nowHour < hE || (nowHour === hE && nowMin < mE)) {
        minHour = hE;
        minMin = mE;
      }
      this.horaMinimaInput = `${minHour.toString().padStart(2, '0')}:${minMin.toString().padStart(2, '0')}`;
    } else {
      this.horaMinimaInput = this.horaEntrada;
    }
  }

  isHoraDentroHorario(hora: string): boolean {
    if (!hora) return false;
    // Usa el horario de entrada y salida reales, no el mínimo dinámico
    const [h, m] = hora.split(':').map(Number);
    const [hE, mE] = this.horaEntrada.split(':').map(Number);
    const [hS, mS] = this.horaSalida.split(':').map(Number);

    const minutos = h * 60 + m;
    const minutosEntrada = hE * 60 + mE;
    const minutosSalida = hS * 60 + mS;

    return minutos >= minutosEntrada && minutos <= minutosSalida;
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
      else if (this.selectedMethod === 'domicilio') {
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
    if (!this.fechaRecoleccion || !this.horaRecoleccion) return '';
    return `${this.fechaRecoleccion}T${this.horaRecoleccion}:00`;
  }

  // Add helper method to check if selected date is today
  isSelectedDateToday(): boolean {
    if (!this.selectedDate) return false;
    return new Date(this.selectedDate).toDateString() === new Date().toDateString();
  }

  // Add method to get formatted date for display
  getFormattedDateTime(): string {
    if (!this.fechaRecoleccion || !this.horaRecoleccion) return '';

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
    // Calcular el peso total después de cargar los detalles
    this.calculateTotalWeight();
  }

  applyStoredCoupon() {
    if (this.cart) {
      const storedCoupon = this.utilsSvc.getFromLocalStorage('appliedCoupon');
      if (storedCoupon) {
        this.discountAmount = (this.cart.total * storedCoupon['porcentaje']) / 100;
        this.porcentaje = storedCoupon['porcentaje'];
      }
      // Calcular el peso total después de aplicar el cupón
      this.calculateTotalWeight();
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

  formatHoraAMPM(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
}
