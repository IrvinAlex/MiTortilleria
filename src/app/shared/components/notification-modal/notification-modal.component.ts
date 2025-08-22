import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { NotificationsPushService } from 'src/app/services/notifications-push.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-notification-modal',
  templateUrl: './notification-modal.component.html',
  styleUrls: ['./notification-modal.component.scss'],
})
export class NotificationModalComponent implements OnInit {
  @Input() notificationForm: FormGroup;

  loading = false;

  constructor(
    private modalCtrl: ModalController,
    private notificationsPushSvc: NotificationsPushService,
    private utilsSvc: UtilsService
  ) {}

  ngOnInit() {}

  async sendNotification() {
    if (this.notificationForm.valid) {
      this.loading = true;
      const { title, message } = this.notificationForm.value;
      try {
        await this.notificationsPushSvc.sendPushNotification(title, message);
        this.utilsSvc.presentToast({
          message: 'Notificación enviada exitosamente.',
          duration: 1500,
          color: 'success',
          position: 'bottom',
          icon: 'send-outline',
        });
        this.notificationForm.reset();
        this.close();
      } catch (error) {
        this.utilsSvc.presentToast({
          message: 'Error al enviar la notificación.',
          duration: 2500,
          color: 'danger',
          position: 'bottom',
          icon: 'alert-circle-outline',
        });
      }
      this.loading = false;
    }
  }

  close() {
    this.modalCtrl.dismiss({ sent: true });
  }
}
