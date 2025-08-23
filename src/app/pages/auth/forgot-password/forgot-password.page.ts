import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage implements OnInit {

  form = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(30)
    ]),
  })

  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService)

  ngOnInit() {
  }

  onEmailInput(event: any) {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 30) {
      input.value = input.value.slice(0, 30);
      this.form.controls.email.setValue(input.value);
    }
  }

  async submit(){
    if (this.form.valid){
      const email = this.form.value.email;
      const loading = await this.utilSvc.loading();
      await loading.present();

      // Validar si el correo existe
      const exists = await this.firebaseSvc.checkEmailExists(email);
      if (!exists) {
        this.utilSvc.presentToast({
          message: 'El correo no está registrado',
          duration: 2500,
          color: 'danger',
          position: 'bottom',
          icon: 'alert-circle-outline'
        });
        loading.dismiss();
        return;
      }

      this.firebaseSvc.sendRecoveryEmail(email).then(res => {
        this.utilSvc.presentToast({
          message: `Correo enviado con éxito`,
          duration:1500,
          color:'primary',
          position:'bottom',
          icon:'mail-outline'
         });
        this.utilSvc.routerLink('/auth');
        this.form.reset();
      }).catch(error=>{
        this.utilSvc.presentToast({
          message: error.message,
          duration:2500,
          color:'primary',
          position:'bottom',
          icon:'alert-circle-outline'
        })
      }).finally(() => {
        loading.dismiss();
      })
    }
  }

     

}