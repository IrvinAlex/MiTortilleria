import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, AlertOptions, LoadingController, ModalController, ModalOptions, ToastController, ToastOptions, isPlatform } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { FacebookLogin } from '@capacitor-community/facebook-login';


@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  loadingctrl = inject(LoadingController);
  toastCtrl = inject(ToastController);
  modalCtrl = inject(ModalController);
  router = inject(Router);
  alertCtrl = inject(AlertController);


  async takePicture(promptLabelHeader: string){
    return await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      promptLabelHeader,
      promptLabelPhoto: 'Selecciona una imagen',
      promptLabelPicture: 'Toma una foto'
    });
  };

  async presentAlert(opts?: AlertOptions) {
    const alert = await this.alertCtrl.create(opts);
  
    await alert.present();
  }



  //===========Loading===============
  loading() {
    return this.loadingctrl.create({ spinner: 'crescent' })
  }

  //=========== Toast ===============

  async presentToast(opts?: ToastOptions) {
    const toast = await this.toastCtrl.create(opts);
    toast.present();
  }

  //=========== Enruta a cualquier pagina disponible ===============

  routerLink(url: string) {
    return this.router.navigateByUrl(url);
  }

  //=========== Guardar un elemento en localstorage ===============

  saveInLocalStorage(key: string, value: any) {
    return localStorage.setItem(key, JSON.stringify(value));
  }

  //=========== obtiene un elemento desde localstorage ===============

  getFromLocalStorage(key: string) {
    return JSON.parse(localStorage.getItem(key));
  }

  getCartFromLocalStorage() {
    return JSON.parse(localStorage.getItem('carrito'));
  }

  //=========== Modal ===============
  async presentModal(opts: ModalOptions){
    const modal = await this.modalCtrl.create(opts);

    await modal.present();
    const {data} = await modal.onWillDismiss();
    if(data) return data;
  }

  dismissModal(data?: any){
    return this.modalCtrl.dismiss(data);
  }

    /*===============LOCALSTORAGE===================*/

  /*===GET===*/
  setElementInLocalstorage(key: string, element: any) {
    return localStorage.setItem(key, JSON.stringify(element));
  }
  /*===SET===*/
  getElementFromLocalstorage(key: string) {
    return JSON.parse(localStorage.getItem(key));
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  initializeSocialLogins() {
    if (isPlatform('capacitor')) {
      GoogleAuth.initialize();
      FacebookLogin.initialize({ appId: '1238659450745177' });
    }
  }

  //=========== Check if user has address registered ===============
  hasUserAddress(): boolean {
    const direcciones = this.getFromLocalStorage("direccion");
    return direcciones && direcciones.length > 0;
  }

  //=========== Get user address ===============
  getUserAddress() {
    const direcciones = this.getFromLocalStorage("direccion");
    if (direcciones && direcciones.length > 0) {
      const geopoint = direcciones[0].geopoint;
      return {
        lat: (geopoint as any)._lat || geopoint.latitude,
        lng: (geopoint as any)._long || geopoint.longitude,
      };
    }
    return null;
  }
}
