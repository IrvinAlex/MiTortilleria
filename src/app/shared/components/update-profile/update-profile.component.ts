import { Component, inject, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { User } from 'src/app/models/user.model';
import { UtilsService } from 'src/app/services/utils.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from 'src/app/services/firebase.service';

@Component({
  selector: 'app-update-profile',
  templateUrl: './update-profile.component.html',
  styleUrls: ['./update-profile.component.scss'],
})
export class UpdateProfileComponent implements OnInit {
  @Input() userForm: User; // Recibe los datos enviados al modal
  form: FormGroup;
  passwordVisible: boolean = false; 

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  constructor(private modalController: ModalController) {}

  cerrarModal() {
    this.modalController.dismiss();
  }

  ngOnInit() {
  
    this.form = new FormGroup({
      uid: new FormControl(''),
      name: new FormControl(this.userForm?.name, [Validators.required, Validators.minLength(3)]),
      mother_Last_Name: new FormControl(this.userForm?.mother_Last_Name),
      father_Last_Name: new FormControl(this.userForm?.father_Last_Name),
      email: new FormControl(this.userForm?.email, [Validators.required, Validators.email]),
      image: new FormControl(this.userForm?.image),
      negocio: new FormControl(this.userForm?.isBusiness)
    });
    
    this.updateApellidoValidators();
    this.form.get('email')?.disable();
  }

  get isNegocio(): boolean {
    if (this.userForm.type_profile === 3) {
      return this.form.get('negocio')?.value;
    } else {
      
      return false;
    }
    
  }

  get headerTitle(): string {
    // Usamos un getter para devolver el título basado en el valor de 'isNegocio'
    if (this.isNegocio === true) {
      return 'Actualizar negocio';  // Si es negocio, ponemos este título
    } else {
      return this.userForm ? 'Actualizar usuario' : 'Agregar usuario'; // Sino, depende del estado del 'userForm'
    }
  }

  // Método para actualizar los validadores condicionalmente
  updateApellidoValidators() {
    const isNegocio = this.isNegocio;

    if (this.isNegocio === true) {
      // Si es negocio, los apellidos no son requeridos
      this.form.get('mother_Last_Name')?.clearValidators();
      this.form.get('father_Last_Name')?.clearValidators();
    } else {
      // Si no es negocio, los apellidos son requeridos
      this.form.get('mother_Last_Name')?.setValidators([Validators.required]);
      this.form.get('father_Last_Name')?.setValidators([Validators.required]);
    }

    // Actualizar el estado de validación
    this.form.get('mother_Last_Name')?.updateValueAndValidity();
    this.form.get('father_Last_Name')?.updateValueAndValidity();
  }


  async takePicture() {
    const dataUrl = (await this.utilsSvc.takePicture('Imagen del usuario')).dataUrl;
    this.form.get('image')?.setValue(dataUrl);
  }

  async submit() {
    if (this.form.valid) {
      if (this.userForm) {
        await this.updateUser();
      } else {
        console.log('Funcionalidad para crear usuario aún no implementada.');
      }
    }
  }

  async resetPassword() {
    const email = this.userForm?.email || this.form.get('email')?.value;

    if (!email) {
      this.utilsSvc.presentToast({
        message: 'No hay un correo válido para enviar el enlace.',
        duration: 2000,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
      return;
    }

    const loading = await this.utilsSvc.loading();
    await loading.present();

    this.firebaseSvc.sendRecoveryEmail(email)
      .then(() => {
        this.utilsSvc.presentToast({
          message: 'Correo de restablecimiento enviado.',
          duration: 1500,
          color: 'primary',
          position: 'middle',
          icon: 'mail-outline',
        });
      })
      .catch((error) => {
        this.utilsSvc.presentToast({
          message: error?.message || 'No se pudo enviar el correo.',
          duration: 2500,
          color: 'danger',
          position: 'middle',
          icon: 'alert-circle-outline',
        });
      })
      .finally(() => loading.dismiss());
  }

  async updateUser() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const path = `users/${this.userForm.uid}`;

      // Manejo de imagen
      if (this.form.get('image')?.value !== this.userForm.image) {
        const imagePath = `users/${Date.now()}`;
        const imageUrl = await this.firebaseSvc.uploadImage(imagePath, this.form.get('image')?.value);
        this.form.get('image')?.setValue(imageUrl);
      }

      // Prepara los datos actualizados
      const updatedUser = { ...this.form.value };
      delete updatedUser.uid; // No se actualiza el UID
      delete updatedUser.password_Change; // Contraseñas manejadas de forma separada

      // Actualizar en Firebase
      await this.firebaseSvc.updateDocumet(path, updatedUser);

      // Notificación de éxito
      this.utilsSvc.presentToast({
        message: `Usuario actualizado exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline',
      });

      this.modalController.dismiss({ success: true, data: updatedUser });
    } catch (error) {
      // Manejo de errores
      let message = 'Error al actualizar usuario.';
      if (error.code === 'auth/weak-password') {
        message = 'La contraseña es demasiado débil.';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Por favor, inicia sesión nuevamente para actualizar tus credenciales.';
      }

      this.utilsSvc.presentToast({
        message,
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
    } finally {
      loading.dismiss();
    }
  }
}
