import { Component, OnInit, inject } from '@angular/core';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ModalController } from '@ionic/angular';
import { DireccionPage } from '../direccion/direccion.page';
import { User } from 'src/app/models/user.model';
import { Direccion } from 'src/app/models/direccion.model';
import { TermsComponent } from 'src/app/shared/components/terms/terms.component';
import { Geolocation } from '@capacitor/geolocation';
import { UpdateProfileComponent } from 'src/app/shared/components/update-profile/update-profile.component';
import { Coupon } from 'src/app/models/coupon.model';
import { CouponService } from 'src/app/services/coupon.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {

  firebaseSvc = inject(FirebaseService);  // Servicio para interactuar con Firebase
  utilsSvc = inject(UtilsService);  // Servicio utilitario para acciones comunes
  modalCtrl = inject(ModalController);  // Controlador de modales
  couponSvc = inject(CouponService);

  tipo_perfil: string;  // Tipo de perfil del usuario (por ejemplo: administrador, doctor)
  isDireccionVacia: boolean = false;  // Bandera para verificar si la dirección está vacía
  coupons: Coupon[] = [];
  notificationCount = 0;
  showNotifications = false;
  staticNotifications: { title: string; message: string; icon?: string; date?: Date }[] = [];

  async ngOnInit() {
    // Verifica si la aplicación tiene permisos para acceder a la ubicación
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location !== 'granted') {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        return;
      }
    }
    // Verifica si la dirección está vacía
    this.isDireccionVacia = this.checkIfDireccionIsEmpty();

    // Asigna el tipo de perfil según el tipo de usuario
    if (this.user().type_profile == 1) {
      this.tipo_perfil = 'Super administrador';
    } else if (this.user().type_profile == 2) {
      this.tipo_perfil = 'Administrador';
    } else if (this.user().type_profile == 3) {
      this.tipo_perfil = 'Usuario';
    }
    this.subscribeCoupons(); // Notificaciones de cupones activos
  }

  // Obtiene los datos del usuario desde el almacenamiento local
  user(): User {
    return this.utilsSvc.getFromLocalStorage("user");
  }

  // Obtiene la dirección del usuario desde el almacenamiento local (si existe)
  dir(): Direccion {
    return this.utilsSvc.getFromLocalStorage("direccion") || {};  // Devuelve un objeto vacío si no existe
  }

  // Verifica si la dirección está vacía
  checkIfDireccionIsEmpty(): boolean {
    const direccion = this.dir();
    return !direccion || Object.keys(direccion).length === 0;  // Devuelve true si está vacío
  }

  // Función para actualizar los datos del usuario cuando se hace un "pull to refresh"
  doRefresh(event) {
    setTimeout(() => {
      this.user();
      this.dir();
      this.isDireccionVacia = this.checkIfDireccionIsEmpty();
     // Los cupones se actualizan por stream; solo mantenemos el conteo
      event.target.complete();  // Completa la acción de refresco
    }, 1000);
  }

  //================ Tomar o Seleccionar imagen =================
  async takeImage() {
    let user = this.user();  // Obtiene los datos del usuario

    let path = `users/${user.uid}`;  // Ruta en la base de datos de Firebase

    // Toma la imagen del perfil a través de la función utilitaria
    const dataUrl = (await this.utilsSvc.takePicture('Imagen de perfil')).dataUrl;

    const loading = await this.utilsSvc.loading();  // Muestra un indicador de carga
    await loading.present();

    let imagePath = `/users/${user.uid}`;  // Define la ruta donde se almacenará la imagen en Firebase
    user.image = await this.firebaseSvc.uploadImage(imagePath, dataUrl);  // Sube la imagen a Firebase

    // Actualiza el documento del usuario en Firebase con la nueva imagen
    this.firebaseSvc.updateDocumet(path, { image: user.image }).then(async res => {
      this.utilsSvc.saveInLocalStorage('user', user);  // Guarda la nueva imagen en el almacenamiento local

      // Muestra un mensaje de éxito
      this.utilsSvc.presentToast({
        message: 'Imagen actualizada correctamente',
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });

    }).catch(error => {
    

      // Si ocurre un error, muestra un mensaje de error
      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      });

    }).finally(() => {
      loading.dismiss();  // Desmonta el indicador de carga
    });
  }

  // Redirige a la página para que el usuario pueda actualizar su dirección
  async direccion() {
    this.utilsSvc.presentToast({
      message: 'Pulsa el marcador y arrástralo hasta tu ubicación exacta',
      duration: 3500,
      color: 'tertiary',
      position: 'bottom',
      icon: 'navigate-circle-outline'
    });
    if (this.user().type_profile == 1) {
      this.utilsSvc.routerLink('main/direccion-superadmin');  // Redirige a la página de dirección
    }
    else {
      this.utilsSvc.routerLink('main/direccion');  // Redirige a la página de dirección
    }
  }

  // Muestra un modal con los términos y condiciones
  async terms() {
    let success = await this.utilsSvc.presentModal({
      component: TermsComponent,
      cssClass: 'app-terms',
      componentProps: { }

    });
    // Aquí se podría manejar el éxito de la modal si fuera necesario
  }

  async actualizarPerfilmodal() {
    let success = await this.utilsSvc.presentModal({
      component: UpdateProfileComponent,  // Componente para editar el perfil del usuario.
      componentProps: {
        userForm: this.user()
      }  // Propiedades adicionales (vacías en este caso).
    });

    if (success) {
      this.reloadUserFromFirebase(); // Recarga el perfil con los datos actualizados
    }
  }

  /**
   * Recarga el usuario desde Firebase y actualiza el `localStorage`.
   */
  async reloadUserFromFirebase() {
    const user = this.user(); // Obtiene el usuario actual desde el `localStorage`

    try {
      // Recupera los datos actualizados del usuario desde Firebase
      const updatedUser = await this.firebaseSvc.getDocument(`users/${user.uid}`);
      
      if (updatedUser) {
        // Actualiza el almacenamiento local con los datos actualizados
        this.utilsSvc.saveInLocalStorage('user', updatedUser);


        this.utilsSvc.presentToast({
          message: 'Perfil actualizado correctamente.',
          duration: 1500,
          color: 'success',
          position: 'middle',
          icon: 'checkmark-circle-outline',
        });
      }
    } catch (error) {
      this.utilsSvc.presentToast({
        message: 'Error al recargar el perfil.',
        duration: 2000,
        color: 'danger',
        position: 'middle',
      });
    }
  }

  private subscribeCoupons() {
    const uid = this.user()?.uid;
    if (!uid) return;
    this.couponSvc.getActiveCoupons(uid).subscribe(cupons => {
      this.coupons = cupons.map(c => ({
        ...c,
        expira: (c as any)?.expira?.toDate ? (c as any).expira.toDate() : c.expira
      }));
      this.notificationCount = this.coupons.length;
    });
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications && this.notificationCount === 0) {
      this.utilsSvc.presentToast({
        message: 'No tienes notificaciones por ahora.',
        duration: 1800,
        color: 'medium',
        position: 'middle',
        icon: 'notifications-off-outline'
      });
    }
  }

  // trackBy para mejorar rendimiento
  trackByCouponId(index: number, item: Coupon) {
    return item?.id || item?.codigo || index;
  }
  trackByStaticNotif(index: number, item: { title: string }) {
    return item?.title || index;
  }

  // Enviar un cupón de ejemplo al usuario actual
  async sendDemoCoupon() {
    const u = this.user();
    if (!u?.uid) return;
    const addDays = (d: number) => {
      const dt = new Date();
      dt.setDate(dt.getDate() + d);
      dt.setHours(23, 59, 59, 999);
      return dt;
    };
    const codigo = `DEMO${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await this.couponSvc.sendCoupon({
        uid: u.uid,
        codigo,
        descripcion: 'Cupón de ejemplo: descuento en tu próxima compra',
        porcentaje: 20,
        numero_compras: 1,
        minimo_compra: 100,
        expira: addDays(7),
      });
      this.utilsSvc.presentToast({
        message: `Cupón ${codigo} enviado`,
        duration: 2000,
        color: 'success',
        position: 'middle',
        icon: 'gift-outline',
      });
      this.showNotifications = true; // abrir sección para ver el cupón recién creado
    } catch (e) {
      this.utilsSvc.presentToast({
        message: 'No se pudo enviar el cupón',
        duration: 2000,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
    }
  }

  // Construye una notificación estática de ejemplo
  private buildStaticNotifications() {
    const expira = new Date();
    expira.setDate(expira.getDate() + 14);
    this.staticNotifications = [{
      title: 'Cupón de bienvenida',
      message: 'Tienes un cupón del 15% en tu siguiente compra. Mínimo $150.',
      icon: 'pricetags-outline',
      date: expira
    }];
    // Actualiza el badge al iniciar
    this.notificationCount = this.coupons.length + this.staticNotifications.length;
  }
}

