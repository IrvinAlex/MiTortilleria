import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { Terms } from 'src/app/models/terms.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss'],
})
export class TermsComponent implements OnInit{


  acceptedTerms: boolean = false;
  user = {} as User;
  terms: any[] = [];
  utilSvc = inject(UtilsService);
  firebaseSvc = inject(FirebaseService);
  showTermsItem: boolean = true;

  form = new FormGroup({
    acepto: new FormControl(true)
  })

  ngOnInit() {
    this.user = this.utilSvc.getFromLocalStorage('user');
    this.terms = this.utilSvc.getFromLocalStorage('terms') || [];
  }


  constructor(private navCtrl: NavController) {}

  async acceptTerms() {
    let path = `users/${this.user.uid}/terms`;
    const loading = await this.utilSvc.loading();
    await loading.present();

    this.firebaseSvc.addDocument(path, this.form.value).then(async res => {
      //OBTENER LOS TERMINOS
      let path = `users/${this.user.uid}/terms`;
      let sub2 = this.firebaseSvc.obtenerColeccion(path).subscribe({
        next: (res:any) => {
          let terms = res;
          this.utilSvc.saveInLocalStorage('terms', terms);
          sub2.unsubscribe();
        }
      })
      this.utilSvc.dismissModal({ success: true });

      this.utilSvc.presentToast({
        message: `Aceptaste los términos y condiciones`,
        duration: 1500,
        color: 'primary',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      })


    }).catch(error => {


      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      })

    }).finally(() => {
      loading.dismiss();
    })
  }

}
