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
  cart: any;
  discountAmount: number = 0;
  porcentaje: number = 0;
  minDate: string = '';
  maxDate: string = '';
  fechaRecoleccion: string = '';
  horaRecoleccion: string = '';
  horaEntrada: string = '09:00';
  horaSalida: string = '20:00';
  horaMinimaInput: string = '09:00';
  horaOpciones: { value: string; label: string; enabled: boolean }[] = [];

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
    if (this.selectedMethod && this.fechaRecoleccion && this.horaRecoleccion) {
      // Validación de fecha y hora
      if (!this.isValidDate()) {
        this.utilsSvc.presentToast({
          message: 'Por favor selecciona una fecha válida (desde hoy hasta 1 mes)',
          duration: 3000,
          color: 'warning',
          position: 'top'
        });
        return;
      }

      if (!this.isHoraDentroHorario(this.horaRecoleccion)) {
        this.utilsSvc.presentToast({
          message: 'Horario de atención: Lunes a Domingo de 9:00 AM a 8:00 PM',
          duration: 4000,
          color: 'warning',
          position: 'top'
        });
        return;
      }

      // Combina fecha y hora
      const combinedDateTime = this.combineDateTime();

      // Guarda en localStorage
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
    if (!this.fechaRecoleccion) return false;
    const selectedDate = new Date(this.fechaRecoleccion);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxAllowedDate = new Date();
    maxAllowedDate.setMonth(today.getMonth() + 1);
    maxAllowedDate.setHours(23, 59, 59, 999);
    return selectedDate >= today && selectedDate <= maxAllowedDate;
  }

  isValidTime(): boolean {
    if (!this.horaRecoleccion || !this.fechaRecoleccion) return false;

    const selectedDate = new Date(this.fechaRecoleccion);
    const [h, m] = this.horaRecoleccion.split(':').map(Number);
    const now = new Date();

    // Combina fecha y hora
    const combinedDateTime = new Date(selectedDate);
    combinedDateTime.setHours(h, m, 0, 0);

    // Si la fecha seleccionada es hoy
    if (selectedDate.toDateString() === now.toDateString()) {
      const minAllowedTime = new Date(now);
      minAllowedTime.setHours(minAllowedTime.getHours() + 2);
      return combinedDateTime >= minAllowedTime && combinedDateTime > now;
    }

    // Para fechas futuras, cualquier hora dentro del horario es válida
    return true;
  }

  isWithinBusinessHours(): boolean {
    if (!this.horaRecoleccion) return false;
    const [h, m] = this.horaRecoleccion.split(':').map(Number);
    const startHour = 9;
    const endHour = 20;
    return h >= startHour && h < endHour;
  }

  combineDateTime(): string {
    if (!this.fechaRecoleccion || !this.horaRecoleccion) return '';
    return `${this.fechaRecoleccion}T${this.horaRecoleccion}:00`;
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

  formatHoraAMPM(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
}