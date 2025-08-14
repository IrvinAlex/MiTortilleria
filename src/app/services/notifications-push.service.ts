import { inject, Injectable } from '@angular/core';
import { ActionPerformed, PushNotificationSchema, PushNotifications, Token } from '@capacitor/push-notifications';
import { UtilsService } from './utils.service';
import { User } from '../models/user.model';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
@Injectable({
  providedIn: 'root'
})
export class NotificationsPushService{
  
   utilsSvc = inject(UtilsService);
  user: User;
  enabled: boolean = false;
  uid_user: string = '';

  
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
    this.updateDocumet(path, { token }).finally(() => {
      
    });
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

  async sendNotification(token: string, title: string, body: string) {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token,
    };
    

    
  }
}
