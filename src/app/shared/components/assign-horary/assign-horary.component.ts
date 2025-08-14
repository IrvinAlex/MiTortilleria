import { Component, ElementRef, inject, Input, OnInit, ViewChild, OnDestroy } from '@angular/core';
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
  fechaMinima: string = '';

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

  ngOnInit() {
    this.setFechaMinima();
    
    if (!this.fechaHoraRecoleccion) {
      this.fechaHoraRecoleccion = '';
    }
    
    this.initializeTimeSystem();
    this.startAutoAssignment();
  }

  ngOnDestroy() {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  @ViewChild('sliderButton', { static: false }) sliderButton!: ElementRef;
  sliderValue: number = 0;
  showAnimation: boolean = false;

  setFechaMinima() {
    const now = new Date();
    this.fechaMinima = now.toISOString();
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

  // Método actualizado para mostrar la hora asignada automáticamente
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

  onDateTimeChange() {
    console.log('Fecha/hora cambiada:', this.fechaHoraRecoleccion);
    console.log('Hora asignada válida:', this.hasValidAssignedTime());
    console.log('Hora formateada:', this.formatAssignedTime());
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

  // Asignación automática basada en la demanda actual
  async performAutoAssignment() {
    this.isCountdownActive = false;
    
    const now = new Date();
    // Usar el tiempo máximo del nivel de demanda actual
    const preparationTime = this.currentDemandLevel.maxTime;
    const deliveryTime = new Date(now.getTime() + preparationTime * 60000);
    
    this.fechaHoraRecoleccion = deliveryTime.toISOString();
    
    await this.executeAssignment();
  }

  async executeAssignment() {
    const loading = await this.utilSvc.loading();
    await loading.present();
    
    this.isAssigned = true;
    this.showAnimation = true;

    let path = `pedidos/${this.pedido.id}`;
    
    const fechaRecoleccionDate = new Date(this.fechaHoraRecoleccion);
    const fechaRecogerTimestamp = Timestamp.fromDate(fechaRecoleccionDate);
    
    this.firebaseSvc.updateDocumet(path, {
      estatus: 'En espera de recolección', 
      fecha_recoger: fechaRecogerTimestamp
    }).then(async res => {
      
      setTimeout(() => {
        this.showAnimation = false;
        this.isAssigned = false;
        this.pedido.estatus = 'En espera de recolección';
        this.utilSvc.dismissModal({ success: true });
      }, 3000);

    }).catch(error => {
      
      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
      
      this.isAssigned = false;
      this.showAnimation = false;

    }).finally(() => {
      loading.dismiss();
    });
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

  validarFechaHora(): boolean {
    if (!this.fechaHoraRecoleccion) {
      return false;
    }

    const fechaSeleccionada = new Date(this.fechaHoraRecoleccion);
    const fechaActual = new Date();

    if (fechaSeleccionada < fechaActual) {
      return false;
    }

    return true;
  }

  async onSliderChange() {
    if (this.sliderValue === 100) {
      
      if (this.fechaHoraRecoleccion) {
        if (!this.validarFechaHora()) {
          this.sliderValue = 0;
          this.utilSvc.presentToast({
            message: `No se puede seleccionar una fecha y hora anterior a la actual`,
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
}