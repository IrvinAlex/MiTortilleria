import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsService } from 'src/app/services/utils.service';
import { EntregaDomicilioNegocioComponent } from 'src/app/shared/components/entrega-domicilio-negocio/entrega-domicilio-negocio.component';
import { EntregaNegocioNegocioComponent } from 'src/app/shared/components/entrega-negocio-negocio/entrega-negocio-negocio.component';
import { ConfirmarDireccionComponent } from 'src/app/shared/components/confirmar-direccion/confirmar-direccion.component';
import { FirebaseService } from 'src/app/services/firebase.service';

@Component({
  selector: 'app-metodo-entrega-negocio',
  templateUrl: './metodo-entrega-negocio.page.html',
  styleUrls: ['./metodo-entrega-negocio.page.scss'],
})
export class MetodoEntregaNegocioPage implements OnInit {

  selectedMethod: string = '';
  cart: any;
  discountAmount: number = 0;
  porcentaje: number = 0;
  minDate: string = '';
  fechaRecoleccion: string = '';
  horaRecoleccion: string = '';
  horaEntrada: string = '09:00';
  horaSalida: string = '20:00';
  horaMinimaInput: string = '09:00';
  horaOpciones: { value: string, label: string, enabled: boolean }[] = [];
  firebaseSvc = inject(FirebaseService);

  constructor(private router: Router, private utilsSvc: UtilsService) { 
    // Initialize selectedDate with today's date
    // this.selectedDate = new Date().toISOString();
    // Initialize selectedTime with current time
    // this.selectedTime = new Date().toISOString();
  }

  ngOnInit() {
    this.getCartDetails();
    this.applyStoredCoupon();
    this.setDefaultDate();
    this.getHorarioTrabajo().then(() => {
      this.generarOpcionesHora();
    });
  }

  async getHorarioTrabajo() {
    try {
      // Trae los datos de Firebase
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

  setDefaultDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.minDate = today.toISOString().slice(0, 10);
    this.fechaRecoleccion = this.minDate;
    this.horaRecoleccion = '';
  }

  onMethodChange(method: string) {
    this.selectedMethod = method;
  }

  onDateOrTimeChange() {
    this.updateHoraMinimaInput();
    this.generarOpcionesHora();
    if (this.fechaRecoleccion && this.horaRecoleccion) {
      if (!this.isHoraDentroHorario(this.horaRecoleccion)) {
        this.utilsSvc.presentToast({
          message: `La hora debe estar entre ${this.horaMinimaInput} y ${this.horaSalida}`,
          duration: 2500,
          color: 'warning',
          position: 'bottom',
          icon: 'time-outline'
        });
        this.horaRecoleccion = '';
        return;
      }
    }
  }

  async continue() {
    if (this.selectedMethod && this.fechaRecoleccion && this.horaRecoleccion) {
      // Verifica el valor antes de guardar
      console.log('Fecha seleccionada por el usuario:', this.fechaRecoleccion);
      console.log('Hora seleccionada por el usuario:', this.horaRecoleccion);
      // Combina fecha y hora en formato ISO y guarda solo en fecha_entrega
      this.cart.fecha_entrega = `${this.fechaRecoleccion}T${this.horaRecoleccion}:00`;
      // Elimina hora_entrega si existe
      if (this.cart.hora_entrega) delete this.cart.hora_entrega;
      this.utilsSvc.saveInLocalStorage('selectedMethod', this.selectedMethod);
      this.utilsSvc.saveInLocalStorage('carrito_negocio', [this.cart]);
      console.log('Método seleccionado:', this.selectedMethod);
      
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

  generarOpcionesHora() {
    let opciones: { value: string, label: string, enabled: boolean }[] = [];
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
    let esHoy = fechaSel &&
      fechaSel.getFullYear() === hoy.getFullYear() &&
      fechaSel.getMonth() === hoy.getMonth() &&
      fechaSel.getDate()+1 === hoy.getDate();
    console.log('esHoy:', esHoy);

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

  combineDateTime(): string {
    if (!this.fechaRecoleccion || !this.horaRecoleccion) return '';
    return `${this.fechaRecoleccion}T${this.horaRecoleccion}:00`;
  }

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

  formatHoraAMPM(hora: string): string {
    if (!hora) return '';
    const [h, m] = hora.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
}
