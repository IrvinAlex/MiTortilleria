import { Component, inject, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { TermsComponent } from 'src/app/shared/components/terms/terms.component';
import { UpdateProfileComponent } from 'src/app/shared/components/update-profile/update-profile.component';
import { AddUpdateUserComponent } from 'src/app/shared/components/add-update-user/add-update-user.component';

/**
 * Página de perfil del usuario.
 * Este componente gestiona la visualización y actualización del perfil del usuario, incluida la foto de perfil
 * y la edición de datos del usuario.
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {

  /** Tipo de perfil del usuario (Super Administrador, Administrador, Usuario). */
  tipo_perfil: any;

  /** Instancia de FirebaseService para interactuar con la base de datos en Firebase. */
  firebaseSvc = inject(FirebaseService);

  /** Instancia de UtilsService para utilidades comunes, como tomar fotos o manejar almacenamiento local. */
  utilSvc = inject(UtilsService);

  /** Instancia de ModalController para gestionar modales. */
  modalCtrl = inject(ModalController);

  /**
   * Inicializa el componente.
   * Determina el tipo de perfil del usuario y lo asigna a la variable `tipo_perfil`.
   */
  ngOnInit() {
    // Se asigna el tipo de perfil según el valor almacenado en el perfil del usuario.
    if (this.user().type_profile == 1) {
      this.tipo_perfil = 'Super administrador';
    } else if (this.user().type_profile == 2) {
      this.tipo_perfil = 'Administrador';
    } else if (this.user().type_profile == 3) {
      this.tipo_perfil = 'Usuario';
    }
  }

  /**
   * Recupera el usuario desde el almacenamiento local.
   * 
   * @returns El objeto usuario almacenado en localStorage.
   */
  user(): User {
    return this.utilSvc.getFromLocalStorage('user');
  }

  // ==================== Tomar/Seleccionar Imagen ====================
  /**
   * Permite al usuario tomar o seleccionar una foto de perfil.
   * Utiliza el servicio `UtilsService` para capturar una imagen y luego la sube a Firebase.
   */
  async takePicture() {
    let user = this.user();  // Obtiene el usuario desde el almacenamiento local.
    let path = `users/${user.uid}`;  // Ruta donde se almacenará la imagen en Firebase.

    // Llama al servicio para tomar la foto y obtener la URL de la imagen.
    const dataUrl = (await this.utilSvc.takePicture('Imagen del producto')).dataUrl;

    const loading = await this.utilSvc.loading();  // Muestra un indicador de carga mientras se procesa la imagen.
    await loading.present();

    // Ruta de la imagen en Firebase.
    let imagePath = `${user.uid}/profile`;

    // Sube la imagen a Firebase y actualiza el perfil del usuario con la nueva URL de la imagen.
    user.image = await this.firebaseSvc.uploadImage(imagePath, dataUrl);

    // Actualiza el documento del usuario en Firebase con la nueva imagen.
    this.firebaseSvc.updateDocumet(path, { image: user.image }).then(async res => {
      
      // Guarda el usuario actualizado en el almacenamiento local.
      this.utilSvc.saveInLocalStorage('user', user);

      // Muestra un mensaje de éxito cuando la imagen se actualiza correctamente.
      this.utilSvc.presentToast({
        message: `Imagen actualizada exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      });

    }).catch(error => {
      // Muestra un mensaje de error si algo sale mal durante la actualización.
      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      });

    }).finally(() => {
      loading.dismiss();  // Oculta el indicador de carga.
    });
  }

  /**
   * Abre el modal para mostrar los términos y condiciones.
   * Llama al servicio `UtilsService` para presentar el modal con el componente `TermsComponent`.
   */
  async terms() {
    let success = await this.utilSvc.presentModal({
      component: TermsComponent,  // Componente que muestra los términos y condiciones.
      cssClass: 'app-terms',  // Clase CSS personalizada para el modal.
      componentProps: {}  // Propiedades adicionales (vacías en este caso).
    });
  }

  /**
   * Abre el modal para actualizar el perfil del usuario.
   * Llama al servicio `UtilsService` para presentar el modal con el componente `UpdateProfileComponent`.
   */
  async actualizarPerfilmodal() {
    let success = await this.utilSvc.presentModal({
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
   * Abre el modal para agregar o actualizar un usuario.
   * Recarga el almacenamiento local con los datos actualizados después de cerrar el modal.
   */
  async openAddUpdateUserModal() {
    const modal = await this.utilSvc.presentModal({
      component: AddUpdateUserComponent,
      componentProps: {
        user: this.user(), // Pasa el usuario actual si se va a editar
      },
    });

    if (modal?.success) {
      // Si el modal fue exitoso, recarga los datos del usuario
      this.reloadUserFromFirebase();
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
        this.utilSvc.saveInLocalStorage('user', updatedUser);


        this.utilSvc.presentToast({
          message: 'Perfil actualizado correctamente.',
          duration: 1500,
          color: 'success',
          position: 'middle',
          icon: 'checkmark-circle-outline',
        });
      }
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al recargar el perfil.',
        duration: 2000,
        color: 'danger',
        position: 'middle',
      });
      console.error(error);
    }
  }

  /**
   * Devuelve el nombre del perfil basado en el tipo.
   * @param type_profile Número que representa el tipo de perfil.
   */
  getTipoPerfil(type_profile: number): string {
    switch (type_profile) {
      case 1:
        return 'Super administrador';
      case 2:
        return 'Administrador';
      case 3:
        return 'Usuario';
      default:
        return 'Desconocido';
    }
  }
}