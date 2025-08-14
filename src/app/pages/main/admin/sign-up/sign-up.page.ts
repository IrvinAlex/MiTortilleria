import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
/**
 * Componente de Registro de Usuario.
 * Este componente gestiona el proceso de registro de un nuevo usuario. Permite que el usuario ingrese su nombre, correo, y contraseña,
 * y luego los almacena en Firebase tras realizar las validaciones correspondientes.
 */
@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
})
export class SignUpPage implements OnInit {
  nombre: any;

  // Formulario reactivo para el registro de usuario
  form = new FormGroup({
    uid: new FormControl(''), // Control para el UID (único) del usuario
    email: new FormControl('', [Validators.required, Validators.email]), // Control para el correo electrónico con validación
    password: new FormControl('', [Validators.required, Validators.minLength(8)]), // Control para la contraseña con validación de longitud mínima
    name: new FormControl('', [Validators.required, Validators.minLength(4)]), // Control para el nombre con validación de longitud mínima
  });

  // Servicios inyectados para interactuar con Firebase y utilidades generales
  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  // Método de inicialización
  ngOnInit() {
    // Aquí se podría cargar información adicional o hacer configuración inicial si es necesario
  }

  //================ Método para Enviar el Formulario ====================

  /**
   * Método que se ejecuta cuando el usuario envía el formulario.
   * Verifica si el formulario es válido, luego realiza el registro del usuario con Firebase.
   * Si la creación es exitosa, actualiza la información del usuario en Firebase y lo redirige a la página principal.
   */
  async submit() {
    if (this.form.valid) {

      // Presentación de un indicador de carga
      const loading = await this.utilSvc.loading();
      await loading.present();

      // Intento de registro del usuario en Firebase
      this.firebaseSvc.signUp(this.form.value as User).then(async res => {
        // Si el registro es exitoso, se actualiza el nombre del usuario
        await this.firebaseSvc.updateUser(this.form.value.name);

        // Obtención del UID del usuario registrado y lo asigna al formulario
        let uid = res.user.uid;
        this.form.controls.uid.setValue(uid);

        // Se llama a la función para almacenar la información del usuario
        this.setUserInfo(uid);

      }).catch(error => {
        // Si ocurre un error, se muestra un mensaje de error
        this.utilSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: 'primary',
          position: 'middle',
          icon: 'alert-circle-outline'
        });

      }).finally(() => {
        // Se cierra el indicador de carga
        loading.dismiss();
      });
    }
  }

  //================ Método para Guardar Información del Usuario ====================

  /**
   * Método para guardar la información del usuario en Firebase una vez que el registro es exitoso.
   * Elimina la contraseña del formulario antes de enviarlo a Firebase.
   * Almacenará el nuevo documento en la ruta `users/{uid}` en Firebase y redirige a la página principal.
   */
  async setUserInfo(uid: string) {
    if (this.form.valid) {

      // Presentación de un indicador de carga
      const loading = await this.utilSvc.loading();
      await loading.present();

      let path = `users/${uid}`; // Ruta en Firebase para almacenar los datos del usuario

      // Eliminar la contraseña antes de guardar la información
      delete this.form.value.password;

      // Guardar los datos del usuario en Firebase
      this.firebaseSvc.setDocumet(path, this.form.value).then(async res => {
        // Almacenar la información del usuario en el almacenamiento local
        this.utilSvc.saveInLocalStorage('user', this.form.value);

        // Redirigir a la página principal
        this.utilSvc.routerLink('/main/home');

        // Resetear el formulario
        this.form.reset();

      }).catch(error => {
        // Si ocurre un error, se muestra un mensaje de error
  
        this.utilSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: 'primary',
          position: 'middle',
          icon: 'alert-circle-outline'
        });

      }).finally(() => {
        // Se cierra el indicador de carga
        loading.dismiss();
      });
    }
  }
}

