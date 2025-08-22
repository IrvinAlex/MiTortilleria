import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-terms2',
  templateUrl: './terms2.component.html',
  styleUrls: ['./terms2.component.scss'],
})
export class Terms2Component {
  form = new FormGroup({
    accepted: new FormControl(false, Validators.requiredTrue)
  });

  constructor(private navCtrl: NavController) {}

  acceptTerms() {
    if (this.form.valid) {
      this.navCtrl.back();
    }
  }
}

