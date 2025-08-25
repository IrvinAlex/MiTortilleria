import { inject, Injectable } from '@angular/core';
import { ActionPerformed, PushNotificationSchema, PushNotifications, Token } from '@capacitor/push-notifications';
import { UtilsService } from './utils.service';
import { User } from '../models/user.model';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class NotificationsPushService{
  
   utilsSvc = inject(UtilsService);
  user: User;
  enabled: boolean = false;
  uid_user: string = '';
  firestore = inject(AngularFirestore);
  http = inject(HttpClient);

  
  constructor() { }

  init(uid: string) {
    this.uid_user = uid;
    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        PushNotifications.register();
      } else {
        // Show some error
        this.utilsSvc.presentToast({
          message: 'You need to allow notifications to receive push notifications',
          duration: 2000,
          color: 'danger',
          position: 'top'
        });
      }
    });
    this.listenForNotifications();

  }

  listenForNotifications() {
    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration',
      (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        this.saveToken(token.value);
        this.enabled = true;
      }
    );

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError',
      (error: any) => {
        console.log('Error on registration: ' + JSON.stringify(error));
      }
    );

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push received: ' + JSON.stringify(notification));
        this.utilsSvc.presentToast({
          message: notification.title + ' ' + notification.body,
          duration: 2000,
          color: 'primary',
          position: 'top'
        });
        // Guardar en Firestore que el usuario recibió la notificación
        const path = `users/${this.uid_user}/notifications`;
        this.firestore.collection(path).add({
          title: notification.title,
          body: notification.body,
          receivedAt: new Date()
        });
      }
    );

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        this.utilsSvc.presentToast({
          message: notification.notification.title + ' ' + notification.notification.body,
          duration: 4000,
          color: 'primary',
          position: 'middle'
        });
      }
    );
  }

  saveToken(token: string) {
    console.log('Saving token to server:', token);
    const path = `users/${this.uid_user}`;
    // Registrar SIEMPRE en el backend
    this.http.post('https://api-tortilleria.onrender.com/registrarToken', {
      token,
      uid: this.uid_user
    }).subscribe({
      next: (res) => {
        console.log('Token registrado en API externa:', res);
      },
      error: (err) => {
        console.error('Error registrando token en API externa:', err);
      }
    });
    // También actualiza en Firestore
    this.updateDocumet(path, { token }).finally(() => {});
  }

  async removeToken() {
    const path = `users/${this.uid_user}`;
    this.updateDocumet(path, { token: '' }).finally(() => {
      this.enabled = false;
    });
  }


  updateDocumet(path: string, data: any) {
    return updateDoc(doc(getFirestore(), path), data);
  }

  async sendNotification(title: string, body: string) {
    // Envía la notificación push usando tu endpoint backend/Firebase Function
    // Reemplaza la URL con tu endpoint real
    const url = 'https://api-tortilleria.onrender.com/enviarNotificacion';
    const payload = {
      titulo: title, // Título de la notificación
      cuerpo: body,  // Cuerpo de la notificación
      data: {}       // Opcional: datos extra (puedes omitir o enviar un objeto)
    };
    return this.http.post(url, payload).toPromise();
  }

  // Envía notificación push a todos los usuarios con token
  async sendPushNotification(title: string, message: string): Promise<void> {
    const snapshot = await this.firestore.collection('users', ref => ref.where('token', '!=', '')).get().toPromise();
    const tokens: string[] = [];
    snapshot?.forEach(doc => {
      const data = doc.data() as { token?: string };
      if (data && typeof data.token === 'string' && data.token.length > 0) tokens.push(data.token);
    });

    // Envía la notificación a cada token
    for (const token of tokens) {
      await this.sendNotification(title, message);
    }
  }
}
