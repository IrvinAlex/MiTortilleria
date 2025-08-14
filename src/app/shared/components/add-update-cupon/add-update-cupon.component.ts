import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Cupon } from 'src/app/models/cupon.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-cupon',
  templateUrl: './add-update-cupon.component.html',
  styleUrls: ['./add-update-cupon.component.scss'],
})
export class AddUpdateCuponComponent  implements OnInit {
  @Input() cupon: Cupon | null = null;

  form = new FormGroup({
    uid: new FormControl(''),
    descripcion: new FormControl('', [Validators.required, Validators.minLength(4)]),
    codigo: new FormControl('', [Validators.required, Validators.minLength(4)]),
    porcentaje: new FormControl(null, [Validators.required]),
    numero_compras: new FormControl(null, [Validators.required]),
  });

  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    if (this.cupon) {
      this.form.patchValue({
        ...this.cupon,
      });
    }
  }

  async submit() {
    if (this.form.valid) {
      if (this.cupon) {
        await this.updateCupon();
      } else {
        await this.createCupon();
      }
    } else {
      this.utilSvc.presentToast({
        message: 'Por favor, completa todos los campos requeridos.',
        duration: 2000,
        color: 'warning',
        position: 'top',
      });
    }
  }

  async createCupon() {
    const loading = await this.utilSvc.loading();
    await loading.present();

    try {

      const newCupon = {
        ...this.form.value,
      };

      await this.firebaseSvc.addDocumentWithUid('cupones', newCupon);

      this.utilSvc.presentToast({
        message: 'Cupón creado exitosamente.',
        duration: 1500,
        color: 'success',
      });

      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al crear cupón.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }

  async updateCupon() {
    const loading = await this.utilSvc.loading();
    await loading.present();

    try {
      const uid = this.form.get('uid')?.value;
      const path = `cupones/${uid}`;


      const updatedCupon = {
        ...this.form.value,
      };
      delete updatedCupon.uid;

      await this.firebaseSvc.updateDocumet(path, updatedCupon);

      this.utilSvc.presentToast({
        message: 'Cupón actualizado exitosamente.',
        duration: 1500,
        color: 'success',
      });

      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al actualizar cupón.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }


}
