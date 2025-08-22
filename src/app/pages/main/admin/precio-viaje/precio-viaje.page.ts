import { Component, inject, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateTarifaComponent } from 'src/app/shared/components/add-update-tarifa/add-update-tarifa.component';

interface DistanceTariff {
  id?: string;
  rango_distancia: string;
  distancia_min: number;
  distancia_max: number;
  tarifa: number;
  activo: boolean;
}

interface FixedTariff {
  id?: string;
  precio: number;
  activo: boolean;
}

@Component({
  selector: 'app-precio-viaje',
  templateUrl: './precio-viaje.page.html',
  styleUrls: ['./precio-viaje.page.scss'],
})
export class PrecioViajePage implements OnInit {
  
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  
  tariffType: 'fixed' | 'distance' = 'distance';
  distanceTariffs: DistanceTariff[] = [];
  fixedTariff: FixedTariff = { precio: 50, activo: true };
  loading: boolean = false;
  
  // Calculator
  calculatorDistance: number = 0.5;
  calculatedFare: number = 0;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.loadTariffs();
  }

  async loadTariffs() {
    this.loading = true;
    try {
      // Load distance tariffs
      this.firebaseSvc.getCollectionData('tarifas_transporte').subscribe(tariffs => {
        this.distanceTariffs = (tariffs || []).map(tariff => ({
          id: tariff['id'],
          rango_distancia: tariff['rango_distancia'] || '',
          distancia_min: Number(tariff['distancia_min']) || 0,
          distancia_max: Number(tariff['distancia_max']) || 0,
          tarifa: Number(tariff['tarifa']) || 0,
          activo: Boolean(tariff['activo'])
        } as DistanceTariff)).sort((a, b) => a.distancia_min - b.distancia_min);
        this.calculateFare();
      });

      // Load fixed tariff
      this.firebaseSvc.getCollectionData('tarifa_fija').subscribe(fixedTariffs => {
        if (fixedTariffs && fixedTariffs.length > 0) {
          const firstTariff = fixedTariffs[0];
          this.fixedTariff = {
            id: firstTariff['id'],
            precio: Number(firstTariff['precio']) || 50,
            activo: Boolean(firstTariff['activo'])
          } as FixedTariff;
        }
        this.calculateFare();
      });
    } catch (error) {
      console.error('Error loading tariffs:', error);
      this.utilsSvc.presentToast({
        message: 'Error al cargar las tarifas',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
    } finally {
      this.loading = false;
    }
  }

  onTariffTypeChange() {
    this.calculateFare();
  }

  calculateFare() {
    if (this.tariffType === 'fixed') {
      this.calculatedFare = this.fixedTariff.precio || 0;
    } else {
      this.calculatedFare = this.calculateDistanceFare(this.calculatorDistance);
    }
  }

  calculateDistanceFare(distance: number): number {
    const tariff = this.distanceTariffs.find(t => 
      distance >= t.distancia_min && distance <= t.distancia_max && t.activo
    );
    return tariff ? tariff.tarifa : 0;
  }

  isRangeActive(tariff: DistanceTariff): boolean {
    return this.calculatorDistance >= tariff.distancia_min && 
           this.calculatorDistance <= tariff.distancia_max;
  }

  async openAddRangeModal(tariff?: DistanceTariff) {
    try {
      const modal = await this.modalCtrl.create({
        component: AddUpdateTarifaComponent,
        componentProps: { tarifa: tariff },
        cssClass: 'add-update-modal'
      });

      modal.onDidDismiss().then(result => {
        if (result?.data?.success) {
          this.loadTariffs();
        }
      });

      await modal.present();
    } catch (error) {
      console.error('Error opening modal:', error);
      this.utilsSvc.presentToast({
        message: 'Error al abrir el formulario',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
    }
  }

  async saveTariff(data: any, existingTariff?: DistanceTariff) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const distanciaMin = Number(data.distancia_min);
      const distanciaMax = Number(data.distancia_max);
      const tarifa = Number(data.tarifa);

      // Validate inputs
      if (distanciaMin < 0 || distanciaMax <= 0 || tarifa <= 0) {
        throw new Error('Todos los valores deben ser mayores a 0');
      }

      if (distanciaMax <= distanciaMin) {
        throw new Error('La distancia máxima debe ser mayor a la mínima');
      }

      // Check for overlapping ranges
      const existingTariffs = await this.firebaseSvc.getCollectionData('tarifas_transporte').toPromise();
      const hasOverlap = existingTariffs.some(existing => {
        if (existingTariff && existing['id'] === existingTariff.id) return false;
        
        const existingMin = Number(existing['distancia_min']);
        const existingMax = Number(existing['distancia_max']);
        
        return (distanciaMin < existingMax && distanciaMax > existingMin);
      });

      if (hasOverlap) {
        throw new Error('Ya existe una tarifa que se superpone con este rango');
      }

      const tarifaData = {
        distancia_min: distanciaMin,
        distancia_max: distanciaMax,
        tarifa: tarifa,
        activo: true,
        rango_distancia: `${distanciaMin} - ${distanciaMax} km`,
        fecha_actualizacion: new Date()
      };

      if (existingTariff && existingTariff.id) {
        await this.firebaseSvc.updateDocumet(`tarifas_transporte/${existingTariff.id}`, tarifaData);
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

      this.loadTariffs();
    } catch (error) {
      console.error('Error saving tariff:', error);
      this.utilsSvc.presentToast({
        message: error.message || 'Error al guardar la tarifa',
        duration: 3000,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
    } finally {
      loading.dismiss();
    }
  }

  async editTariff(tariff: DistanceTariff) {
    await this.openAddRangeModal(tariff);
  }

  async deleteTariff(tariff: DistanceTariff) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar la tarifa para ${tariff.rango_distancia}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            const loading = await this.utilsSvc.loading();
            await loading.present();

            try {
              await this.firebaseSvc.deleteDocumet(`tarifas_transporte/${tariff.id}`);
              this.utilsSvc.presentToast({
                message: 'Tarifa eliminada exitosamente',
                duration: 2500,
                color: 'success',
                position: 'bottom',
                icon: 'checkmark-circle-outline'
              });
            } catch (error) {
              console.error('Error deleting tariff:', error);
              this.utilsSvc.presentToast({
                message: 'Error al eliminar la tarifa',
                duration: 2500,
                color: 'danger',
                position: 'bottom',
                icon: 'alert-circle-outline'
              });
            } finally {
              loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async saveFixedTariff() {
    if (!this.fixedTariff.precio || this.fixedTariff.precio <= 0) {
      this.utilsSvc.presentToast({
        message: 'Por favor ingresa un precio válido',
        duration: 2500,
        color: 'warning',
        position: 'bottom',
        icon: 'warning-outline'
      });
      return;
    }

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const tarifaData = {
        precio: Number(this.fixedTariff.precio),
        activo: true,
        fecha_actualizacion: new Date()
      };

      if (this.fixedTariff.id) {
        await this.firebaseSvc.updateDocumet(`tarifa_fija/${this.fixedTariff.id}`, tarifaData);
      } else {
        const result = await this.firebaseSvc.addDocument('tarifa_fija', tarifaData);
        this.fixedTariff.id = result.id;
      }

      this.utilsSvc.presentToast({
        message: 'Tarifa fija guardada exitosamente',
        duration: 2500,
        color: 'success',
        position: 'bottom',
        icon: 'checkmark-circle-outline'
      });

      this.calculateFare();
    } catch (error) {
      console.error('Error saving fixed tariff:', error);
      this.utilsSvc.presentToast({
        message: 'Error al guardar la tarifa fija',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
    } finally {
      loading.dismiss();
    }
  }
}

