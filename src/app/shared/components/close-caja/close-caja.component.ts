import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Corte } from 'src/app/models/corte.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-close-caja',
  templateUrl: './close-caja.component.html',
  styleUrls: ['./close-caja.component.scss'],
})
export class CloseCajaComponent implements OnInit {
  @Input() corte: Corte | null = null;

  // Inicializamos el arreglo dataSelect para guardar los valores
  dataSelect: { uid: string; monto_inicio: number; estatus: string }[] = [];

  form = new FormGroup({
    uid: new FormControl(''),
    monto_inicio: new FormControl(null, [Validators.required]),
    estatus: new FormControl('', [Validators.required]),
    monto_final: new FormControl(null, [Validators.required]),  // Asegúrate de tener este campo
  });

  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    // Verificamos si corte no es nulo y si es un objeto
    if (this.corte) {
      // Si corte es un solo objeto, lo agregamos al arreglo
      if (Array.isArray(this.corte)) {
        console.log('Datos múltiples recibidos:', this.corte);
        this.corte.forEach((item) => {
          this.dataSelect.push({
            uid: item.uid,
            monto_inicio: item.monto_inicio,
            estatus: item.estatus,
          });
        });
      } else {
        // Si corte es un solo objeto, lo agregamos directamente
        console.log('Corte único recibido:', this.corte);
        this.dataSelect.push({
          uid: this.corte.uid,
          monto_inicio: this.corte.monto_inicio,
          estatus: this.corte.estatus,
        });
      }
    }
    console.log('Datos almacenados en dataSelect:', this.dataSelect);
    
    // Obtener el monto final del día y asignarlo al formulario
    this.firebaseSvc.getMontoFinalDia().subscribe(montoFinal => {
      console.log('Monto total del día:', montoFinal);
      this.form.get('monto_final')?.setValue(montoFinal);  // Asignar montoFinal al campo monto_final
    });
  }

  // Método para cancelar
  async cancelar() {
      this.utilSvc.dismissModal({ success: false });
  }

  // Método para confirmar
  async confirmar() {
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    // Accede correctamente al primer objeto de dataSelect para obtener uid y monto_inicio
    const uid = this.dataSelect[0]?.uid;
    const montoInicio = Number(this.dataSelect[0]?.monto_inicio);
    const montoFinal = Number(this.form.get('monto_final')?.value);
  
    console.log("uid: ", uid);  // Verifica el valor de uid
    console.log("monto_inicio: ", montoInicio);  // Verifica el valor de monto_inicio
    console.log("monto_final: ", montoFinal);  // Verifica el valor de monto_final
  
    if (montoFinal == null) {
      this.utilSvc.presentToast({
        message: 'El monto final no está disponible.',
        duration: 2000,
        color: 'danger',
      });
      return;
    }
  
    const ganancias = Number(montoFinal) + Number(montoInicio);
  
    console.log("Ganancias calculadas: ", ganancias);  // Verifica el valor de ganancias
  
    const updatedCorte = {
      monto_final: montoFinal,
      ganancias: ganancias,
      estatus: 'Caja cerrada',
    };
  
  
    const path = `corte_caja/${uid}`;
    console.log('Path para la actualización: ', path);  // Verifica el path
  
    try {
      await this.firebaseSvc.updateDocumet(path, updatedCorte);
  
      this.utilSvc.presentToast({
        message: 'Corte de caja actualizado exitosamente.',
        duration: 1500,
        color: 'success',
      });
  
      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al actualizar corte de caja.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }
}