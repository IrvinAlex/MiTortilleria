import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Gasto } from 'src/app/models/gasto.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-add-update-gastos',
  templateUrl: './add-update-gastos.component.html',
  styleUrls: ['./add-update-gastos.component.scss'],
})
export class AddUpdateGastosComponent implements OnInit {
  @Input() gasto: Gasto | null = null; // Acepta null para nuevos gastos

  // Formulario de gasto
  form = new FormGroup({
    uid: new FormControl(''),
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    pago: new FormControl(null, [Validators.required, Validators.min(0)]),
    fecha: new FormControl(null),
    // Otros campos si son necesarios
  });

  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);
  maxDate: string = '';

  ngOnInit() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecer hora a 00:00 para comparar solo la fecha
    this.maxDate = today.toISOString().split('T')[0];  // Solo obtener la parte de la fecha (YYYY-MM-DD)

    if (this.gasto) {
      let fecha = this.gasto.fecha;

      if (fecha instanceof Timestamp) {
        fecha = fecha.toDate(); 
      }

      const isoDate = fecha instanceof Date ? fecha.toISOString().split('T')[0] : null; // Solo la fecha, sin hora

      this.form.patchValue({
        ...this.gasto,
        fecha: isoDate, 
      });
    }
  }

  onDateChange($event) {
    
  }

  setNumberInputs(){}

  // ================= Validación de fecha ====================
  dateInRangeValidator() {
    return (control: FormControl) => {
      if (!control.value) return null; // Si no hay valor, no hay error

      const selectedDate = new Date(control.value); // Fecha seleccionada
      const today = new Date(); // Fecha actual
      today.setHours(0, 0, 0, 0); // Normalizamos a medianoche para comparar solo fechas

      // Validar si la fecha seleccionada es posterior al día actual
      if (selectedDate.getTime() > today.getTime()) {
        return { dateTooLate: true }; // Fecha futura no permitida
      }

      return null; // Fecha válida (hoy o anterior)
    };
  }

  // ================= Enviar formulario ====================
  async submit() {
    if (this.form.valid) {
      if (this.gasto) {
        await this.updateGasto();
      } else {
        await this.createGasto();
      }
    }
  }


  async createGasto() {
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    try {
      const path = `gastos`;
  
      // Convierte la fecha a Timestamp antes de guardarla
      const newGasto = {
        ...this.form.value,
        fecha: Timestamp.fromDate(new Date(this.form.value.fecha)) // Convierte la fecha a Timestamp
      };
  
      await this.firebaseSvc.addDocumentWithUid(path, newGasto);
  
      this.utilSvc.presentToast({
        message: `Gasto creado exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline',
      });
  
      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
    } finally {
      loading.dismiss();
    }
  }
  
  async updateGasto() {
    const loading = await this.utilSvc.loading();
    await loading.present();
    const gasto = this.gasto;

    const newGasto = {
      ...this.form.value,
      fecha: Timestamp.fromDate(new Date(this.form.value.fecha)) // Convierte la fecha a Timestamp
    };
  
    try {
      if (!gasto.uid) {
        throw new Error("No se puede actualizar un gasto sin ID.");
      }
  
      // Eliminar id antes de enviar para evitar conflicto
      const updatedGasto = { ...this.form.value };
      delete updatedGasto.uid;

      const path = `gastos/${gasto.uid}`; // Usamos el ID para la actualización
  
      // Convertir la fecha a Timestamp antes de actualizar
      updatedGasto.fecha = Timestamp.fromDate(new Date(updatedGasto.fecha)); // Convertir la fecha a Timestamp
      console.log('Datos a actualizar:', updatedGasto);
  
      // Actualizar documento en Firebase
      await this.firebaseSvc.updateDocumet(path, updatedGasto);
  
      this.utilSvc.presentToast({
        message: `Gasto actualizado exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline',
      });
  
      this.utilSvc.dismissModal({ success: true, data: updatedGasto });
    } catch (error) {
      this.utilSvc.presentToast({
        message: `Error al actualizar gasto: ${error.message}`,
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
      console.error('Error al actualizar gasto:', error);
    } finally {
      loading.dismiss();
    }
  }
}