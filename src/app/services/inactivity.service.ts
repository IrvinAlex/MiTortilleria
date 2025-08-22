import { Injectable, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { UtilsService } from './utils.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface InactivityWarningData {
  timeRemaining: string;
  userType: string;
  deviceInfo: string;
}

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private firebaseSvc = inject(FirebaseService);
  private utilsSvc = inject(UtilsService);

  private inactivityTimer: any;
  private warningTimer: any;
  private lastActivity: number = Date.now();
  private isActive: boolean = false;
  
  // Configuración de tiempos en milisegundos
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 30 minutos
  private readonly WARNING_TIME = 1 * 60 * 1000; // 1 minuto antes del cierre
  
  // Subject para notificar cambios de estado
  private sessionState = new BehaviorSubject<'active' | 'warning' | 'expired'>('active');
  private showWarningCard = new BehaviorSubject<boolean>(false);
  private warningData = new BehaviorSubject<InactivityWarningData | null>(null);

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Configura los event listeners para detectar actividad del usuario
   */
  private setupEventListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => this.resetInactivityTimer(), true);
    });
  }

  /**
   * Inicia el monitoreo de inactividad
   */
  startMonitoring() {
    const user = this.utilsSvc.getElementFromLocalstorage('user');
    
    // Solo monitorear para clientes (type_profile = 3) y negocios/taquerías (type_profile = 2)
    if (!user || (user.type_profile !== 2 && user.type_profile !== 3)) {
      return;
    }

    this.isActive = true;
    this.lastActivity = Date.now();
    this.resetInactivityTimer();
    console.log('Monitoreo de inactividad iniciado para usuario tipo:', user.type_profile);
  }

  /**
   * Detiene el monitoreo de inactividad
   */
  stopMonitoring() {
    this.isActive = false;
    this.clearTimers();
    this.sessionState.next('active');
    this.showWarningCard.next(false);
    this.warningData.next(null);
    console.log('Monitoreo de inactividad detenido');
  }

  /**
   * Reinicia el timer de inactividad cuando hay actividad
   */
  private resetInactivityTimer() {
    if (!this.isActive) return;

    this.lastActivity = Date.now();
    this.clearTimers();
    this.sessionState.next('active');

    // Ocultar alerta de advertencia si está abierta
    this.showWarningCard.next(false);
    this.warningData.next(null);

    // Timer para mostrar advertencia
    this.warningTimer = setTimeout(() => {
      this.showInactivityWarning();
    }, this.INACTIVITY_TIMEOUT - this.WARNING_TIME);

    // Timer para cerrar sesión automáticamente
    this.inactivityTimer = setTimeout(() => {
      this.forceLogout();
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Limpia todos los timers
   */
  private clearTimers() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Muestra la advertencia de inactividad como tarjeta flotante
   */
  private showInactivityWarning() {
    if (!this.isActive) return;

    this.sessionState.next('warning');

    const user = this.utilsSvc.getElementFromLocalstorage('user');
    const userTypeText = user.type_profile === 2 ? 'Negocio' : 'Cliente';
    
    const warningData: InactivityWarningData = {
      timeRemaining: '1 minuto',
      userType: userTypeText,
      deviceInfo: this.getCurrentDeviceInfo()
    };

    this.warningData.next(warningData);
    this.showWarningCard.next(true);

    // Auto-cerrar sesión si no responde en 1 minuto
    setTimeout(() => {
      if (this.showWarningCard.value) {
        this.forceLogout();
      }
    }, this.WARNING_TIME);
  }

  /**
   * Obtiene información del dispositivo actual
   */
  private getCurrentDeviceInfo(): string {
    const userAgent = navigator.userAgent;
    
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      if (/iPhone|iPad/i.test(userAgent)) {
        return '📱 iPhone/iPad';
      } else if (/Android/i.test(userAgent)) {
        return '📱 Android';
      }
      return '📱 Móvil';
    } else {
      if (/Chrome/i.test(userAgent)) {
        return '🌐 Chrome';
      } else if (/Firefox/i.test(userAgent)) {
        return '🦊 Firefox';
      } else if (/Safari/i.test(userAgent)) {
        return '🧭 Safari';
      }
      return '💻 Computadora';
    }
  }

  /**
   * Fuerza el cierre de sesión por inactividad
   */
  private async forceLogout() {
    this.sessionState.next('expired');
    this.stopMonitoring();

    // Mostrar toast de cierre por inactividad
    this.utilsSvc.presentToast({
      message: '🔒 Sesión cerrada por inactividad',
      duration: 3000,
      color: 'warning',
      position: 'top',
      icon: 'time-outline'
    });

    // Cerrar sesión
    await this.firebaseSvc.signOut();
  }

  /**
   * Extiende la sesión cuando el usuario confirma
   */
  continueSession() {
    if (this.isActive) {
      this.showWarningCard.next(false);
      this.warningData.next(null);
      this.resetInactivityTimer();
    }
  }

  /**
   * Cierra la sesión manualmente desde la alerta
   */
  async logoutFromWarning() {
    await this.forceLogout();
  }

  /**
   * Cierra la alerta de advertencia
   */
  dismissWarning() {
    this.showWarningCard.next(false);
    this.warningData.next(null);
  }

  // Observables para que los componentes se suscriban
  getSessionState(): Observable<'active' | 'warning' | 'expired'> {
    return this.sessionState.asObservable();
  }

  getShowWarningCard(): Observable<boolean> {
    return this.showWarningCard.asObservable();
  }

  getWarningData(): Observable<InactivityWarningData | null> {
    return this.warningData.asObservable();
  }

  /**
   * Verifica si la sesión está activa
   */
  isSessionActive(): boolean {
    return this.isActive && this.sessionState.value !== 'expired';
  }

  /**
   * Extiende la sesión manualmente
   */
  extendSession() {
    if (this.isActive) {
      this.resetInactivityTimer();
    }
  }
}
