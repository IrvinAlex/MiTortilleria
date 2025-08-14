import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Corte } from 'src/app/models/corte.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-add-close-caja',
  templateUrl: './add-close-caja.component.html',
  styleUrls: ['./add-close-caja.component.scss'],
})
export class AddCloseCajaComponent  implements OnInit {
  @Input() corte: Corte | null = null;

  dataSelect = [];

  form = new FormGroup({
    uid: new FormControl(''),
    monto_inicio: new FormControl(null, [Validators.required, Validators.min(0.01)]),
    monto_final: new FormControl(null),
    fecha: new FormControl(''),
    estatus: new FormControl(''),
  });

  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    if (this.corte) {
      this.form.patchValue({
        uid: this.corte.uid || '',
        monto_inicio: this.corte.monto_inicio || null,
        monto_final: this.corte.monto_final || null,
        fecha: this.corte.fecha || '',
        estatus: this.corte.estatus || ''
      });
      
      // Deshabilitar el campo monto_inicio cuando hay corte
      this.form.get('monto_inicio')?.disable();
      // Agregar validación al monto final cuando hay corte
      this.form.get('monto_final')?.setValidators([Validators.required, Validators.min(0.01)]);
      this.form.get('monto_final')?.updateValueAndValidity();
      
      console.log("Corte UID: " + this.corte.uid);
    } else {
      // Solo validar monto_inicio cuando es apertura
      this.form.get('monto_final')?.clearValidators();
      this.form.get('monto_final')?.updateValueAndValidity();
    }
  
    if (this.corte && Array.isArray(this.corte)) {
      console.log('Datos múltiples recibidos:', this.corte);
      this.corte.forEach((corte) => console.log('Corte individual:', corte));
    }
  }

  // Verificar si el formulario es válido
  isFormValid(): boolean {
    if (this.corte) {
      // Para cierre: validar monto_final
      return this.form.get('monto_final')?.valid || false;
    } else {
      // Para apertura: validar monto_inicio
      return this.form.get('monto_inicio')?.valid || false;
    }
  }

  // Método para calcular ganancias en tiempo real
  getCalculatedGanancias(): number {
    const montoInicio = parseFloat(this.form.get('monto_inicio')?.value) || 0;
    const montoFinal = parseFloat(this.form.get('monto_final')?.value) || 0;
    return montoFinal - montoInicio;
  }

  // Método para cancelar la operación
  cancelOperation() {
    this.utilSvc.dismissModal({ success: false });
  }

  async submit() {
    if (this.form.valid) {
      if (this.corte) {
        await this.updateCorte();
      } else {
        await this.createCorte();
      }
    } 
  }

  async createCorte() {
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    try {
      // Obtener la fecha actual y convertirla a Timestamp
      const fechaActual = Timestamp.fromDate(new Date()); // Convierte la fecha actual a Timestamp
  
      // Crear un nuevo objeto para el corte, agregando fecha y estatus
      const newCorte = {
        ...this.form.value,
        fecha: fechaActual, // Se agrega la fecha actual como Timestamp
        estatus: 'Caja aperturada',  // Se agrega el estatus "inicio"
      };
  
      // Agregar el documento a la colección 'corte_caja' en Firebase
      await this.firebaseSvc.addDocumentWithUid('corte_caja', newCorte);
  
      // Mostrar mensaje de éxito
      this.utilSvc.presentToast({
        message: 'Corte de caja creado exitosamente.',
        duration: 1500,
        color: 'success',
      });
  
      // Cerrar el modal
      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      // En caso de error, mostrar un mensaje
      this.utilSvc.presentToast({
        message: 'Error al crear corte de caja.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      // Finalizar la carga
      loading.dismiss();
    }
  }

  async updateCorte() {
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    try {
      const uid = this.form.get('uid')?.value;
      const path = `corte_caja/${uid}`;
  
      // Obtener los valores actuales del formulario y convertir a números
      const montoInicio = parseFloat(this.form.get('monto_inicio')?.value) || 0;
      const montoFinal = parseFloat(this.form.get('monto_final')?.value) || 0;
  
      // Calcular las ganancias (resta: monto final - monto inicial)
      const ganancias = montoFinal - montoInicio;
  
      // Crear el objeto actualizado con los nuevos valores
      const updatedCorte = {
        monto_final: montoFinal,
        ganancias: ganancias,
        estatus: 'Caja cerrada',
      };
  
      console.log("Path para la actualización: ", path);
      console.log("Ganancias calculadas: ", ganancias);
  
      // Actualizar el documento en Firebase
      await this.firebaseSvc.updateDocumet(path, updatedCorte);
  
      this.utilSvc.presentToast({
        message: 'Caja cerrada exitosamente.',
        duration: 1500,
        color: 'success',
      });
  
      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al cerrar la caja.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }


}