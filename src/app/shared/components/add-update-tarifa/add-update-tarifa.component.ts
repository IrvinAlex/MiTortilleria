import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-tarifa',
  templateUrl: './add-update-tarifa.component.html',
  styleUrls: ['./add-update-tarifa.component.scss'],
})
export class AddUpdateTarifaComponent implements OnInit {
  @Input() tarifa: any;

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  form = new FormGroup({
    distancia_min: new FormControl(0, [Validators.required, Validators.min(0)]),
    distancia_max: new FormControl(0.5, [Validators.required, Validators.min(0.1)]),
    tarifa: new FormControl(30, [Validators.required, Validators.min(1)]),
    activo: new FormControl(true)
  });

  constructor() { }

  ngOnInit() {
    console.log('AddUpdateTarifaComponent initialized with tarifa:', this.tarifa);
    if (this.tarifa) {
      this.form.patchValue({
        distancia_min: this.tarifa.distancia_min || 0,
        distancia_max: this.tarifa.distancia_max || 0.5,
        tarifa: this.tarifa.tarifa || 30,
        activo: this.tarifa.activo !== undefined ? this.tarifa.activo : true
      });
    }
  }

  async submit() {
    if (!this.form.valid) {
      this.utilsSvc.presentToast({
        message: 'Por favor completa todos los campos correctamente',
        duration: 2500,
        color: 'warning',
        position: 'bottom',
        icon: 'warning-outline'
      });
      return;
    }

    const formValue = this.form.value;
    if (Number(formValue.distancia_max) <= Number(formValue.distancia_min)) {
      this.utilsSvc.presentToast({
        message: 'La distancia máxima debe ser mayor a la mínima',
        duration: 3000,
        color: 'warning',
        position: 'bottom',
        icon: 'warning-outline'
      });
      return;
    }

    const tarifaData = {
      distancia_min: Number(formValue.distancia_min),
      distancia_max: Number(formValue.distancia_max),
      tarifa: Number(formValue.tarifa),
      activo: Boolean(formValue.activo),
      rango_distancia: `${formValue.distancia_min} - ${formValue.distancia_max} km`,
      fecha_actualizacion: new Date()
    };

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Usar una promesa real para obtener los datos
      const existingTariffs = await new Promise<any[]>((resolve, reject) => {
        this.firebaseSvc.getCollectionData('tarifas_transporte').subscribe({
          next: resolve,
          error: reject
        });
      });

      const hasOverlap = existingTariffs.some(existing => {
        if (this.tarifa && existing['id'] === this.tarifa.id) return false;
        const existingMin = Number(existing['distancia_min']);
        const existingMax = Number(existing['distancia_max']);
        return (formValue.distancia_min < existingMax && formValue.distancia_max > existingMin);
      });

      if (hasOverlap) {
        this.utilsSvc.presentToast({
          message: 'Ya existe una tarifa que se superpone con este rango de distancia',
          duration: 3000,
          color: 'warning',
          position: 'bottom',
          icon: 'warning-outline'
        });
        await loading.dismiss();
        return;
      }

        console.log(this.tarifa)

      if (this.tarifa && this.tarifa.id) {
        await this.firebaseSvc.updateDocumet(`tarifas_transporte/${this.tarifa.id}`, tarifaData);
        this.utilsSvc.presentToast({
          message: 'Tarifa actualizada exitosamente',
          duration: 2500,
          color: 'success',
          position: 'bottom',
          icon: 'checkmark-circle-outline'
        });
      } else {
        await this.firebaseSvc.addDocument('tarifas_transporte', tarifaData);
        this.utilsSvc.presentToast({
          message: 'Tarifa agregada exitosamente',
          duration: 2500,
          color: 'success',
          position: 'bottom',
          icon: 'checkmark-circle-outline'
        });
      }

      this.utilsSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilsSvc.presentToast({
        message: 'Error al guardar la tarifa: ' + (error?.message || error),
        duration: 3000,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
    } finally {
      await loading.dismiss();
    }
  }

  setNumberInputs() {
    // Convert to numbers to ensure proper validation
    const currentValues = this.form.value;
    this.form.patchValue({
      distancia_min: Number(currentValues.distancia_min) || 0,
      distancia_max: Number(currentValues.distancia_max) || 0,
      tarifa: Number(currentValues.tarifa) || 0
    });
  }
}


