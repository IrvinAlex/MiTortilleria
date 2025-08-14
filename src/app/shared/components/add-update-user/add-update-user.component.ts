import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-user',
  templateUrl: './add-update-user.component.html',
  styleUrls: ['./add-update-user.component.scss'],
})
export class AddUpdateUserComponent implements OnInit {
  @Input() user: User | null = null;

  dataSelect = [];

  form = new FormGroup({
    uid: new FormControl(''),
    active_user: new FormControl('1'),
    name: new FormControl('', [Validators.required, Validators.minLength(4)]),
    father_Last_Name: new FormControl('', [Validators.required]),
    mother_Last_Name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    email_verified: new FormControl('1'),
    type_profile: new FormControl(null, [Validators.required]),
    password_Change: new FormControl('', [Validators.minLength(4)]),
    image: new FormControl(''), // Opcional
  });

  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    if (this.user) {
      const typeProfileNumber = this.getPermissions(this.user.type_profile);
      this.form.patchValue({
        ...this.user,
        type_profile: typeProfileNumber,
      });
    }
  }

  async takePicture() {
    const dataUrl = (await this.utilSvc.takePicture('Imagen del usuario')).dataUrl;
    this.form.controls.image.setValue(dataUrl);
  }

  async submit() {
    if (this.form.valid) {
      if (this.user) {
        await this.updateUser();
      } else {
        await this.createUser();
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

  async createUser() {
    const loading = await this.utilSvc.loading();
    await loading.present();

    try {
      let imageUrl = '';
      if (this.form.value.image) {
        const imagePath = `users/${Date.now()}`;
        imageUrl = await this.firebaseSvc.uploadImage(imagePath, this.form.value.image);
      }

      const newUser = {
        ...this.form.value,
        image: imageUrl,
        type_profile: Number(this.form.value.type_profile),
      };

      await this.firebaseSvc.addDocumentWithUid('users', newUser);

      this.utilSvc.presentToast({
        message: 'Usuario creado exitosamente.',
        duration: 1500,
        color: 'success',
      });

      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al crear usuario.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }

  async updateUser() {
    const loading = await this.utilSvc.loading();
    await loading.present();

    try {
      const uid = this.form.get('uid')?.value;
      const path = `users/${uid}`;
      let imageUrl = this.user?.image;

      if (this.form.get('image')?.value && this.form.get('image')?.value !== this.user?.image) {
        const imagePath = `users/${Date.now()}`;
        imageUrl = await this.firebaseSvc.uploadImage(imagePath, this.form.get('image')?.value);
      }

      const updatedUser = {
        ...this.form.value,
        image: imageUrl,
      };
      delete updatedUser.uid;

      await this.firebaseSvc.updateDocumet(path, updatedUser);

      this.utilSvc.presentToast({
        message: 'Usuario actualizado exitosamente.',
        duration: 1500,
        color: 'success',
      });

      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: 'Error al actualizar usuario.',
        duration: 2000,
        color: 'danger',
      });
      console.error(error);
    } finally {
      loading.dismiss();
    }
  }

  getPermissions(type_profile): void {
    let type_profile_number: number;
  
    // Mapeo de tipo de perfil a número
    switch (type_profile) {
      case 'Super administrador':
        type_profile_number = 1;
        break;
      case 'Administrador':
        type_profile_number = 2;
        break;
      default:
        type_profile_number = 3;
        break;
    }
  }

}