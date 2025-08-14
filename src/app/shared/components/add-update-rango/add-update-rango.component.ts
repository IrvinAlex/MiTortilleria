import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Rango } from 'src/app/models/rango.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-rango',
  templateUrl: './add-update-rango.component.html',
  styleUrls: ['./add-update-rango.component.scss'],
})
export class AddUpdateRangoComponent  implements OnInit {
  @Input() rango: Rango | null = null;

  dataSelect = [];

  form = new FormGroup({
    uid: new FormControl(''),
    producto: new FormControl('', [Validators.required, Validators.minLength(4)]),
    tipo: new FormControl('', [Validators.required, Validators.minLength(4)]),
    min_producto: new FormControl(null, [
      Validators.required,
      Validators.min(0),
      Validators.pattern(/^\d+(\.\d+)?$/) // solo números positivos (enteros o decimales)
    ]),
    max_producto: new FormControl(null, [
      Validators.required,
      Validators.min(0),
      Validators.pattern(/^\d+(\.\d+)?$/)
    ]),
  });

  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    console.log(this.rango);
    if (this.rango) {
      this.form.patchValue({
        ...this.rango,
      });
    }

    // Sanitizar entradas: no letras y no negativos
    this.setupNumericControl('min_producto');
    this.setupNumericControl('max_producto');
  }

  private setupNumericControl(controlName: string) {
    const ctrl = this.form.get(controlName);
    if (!ctrl) return;

    ctrl.valueChanges.subscribe((val) => {
      if (val === null || val === undefined || val === '') return;

      let raw = String(val);
      // Eliminar letras y símbolos excepto el punto decimal
      raw = raw.replace(/[^0-9.]/g, '');

      // Permitir solo un punto decimal
      const parts = raw.split('.');
      if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');

      let num = parseFloat(raw);
      if (isNaN(num)) {
        // valor inválido -> limpiar
        if (val !== null) ctrl.setValue(null, { emitEvent: false });
        return;
      }

      // Evitar negativos
      if (num < 0) num = 0;

      if (val !== num) {
        ctrl.setValue(num, { emitEvent: false });
      }
    });
  }

  async submit() {
    if (this.form.valid) {
      if (this.rango) {
        await this.updateRango();
      } else {
        await this.createRango();
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

  async createRango() {
    const loading = await this.utilSvc.loading();
    await loading.present();

    try {
      const min = Number(this.form.get('min_producto')?.value);
      const max = Number(this.form.get('max_producto')?.value);

      const newRango = {
        ...this.form.value,
        min_producto: isNaN(min) ? 0 : Math.max(0, min),
        max_producto: isNaN(max) ? 0 : Math.max(0, max),
      };

      await this.firebaseSvc.addDocumentWithUid('rango_productos', newRango);

      this.utilSvc.presentToast({
        message: 'Rango creado exitosamente.',
        duration: 1500,
        color: 'success',
      });

      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al crear rango.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }

  async updateRango() {
    const loading = await this.utilSvc.loading();
    await loading.present();

    try {
      const uid = this.form.get('uid')?.value;
      const path = `rango_productos/${uid}`;

      const min = Number(this.form.get('min_producto')?.value);
      const max = Number(this.form.get('max_producto')?.value);

      const updatedRango: any = {
        ...this.form.value,
        min_producto: isNaN(min) ? 0 : Math.max(0, min),
        max_producto: isNaN(max) ? 0 : Math.max(0, max),
      };
      delete updatedRango.uid;

      await this.firebaseSvc.updateDocumet(path, updatedRango);

      this.utilSvc.presentToast({
        message: 'Rango actualizado exitosamente.',
        duration: 1500,
        color: 'success',
      });

      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al actualizar rango.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }

}