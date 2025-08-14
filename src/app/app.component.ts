import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotificationsPushService } from './services/notifications-push.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  

  init() {
    if (Capacitor.isNativePlatform) {
    }
  }
}