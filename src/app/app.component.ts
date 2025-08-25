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
    if (Capacitor.isNativePlatform) {
      // Solicitar permisos en plataforma nativa
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
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
    } else {
      // Implementación para web
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Permiso de notificación web concedido');
            // Ejemplo: mostrar una notificación
            new Notification('Bienvenido', {
              body: 'Las notificaciones web están activadas.',
              icon: 'assets/icon/favicon.png'
            });
          } else {
            console.log('Permiso de notificación web denegado');
          }
        });
      } else {
        console.log('Las notificaciones web no son soportadas en este navegador');
      }
    }
  }
}