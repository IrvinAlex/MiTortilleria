import { Component, ElementRef, inject, Input, OnInit, ViewChild, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { interval, Subscription } from 'rxjs';

// Interfaz para la clasificación de demanda
interface DemandLevel {
  level: string;
  minTime: number;
  maxTime: number;
  color: string;
  description: string;
}

@Component({
  selector: 'app-assign-horary',
  templateUrl: './assign-horary.component.html',
  styleUrls: ['./assign-horary.component.scss'],
})
export class AssignHoraryComponent implements OnInit, OnDestroy {
  @Input() pedido: any;
  fechaHoraRecoleccion: string = '';
  fechaRecoleccion: string = ''; // Nueva propiedad para la fecha
  horaRecoleccion: string = '';  // Nueva propiedad para la hora
  fechaMinima: string = '';
  fechaMaxima: string = '';

  // Propiedades actualizadas para el nuevo sistema
  currentTime: Date = new Date();
  currentDemandLevel: DemandLevel;
  estimatedTime: string = '1-3 min';
  autoAssignedTime: string = ''; // Nueva propiedad para la hora asignada automáticamente
  countdown: number = 5;
  isCountdownActive: boolean = false;
  isAssigned: boolean = false;
  timeSubscription: Subscription;
  countdownSubscription: Subscription;

  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  // Configuración de niveles de demanda
  private demandLevels: { [key: string]: DemandLevel } = {
    'baja': { level: 'baja', minTime: 1, maxTime: 3, color: 'success', description: '¡Súper rápido!' },
    'normal': { level: 'normal', minTime: 2, maxTime: 4, color: 'success', description: 'Entrega express' },
    'moderada': { level: 'moderada', minTime: 3, maxTime: 5, color: 'primary', description: 'Preparando tu pedido' },
    'media': { level: 'media', minTime: 4, maxTime: 6, color: 'primary', description: 'Flujo activo' },
    'alta': { level: 'alta', minTime: 6, maxTime: 8, color: 'warning', description: 'Hora pico' },
    'mediaalta': { level: 'mediaalta', minTime: 8, maxTime: 10, color: 'warning', description: 'Muy ocupados' },
    'irregular': { level: 'irregular', minTime: 10, maxTime: 15, color: 'danger', description: 'Demanda impredecible' }
  };

  constructor() { }

  @ViewChild('sliderButton', { static: false }) sliderButton!: ElementRef;
  sliderValue: number = 0;
  showAnimation: boolean = false;

  // Nueva propiedad para el horario de trabajo
  horaEntrada: string = '07:00'; // Valor por defecto
  horaSalida: string = '20:00';  // Valor por defecto
  horaMinimaInput: string = '07:00'; // Nuevo: mínimo dinámico para input de hora
  horaOpciones: { value: string, label: string, enabled: boolean }[] = [];

  ngOnInit() {
    this.setFechaMinima();
    this.initializeDatetime();
    this.initializeTimeSystem();
    this.getHorarioTrabajo();
    this.startAutoAssignment();
    this.generarOpcionesHora(); // Inicializa opciones al cargar
  }

  async getHorarioTrabajo() {
    try {
      const horarioDoc = await this.firebaseSvc.getDocument('horario/waeYL5UAeC3YyZ8BW3KT');
      if (horarioDoc) {
        this.horaEntrada = horarioDoc['hora_entrada'] || '07:00';
        this.horaSalida = horarioDoc['hora_salida'] || '20:00';
      }
      this.generarOpcionesHora(); // Actualiza opciones cuando se obtiene el horario
    } catch (err) {
      this.horaEntrada = '07:00';
      this.horaSalida = '20:00';
      this.generarOpcionesHora();
    }
  }

  ngOnDestroy() {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  formatForIonDatetime(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const tzOffset = -date.getTimezoneOffset();
    const sign = tzOffset >= 0 ? '+' : '-';
    const offsetHours = pad(Math.floor(Math.abs(tzOffset) / 60));
    const offsetMinutes = pad(Math.abs(tzOffset) % 60);

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
  }

  setFechaMinima() {
    const now = new Date();
    this.fechaMinima = this.formatForIonDatetime(now);

    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + 7);
    this.fechaMaxima = this.formatForIonDatetime(maxDate);

    console.log("min:", this.fechaMinima);
    console.log("max:", this.fechaMaxima);
  }

  initializeDatetime() {
    // No asignar fecha/hora por defecto, dejar vacío para que el usuario elija
    this.fechaHoraRecoleccion = '';
    this.fechaRecoleccion = '';
    this.horaRecoleccion = '';
  }

  initializeTimeSystem() {
    this.timeSubscription = interval(60000).subscribe(() => {
      this.currentTime = new Date();
      this.updateDemandLevel();
      this.updateAutoAssignedTime(); // Actualizar hora asignada automáticamente
    });
    
    this.updateDemandLevel();
    this.updateAutoAssignedTime(); // Calcular hora asignada inicial
  }

  // Método principal para determinar el nivel de demanda
  updateDemandLevel() {
    const hour = this.currentTime.getHours();
    const minute = this.currentTime.getMinutes();
    const hourDecimal = hour + minute / 60;
    
    let demandKey: string;
    
    if (hourDecimal >= 6 && hourDecimal < 7) {
      demandKey = 'media'; // 6:00 – 7:00 AM
    } else if (hourDecimal >= 7 && hourDecimal < 8.5) {
      demandKey = 'alta'; // 7:00 – 8:30 AM
    } else if (hourDecimal >= 8.5 && hourDecimal < 10.5) {
      demandKey = 'moderada'; // 8:30 – 10:30 AM
    } else if (hourDecimal >= 10.5 && hourDecimal < 11.5) {
      demandKey = 'normal'; // 10:30 – 11:30 AM
    } else if (hourDecimal >= 11.5 && hourDecimal < 14) {
      demandKey = 'mediaalta'; // 11:30 – 2:00 PM
    } else if (hourDecimal >= 14 && hourDecimal < 16.5) {
      demandKey = 'baja'; // 2:00 – 4:30 PM
    } else if (hourDecimal >= 16.5 && hourDecimal < 17.5) {
      demandKey = 'moderada'; // 4:30 – 5:30 PM
    } else if (hourDecimal >= 17.5 && hourDecimal < 19) {
      demandKey = 'alta'; // 5:30 – 7:00 PM
    } else if (hourDecimal >= 19 && hourDecimal < 20) {
      demandKey = 'irregular'; // 7:00 – 8:00 PM
    } else {
      demandKey = 'baja'; // Fuera de horario de operación
    }
    
    this.currentDemandLevel = this.demandLevels[demandKey];
    this.estimatedTime = `${this.currentDemandLevel.minTime}-${this.currentDemandLevel.maxTime} min`;
  }

  // Nuevo método para actualizar la hora asignada automáticamente
  updateAutoAssignedTime() {
    if (this.currentDemandLevel) {
      const now = new Date();
      // Usar el tiempo máximo del nivel de demanda actual para ser más preciso
      const deliveryTime = new Date(now.getTime() + this.currentDemandLevel.maxTime * 60000);
      
      const hours = deliveryTime.getHours();
      const minutes = deliveryTime.getMinutes();
      const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
      const displayHour = hours % 12 || 12;
      
      this.autoAssignedTime = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
  }

  // Obtener mensaje de demanda
  getDemandMessage(): string {
    const hour = this.currentTime.getHours();
    
    if (hour >= 6 && hour < 7) return 'Primeros pedidos 🌅';
    if (hour >= 7 && hour < 8.5) return 'Hora pico: Desayuno 🍳';
    if (hour >= 8.5 && hour < 10.5) return 'Flujo constante ⚡';
    if (hour >= 10.5 && hour < 11.5) return 'Flujo estable 📈';
    if (hour >= 11.5 && hour < 14) return 'Hora pico: Comida 🍽️';
    if (hour >= 14 && hour < 16.5) return 'Flujo tranquilo 😌';
    if (hour >= 16.5 && hour < 17.5) return 'Preparativos vespertinos 🌆';
    if (hour >= 17.5 && hour < 19) return 'Hora pico: Cena 🌙';
    if (hour >= 19 && hour < 20) return 'Pedidos urgentes ⚠️';
    
    return 'Fuera de horario 🔒';
  }

  // Verificar si es hora pico
  isPeakHour(): boolean {
    return this.currentDemandLevel && 
           (this.currentDemandLevel.level === 'alta' || 
            this.currentDemandLevel.level === 'mediaalta' || 
            this.currentDemandLevel.level === 'irregular');
  }

  formatCurrentTime(): string {
    const hours = this.currentTime.getHours();
    const minutes = this.currentTime.getMinutes();
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  hasValidAssignedTime(): boolean {
    return !!(this.fechaHoraRecoleccion && 
              this.fechaHoraRecoleccion.length > 0 && 
              !isNaN(new Date(this.fechaHoraRecoleccion).getTime()));
  }

  // Enhanced method to format assigned time
  formatAssignedTime(): string {
    // Si hay una hora asignada manualmente, mostrarla
    if (this.fechaHoraRecoleccion && this.fechaHoraRecoleccion.length > 0) {
      try {
        const assignedDate = new Date(this.fechaHoraRecoleccion);
        
        if (isNaN(assignedDate.getTime())) {
          return this.autoAssignedTime || 'No asignada';
        }
        
        const hours = assignedDate.getHours();
        const minutes = assignedDate.getMinutes();
        const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
        const displayHour = hours % 12 || 12;
        
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      } catch (error) {
        console.error('Error formatting assigned time:', error);
        return this.autoAssignedTime || 'No asignada';
      }
    }
    
    // Si no hay hora asignada manualmente, mostrar la hora calculada automáticamente
    return this.autoAssignedTime || 'Calculando...';
  }

  // Obtener descripción de la demanda
  getDemandDescription(): string {
    return this.currentDemandLevel?.description || 'Calculando...';
  }

  // Nuevo método para manejar cambios en fecha/hora
  onDateOrTimeChange() {
    this.updateHoraMinimaInput();
    this.generarOpcionesHora(); // <-- Genera las opciones válidas

    this.updateHoraMinimaInput(); // <-- Actualiza el mínimo antes de validar

    if (this.fechaRecoleccion && this.horaRecoleccion) {
      // Validar que la hora esté dentro del rango permitido
      if (!this.isHoraDentroHorario(this.horaRecoleccion)) {
        this.utilSvc.presentToast({
          message: `La hora debe estar entre ${this.horaMinimaInput} y ${this.horaSalida}`,
          duration: 2500,
          color: 'warning',
          position: 'bottom',
          icon: 'time-outline'
        });
        this.fechaHoraRecoleccion = '';
        return;
      }
      // Construir fechaHoraRecoleccion en formato ISO local
      const fecha = this.fechaRecoleccion;
      const hora = this.horaRecoleccion;
      // Unir fecha y hora, agregar segundos y zona local
      const isoString = `${fecha}T${hora}:00`;
      // Ajustar a zona local
      const localDate = new Date(isoString);
      this.fechaHoraRecoleccion = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } else {
      this.fechaHoraRecoleccion = '';
    }
    // Validaciones mínimas
    if (this.fechaHoraRecoleccion) {
      const selectedDate = new Date(this.fechaHoraRecoleccion);
      const now = new Date();
      const selectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selectedDay < nowDay) {
        this.utilSvc.presentToast({
          message: 'No puedes seleccionar una fecha anterior a hoy',
          duration: 2500,
          color: 'warning',
          position: 'bottom',
          icon: 'calendar-outline'
        });
        return;
      }
    }
  }

  generarOpcionesHora() {
    // Genera opciones de hora cada 15 minutos dentro del rango permitido
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
      // Ajusta el desfase de zona horaria sumando los minutos del offset
      fechaSel.setMinutes(fechaSel.getMinutes() + fechaSel.getTimezoneOffset());
      // Corrige el día sumando 1
      fechaSel.setDate(fechaSel.getDate());
    }
    let esHoy = fechaSel &&
      fechaSel.getFullYear() === hoy.getFullYear() &&
      fechaSel.getMonth() === hoy.getMonth() &&
      fechaSel.getDate() === hoy.getDate();

    let minHour = hE;
    let minMin = mE;
    console.log(fechaSel?.getDate() + "-----" + hoy.getDate());
    if (esHoy) {
      // Si es hoy, el mínimo es el mayor entre horaEntrada y la hora actual redondeada a siguiente múltiplo de 15
      const nowHour = hoy.getHours();
      const nowMin = hoy.getMinutes();
      let actualMin = Math.ceil(nowMin / 15) * 15;
      let actualHour = nowHour;
      if (actualMin === 60) { actualHour++; actualMin = 0; }
      // Si la hora actual es menor que la hora de entrada, usar horaEntrada
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

    // Solo muestra las opciones válidas (no solo deshabilitadas)
    for (let min = hE * 60 + mE; min <= end; min += 15) {
      if (min < start) continue; // Oculta las horas anteriores al mínimo permitido
      const hour = Math.floor(min / 60);
      const minute = min % 60;
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = this.formatHoraAMPM(value);

      opciones.push({ value, label, enabled: true });
    }
    this.horaOpciones = opciones;
    // Si la hora seleccionada ya no es válida, límpiala
    if (this.horaRecoleccion && !opciones.find(o => o.value === this.horaRecoleccion)) {
      this.horaRecoleccion = '';
    }
  }

  // Nuevo: actualiza el mínimo de hora permitido según la fecha seleccionada
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
      // Si es hoy, el mínimo es el mayor entre horaEntrada y la hora actual
      const nowHour = hoy.getHours();
      const nowMin = hoy.getMinutes();
      const [hE, mE] = this.horaEntrada.split(':').map(Number);

      let minHour = Math.max(hE, nowHour);
      let minMin = minHour === nowHour ? nowMin : mE;

      // Si la hora actual es menor que la hora de entrada, usar horaEntrada
      if (nowHour < hE || (nowHour === hE && nowMin < mE)) {
        minHour = hE;
        minMin = mE;
      }

      this.horaMinimaInput = `${minHour.toString().padStart(2, '0')}:${minMin.toString().padStart(2, '0')}`;
    } else {
      // Otro día, el mínimo es la hora de entrada
      this.horaMinimaInput = this.horaEntrada;
    }
  }

  // Modifica la validación para usar el mínimo dinámico
  isHoraDentroHorario(hora: string): boolean {
    const [h, m] = hora.split(':').map(Number);
    const [hE, mE] = this.horaMinimaInput.split(':').map(Number);
    const [hS, mS] = this.horaSalida.split(':').map(Number);

    const minutos = h * 60 + m;
    const minutosEntrada = hE * 60 + mE;
    const minutosSalida = hS * 60 + mS;

    return minutos >= minutosEntrada && minutos <= minutosSalida;
  }

  startAutoAssignment() {
    this.isCountdownActive = true;
    this.countdown = 5;
    
    this.countdownSubscription = interval(1000).subscribe(() => {
      if (this.isCountdownActive && this.countdown > 0) {
        this.countdown--;
      } else if (this.isCountdownActive && this.countdown === 0) {
        this.performAutoAssignment();
      }
    });
  }

  // Enhanced auto assignment method
  async performAutoAssignment() {
    this.isCountdownActive = false;

    // Solo asignar automáticamente si el usuario NO seleccionó fecha/hora válida
    if (!this.validarFechaHora()) {
      const now = new Date();
      const preparationTime = this.currentDemandLevel.maxTime;
      const deliveryTime = new Date(now.getTime() + preparationTime * 60000);
      this.fechaHoraRecoleccion = deliveryTime.toISOString();
    }
    // Si el usuario ya seleccionó fecha/hora válida, NO modificarla

    await this.executeAssignment();
  }

  async executeAssignment() {
    const loading = await this.utilSvc.loading();
    await loading.present();

    this.isAssigned = true;
    this.showAnimation = true;

    let path = `pedidos/${this.pedido.id}`;

    try {
      // Usar SIEMPRE la fecha/hora seleccionada por el usuario
      const fechaRecoleccionDate = new Date(this.fechaHoraRecoleccion);

      if (isNaN(fechaRecoleccionDate.getTime())) {
        throw new Error('Fecha inválida seleccionada');
      }

      const fechaRecogerTimestamp = Timestamp.fromDate(fechaRecoleccionDate);

      await this.firebaseSvc.updateDocumet(path, {
        estatus: 'En espera de recolección',
        fecha_recoger: fechaRecogerTimestamp,
        hora_recoleccion: fechaRecogerTimestamp
      });

      setTimeout(() => {
        this.showAnimation = false;
        this.isAssigned = false;
        this.pedido.estatus = 'En espera de recolección';
        this.utilSvc.dismissModal({ success: true });
      }, 3000);

    } catch (error) {
      console.error('Error al asignar horario:', error);

      this.utilSvc.presentToast({
        message: 'Error al asignar horario. Por favor intenta de nuevo.',
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline'
      });

      this.isAssigned = false;
      this.showAnimation = false;

    } finally {
      loading.dismiss();
    }
  }

  restartCountdown() {
    this.isCountdownActive = true;
    this.countdown = 5;
    this.startAutoAssignment();
  }

  cancelCountdown() {
    this.isCountdownActive = false;
    this.countdown = 5;
    
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  getProgressPercentage(): number {
    return ((5 - this.countdown) / 5) * 100;
  }

  // Validación mejorada de fecha/hora
  validarFechaHora(): boolean {
    if (!this.fechaHoraRecoleccion) {
      return false;
    }

    try {
      // Convertir a zona local para evitar errores de comparación
      const fechaSeleccionada = new Date(this.fechaHoraRecoleccion);
      const fechaActual = new Date();

      if (isNaN(fechaSeleccionada.getTime())) {
        return false;
      }

      // Comparar solo la fecha (sin hora)
      const fechaSeleccionadaDia = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate());
      const fechaActualDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());

      if (fechaSeleccionadaDia < fechaActualDia) {
        return false;
      }

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysFromNowDia = new Date(sevenDaysFromNow.getFullYear(), sevenDaysFromNow.getMonth(), sevenDaysFromNow.getDate());

      if (fechaSeleccionadaDia > sevenDaysFromNowDia) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating date:', error);
      return false;
    }
  }

  async onSliderChange() {
    if (this.sliderValue === 100) {
      
      if (this.fechaHoraRecoleccion) {
        if (!this.validarFechaHora()) {
          this.sliderValue = 0;
          this.utilSvc.presentToast({
            message: `No se puede seleccionar una fecha y hora anterior o inválida`,
            duration: 3000,
            color: 'danger',
            position: 'bottom',
            icon: 'alert-circle-outline'
          });
          return;
        }

        await this.executeAssignment();
        
      } else {
        this.sliderValue = 0;
        this.utilSvc.presentToast({
          message: `Por favor, selecciona una fecha y hora`,
          duration: 2500,
          color: 'danger',
          position: 'bottom',
          icon: 'refresh-circle-outline'
        });
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