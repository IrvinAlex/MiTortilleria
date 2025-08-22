import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotificationsPushService } from './services/notifications-push.service';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  
  constructor() {
    this.initializePush();
  }

  init() {
    if (Capacitor.isNativePlatform) {
    }

  }

  initializePush() {
  // Solicitar permisos
  PushNotifications.requestPermissions().then(result => {
    if (result.receive === 'granted') {
      // Registrar el dispositivo
      PushNotifications.register();
    } else {
      console.log('No se otorgaron permisos de notificación');
    }
  });

  // Obtener token de registro
  PushNotifications.addListener('registration', token => {
    console.log('Device token:', token.value);
    // Guarda este token en tu backend o Firebase
  });

  // Manejar errores
  PushNotifications.addListener('registrationError', err => {
    console.error('Error en registro push:', err.error);
  });

  // Notificación recibida en foreground
  PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('Notificación recibida:', notification);
  });

  // Cuando el usuario toca la notificación
  PushNotifications.addListener('pushNotificationActionPerformed', notification => {
    console.log('Notificación abierta:', notification.notification);
  });
}
}