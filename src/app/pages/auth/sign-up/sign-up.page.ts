import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as CryptoJS from 'crypto-js';
import { HttpClient } from '@angular/common/http';

import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { EmailService } from 'src/app/services/email.service';
import { Consultory } from 'src/app/models/consultory.model';
import { User } from 'src/app/models/user.model';
import { Direccion } from 'src/app/models/direccion.model';
import { set } from 'date-fns';
import { NavController } from '@ionic/angular';
import { Terms2Component } from 'src/app/shared/components/terms/terms2.component';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
})
export class SignUpPage implements OnInit {
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  emailSvc = inject(EmailService);
  http = inject(HttpClient);
  consultory: Consultory[] = [];
  direccion: Direccion;
  carrito: any;
  carrito_eventos: any;
  carrito_negocio: any;
  isTaqueriaChecked: boolean = false;
  nameLabel = 'Nombre';

  passwordStrength: string = '';

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(30)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(30)]),
    name: new FormControl(null, [Validators.required, Validators.maxLength(30)]),
    mother_Last_Name: new FormControl('', [Validators.maxLength(30)]),
    father_Last_Name: new FormControl('', [Validators.maxLength(30)]),
    email_verified: new FormControl(''),
    password_Change: new FormControl(''),
    image: new FormControl(''),
    type_profile: new FormControl(),
    active_user: new FormControl('1'),
    isBusiness: new FormControl(false),
    acceptedTerms: new FormControl(false, Validators.requiredTrue),
    acceptedPrivacy: new FormControl(false, Validators.requiredTrue),
    acceptedAll: new FormControl(false, Validators.requiredTrue),
  });

  form_carrito = new FormGroup({
    total: new FormControl(0)
  });

  form_carrito_eventos = new FormGroup({
    total: new FormControl(0)
  });

  form_carrito_negocio = new FormGroup({
    total: new FormControl(0)
  });

  constructor(private navCtrl: NavController) { }
  ngOnInit() {
    }
    
  // Método para prevenir escritura adicional cuando se alcanza el límite
  preventExtraInput(event: any, maxLength: number): boolean {
    if (!event || !event.target) return true;
    
    const currentLength = event.target.value ? event.target.value.length : 0;
    
    // Permitir teclas especiales (backspace, delete, arrow keys, etc.)
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown'
    ];
    
    // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
    if (event.ctrlKey && event.key && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase())) {
      return true;
    }
    
    // Si no es una tecla especial y ya se alcanzó el límite, prevenir la entrada
    if (!allowedKeys.includes(event.key) && currentLength >= maxLength) {
      event.preventDefault();
      return false;
    }
    
    return true;
  }

    // Método para manejar el cambio del checkbox
  onIsBusinessChange(event: any) {
    this.isTaqueriaChecked = event.detail.checked; // Actualiza el estado del checkbox
    this.nameLabel = this.isTaqueriaChecked ? 'Nombre del negocio' : 'Nombre'; // Cambia el texto del label
  }

  // Método para validar entrada de nombres (solo letras y espacios)
  onNameInput(event: any) {
    if (!event || !event.target) return;
    
    let value = event.target.value || '';
    
    // Limitar a 30 caracteres primero
    if (value.length > 30) {
      value = value.substring(0, 30);
      event.target.value = value; // Actualizar el input visual inmediatamente
    }
    
    // Remover caracteres especiales y números, solo permitir letras y espacios
    value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    
    // Aplicar límite nuevamente después de filtrar caracteres
    if (value.length > 30) {
      value = value.substring(0, 30);
    }
    
    if (this.form && this.form.controls && this.form.controls.name) {
      this.form.controls.name.setValue(value);
    }
    event.target.value = value; // Sincronizar el input visual
  }

  // Método para validar apellidos
  onLastNameInput(event: any, controlName: string) {
    if (!event || !event.target || !controlName) return;
    
    let value = event.target.value || '';
    
    // Limitar a 30 caracteres primero
    if (value.length > 30) {
      value = value.substring(0, 30);
      event.target.value = value; // Actualizar el input visual inmediatamente
    }
    
    // Remover caracteres especiales y números, solo permitir letras y espacios
    value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    
    // Aplicar límite nuevamente después de filtrar caracteres
    if (value.length > 30) {
      value = value.substring(0, 30);
    }
    
    if (this.form && this.form.controls && this.form.controls[controlName]) {
      this.form.controls[controlName].setValue(value);
    }
    event.target.value = value; // Sincronizar el input visual
  }

  // Método para validar entrada de email
  async onEmailInput(event: any) {
    if (!event || !event.target) return;
    
    let value = event.target.value || '';
    
    // Limitar a 30 caracteres primero
    if (value.length > 30) {
      value = value.substring(0, 30);
      event.target.value = value; // Actualizar el input visual inmediatamente
      if (this.form && this.form.controls && this.form.controls.email) {
        this.form.controls.email.setValue(value);
      }
      return;
    }
    
    // Remover caracteres especiales no permitidos en emails
    value = value.replace(/[^a-zA-Z0-9@._-]/g, '');
    
    // Aplicar límite nuevamente después de filtrar caracteres
    if (value.length > 30) {
      value = value.substring(0, 30);
    }
    
    if (this.form && this.form.controls && this.form.controls.email) {
      this.form.controls.email.setValue(value);
    }
    event.target.value = value; // Sincronizar el input visual

    // Verificar email si tiene formato válido
    if (value.includes('@') && value.includes('.') && value.length > 5) {
      try {
        await this.verifyEmailExists(value);
      } catch (error) {
        console.error('Error verifying email:', error);
      }
    }
  }

  // Validación avanzada de contraseña
  validatePassword(password: string): string {
    if (!password) return 'Débil';

    const minLength = 12;
    const strongLength = 14;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*\-_\+=\?]/.test(password);

    // Palabras y patrones prohibidos
    const forbiddenPatterns = [
      /miempresa/i, /tortilleria/i, /platajaimes/i, /password/i, /contraseña/i,
      /123456/, /qwerty/, /asdf/, /letras/, /numeros/, /admin/i,
      /\d{8,}/, // números largos
      /(.)\1{3,}/, // repetidos
      /[A-Za-z]+202[0-9]/, // nombre + año
      /[A-Za-z]+123/, // nombre + 123
      /firulais/i, /maria/i, /omar/i, /leo/i, /futbol/i,
      /test|fake|dummy|example/i,
      /16081995/, /ABC1234/, /Futbol#1/,
      // Secuencias de teclado
      /qwertyui/, /asdf1234/, /asdf/, /qwerty/,
      // Matrícula, PIN, teléfono
      /\d{7,}/, /[A-Z]{3,}\d{3,}/,
      // Secuencias simples
      /1234/, /2345/, /3456/, /4567/, /5678/, /6789/, /7890/,
      /abcd/, /bcde/, /cdef/, /defg/, /efgh/, /fghi/, /ghij/,
      // Datos personales obvios
      /Google202\d/, /Omar\d{4}/, /Maria\d{4}/, /Leo202\d/, /Futbol#1/,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(password)) return 'Fácil';
    }

    // Detectar secuencias numéricas y alfabéticas de 4 o más caracteres
    const isSequential = (str: string) => {
      // numérico ascendente
      for (let i = 0; i < str.length - 3; i++) {
        const sub = str.substring(i, i + 4);
        if (/^\d+$/.test(sub)) {
          const nums = sub.split('').map(Number);
          if (nums[1] === nums[0] + 1 && nums[2] === nums[1] + 1 && nums[3] === nums[2] + 1) return true;
        }
      }
      // alfabético ascendente
      for (let i = 0; i < str.length - 3; i++) {
        const sub = str.substring(i, i + 4);
        if (/^[a-zA-Z]+$/.test(sub)) {
          const codes = sub.split('').map(c => c.charCodeAt(0));
          if (codes[1] === codes[0] + 1 && codes[2] === codes[1] + 1 && codes[3] === codes[2] + 1) return true;
        }
      }
      return false;
    };
    if (isSequential(password)) return 'Fácil';

    if (password.length < minLength || /^[a-zA-Z]+$/.test(password) || /^\d+$/.test(password)) {
      return 'Débil';
    }
    if (password.length === minLength && hasUpper && hasLower && hasNumber) {
      return 'Media';
    }
    if (password.length > minLength && hasUpper && hasLower && hasNumber && !hasSymbol) {
      return 'Aceptable';
    }
    if (
      password.length >= strongLength &&
      hasUpper && hasLower && hasNumber && hasSymbol
    ) {
      return 'Fuerte';
    }
    return 'Media';
  }

  // Actualiza el indicador de seguridad y valida requisitos mínimos
  onPasswordInput(event: any) {
    if (!event || !event.target) return;

    let value = event.target.value || '';

    // Limitar a 30 caracteres primero
    if (value.length > 30) {
      value = value.substring(0, 30);
      event.target.value = value;
    }

    value = value.replace(/\s/g, '');

    if (value.length > 30) {
      value = value.substring(0, 30);
    }

    if (this.form && this.form.controls && this.form.controls.password) {
      this.form.controls.password.setValue(value);
    }
    event.target.value = value;

    this.passwordStrength = this.validatePassword(value);

    // Actualizar reglas visuales en tiempo real usando el valor actual
    this.updatePasswordRules(value);
  }

  updatePasswordRules(value: string) {
    this.rules.length = value.length >= 12; // mínimo 12 caracteres
    this.rules.upper = /[A-Z]/.test(value);
    this.rules.lower = /[a-z]/.test(value);
    this.rules.number = /\d/.test(value);
    // Símbolos permitidos exactamente como en la imagen
    this.rules.symbol = /[!"#%()*+,\-\.\/:=\?@\[\]\^_`{}]/.test(value);
  }

  // Verificar si el email existe usando API externa
  private async verifyEmailExists(email: string): Promise<boolean> {
    try {
      // Validar formato básico primero
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return false;
      }

      // Usar API de verificación de email (Hunter.io o similar)
      const apiKey = 'your-api-key'; // Necesitarás obtener una API key
      const apiUrl = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${apiKey}`;
      
      const response = await this.http.get(apiUrl).toPromise();
      const result: any = response;
      
      if (result.data && result.data.result) {
        const isValid = result.data.result === 'deliverable';
        
        // Actualizar validadores del formulario
        if (!isValid) {
          this.form.controls.email.setErrors({ emailNotExists: true });
        } else {
          // Remover error si el email es válido
          const errors = this.form.controls.email.errors;
          if (errors && errors['emailNotExists']) {
            delete errors['emailNotExists'];
            this.form.controls.email.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
        
        return isValid;
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying email:', error);
      // Usar validación alternativa más simple si la API falla
      return await this.validateEmailWithSimpleAPI(email);
    }
  }

  // Validación alternativa simple
  private async validateEmailWithSimpleAPI(email: string): Promise<boolean> {
    try {
      // Validar formato básico
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        this.form.controls.email.setErrors({ emailNotExists: true });
        return false;
      }

      // Validar dominios comunes conocidos
      const commonDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
        'live.com', 'icloud.com', 'protonmail.com', 'aol.com'
      ];
      
      const domain = email.split('@')[1]?.toLowerCase();
      
      if (!commonDomains.includes(domain)) {
        this.form.controls.email.setErrors({ emailNotExists: true });
        return false;
      }

      // Validar que no sea solo caracteres aleatorios
      const localPart = email.split('@')[0];
      
      // Rechazar si es muy corto (ajustado para límite de 30 caracteres)
      if (localPart.length < 3 || localPart.length > 25) {
        this.form.controls.email.setErrors({ emailNotExists: true });
        return false;
      }

      // Rechazar patrones obviamente falsos
      const suspiciousPatterns = [
        /^[a-z]{8,}$/i, // Solo letras consecutivas largas (ajustado)
        /^[0-9]{4,}$/,   // Solo números largos (ajustado)
        /^(.)\1{3,}/,    // Caracteres repetidos (ajustado)
        /test|fake|dummy|example/i // Palabras comunes de prueba
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(localPart)) {
          this.form.controls.email.setErrors({ emailNotExists: true });
          return false;
        }
      }

      // Si pasa todas las validaciones, remover error
      const errors = this.form.controls.email.errors;
      if (errors && errors['emailNotExists']) {
        delete errors['emailNotExists'];
        this.form.controls.email.setErrors(Object.keys(errors).length ? errors : null);
      }

      return true;
    } catch (error) {
      console.error('Error in simple email validation:', error);
      return false;
    }
  }

  // Validar si el email existe en Firebase
  private async checkEmailExists(email: string): Promise<boolean> {
    try {
      const result = await this.firebaseSvc.checkEmailExists(email);
      return result;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  }

  // Validar si el email es real usando API
  private async validateEmailWithAPI(email: string): Promise<boolean> {
    return await this.verifyEmailExists(email);
  }

  // Método para cifrar contraseña con mayor seguridad
  private encryptPassword(password: string): string {
    const secretKey = 'MiTortilleria2024#SecureKey!@#$';
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const key = CryptoJS.PBKDF2(secretKey, salt, {
      keySize: 256/32,
      iterations: 1000
    });
    
    const encrypted = CryptoJS.AES.encrypt(password, key.toString()).toString();
    return salt.toString() + ':' + encrypted;
  }

 async submit() {
    if (this.form.valid) {
      // Validar contraseña fácil antes de continuar
      const password = this.form.value.password;
      const passwordStrength = this.validatePassword(password);
      if (passwordStrength === 'Fácil') {
        this.utilsSvc.presentToast({
          message: '⚠️ Advertencia: La contraseña es fácil de adivinar. Evita datos obvios, secuencias o palabras comunes.',
          duration: 4000,
          color: 'danger',
          icon: 'alert-circle-outline',
        });
        return; // No permite el registro
      }

      const loading = await this.utilsSvc.loading();
      await loading.present();
      
      try {
        const email = this.form.value.email;
        
        // Validar email con API
        const isValidEmail = await this.validateEmailWithAPI(email);
        if (!isValidEmail) {
          throw new Error('El correo electrónico no es válido o no existe');
        }

        // Verificar si el email ya existe en Firebase
        const emailExists = await this.checkEmailExists(email);
        if (emailExists) {
          throw new Error('Este correo electrónico ya está registrado. Por favor, usa otro correo');
        }

        // Cifrar la contraseña antes del registro
        const originalPassword = this.form.value.password;
        const encryptedPassword = this.encryptPassword(originalPassword);
        
        const res = await this.firebaseSvc.signUp(this.form.value as User);
        await this.firebaseSvc.updateUser(this.form.value.name);

        let uid = res.user.uid;
        this.form.controls.uid.setValue(uid);
        this.form.controls.email_verified.setValue('1');
        this.form.controls.password_Change.setValue(encryptedPassword);
        this.form.controls.type_profile.setValue(3);
        
        // Enviar email de bienvenida
        await this.sendWelcomeEmail();

        await this.setUserInfo(uid);
        await this.initializeUserData(uid);

        

        this.utilsSvc.presentToast({
          message: `¡Bienvenido ${this.form.value.name}! Revisa tu correo`,
          duration: 2500,
          color: 'success',
          icon: 'person-outline',
        });

        // Navegar después de completar todo el proceso
        this.navCtrl.navigateForward('/main/productos');
        
      } catch (error) {
        let errorMessage = 'Error en el registro';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'Este correo electrónico ya está registrado';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'La contraseña es muy débil';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'El formato del correo electrónico no es válido';
        }

        this.utilsSvc.presentToast({
          message: errorMessage,
          duration: 3000,
          color: 'danger',
          icon: 'alert-circle-outline',
        });
      } finally {
        loading.dismiss();
      }
    } else {
      // Mostrar errores específicos de validación
      if (this.form.controls.email.errors?.['emailNotExists']) {
        this.utilsSvc.presentToast({
          message: 'Por favor, ingresa un correo electrónico válido y existente',
          duration: 3000,
          color: 'warning',
          icon: 'mail-outline',
        });
      }
    }
  }

  // Enviar email de bienvenida
  private async sendWelcomeEmail() {
    try {
      const welcomeData = {
        customerName: this.form.controls.name.value,
        customerEmail: this.form.controls.email.value,
        registrationDate: new Date(),
        isBusiness: this.form.controls.isBusiness.value
      };

      console.log('Enviando email de bienvenida:', welcomeData);

      await this.emailSvc.sendWelcomeEmail(welcomeData);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // No mostrar error al usuario, es solo informativo
    }
  }

  private async initializeUserData(uid: string) {
    if (!uid) {
      console.error('UID is required for initializing user data');
      return;
    }

    try {
      // OBTENER LOS TERMINOS
      let path2 = `users/${uid}/terms`;
      let sub2 = this.firebaseSvc.obtenerColeccion(path2).subscribe({
        next: (res: any) => {
          let terms = res;
          this.utilsSvc.saveInLocalStorage('terms', terms);
          sub2.unsubscribe();
        },
        error: (error) => {
          console.error('Error getting terms:', error);
          sub2.unsubscribe();
        }
      });

      // OBTENER DIRECCION
      let path3 = `users/${uid}/Address`;
      let sub3 = this.firebaseSvc.getCollectionData(path3, []).subscribe({
        next: (res: any) => {
          this.direccion = res;
          this.utilsSvc.setElementInLocalstorage("direccion", this.direccion);
          sub3.unsubscribe();
        },
        error: (error) => {
          console.error('Error getting address:', error);
          sub3.unsubscribe();
        }
      });

      // CREAR CARRITO PRINCIPAL
      let path4 = `users/${uid}/carrito`;
      await this.firebaseSvc.addDocument(path4, this.form_carrito.value);
      
      let sub4 = this.firebaseSvc.getCollectionData(path4, []).subscribe({
        next: (res: any) => {
          this.carrito = res;
          if (this.carrito && this.carrito.length > 0 && this.carrito[0].id) {
            let path5 = `users/${uid}/carrito/${this.carrito[0].id}/detalle_carrito`;
            let sub5 = this.firebaseSvc.obtenerColeccion(path5).subscribe({
              next: (detalle: any) => {
                this.carrito[0].detalle_carrito = detalle;
                this.utilsSvc.setElementInLocalstorage("carrito", this.carrito);
                sub5.unsubscribe();
              },
              error: (error) => {
                console.error('Error getting carrito details:', error);
                sub5.unsubscribe();
              }
            });
          }
          sub4.unsubscribe();
        },
        error: (error) => {
          console.error('Error getting carrito:', error);
          sub4.unsubscribe();
        }
      });

      // CREAR CARRITO EVENTOS
      let pathEventos = `users/${uid}/carrito_eventos`;
      await this.firebaseSvc.addDocument(pathEventos, this.form_carrito_eventos.value);
      
      let subEventos = this.firebaseSvc.getCollectionData(pathEventos, []).subscribe({
        next: (res: any) => {
          this.carrito_eventos = res;
          if (this.carrito_eventos && this.carrito_eventos.length > 0 && this.carrito_eventos[0].id) {
            let pathDetalle = `users/${uid}/carrito_eventos/${this.carrito_eventos[0].id}/detalle_carrito`;
            let subDetalle = this.firebaseSvc.obtenerColeccion(pathDetalle).subscribe({
              next: (detalle: any) => {
                this.carrito_eventos[0].detalle_carrito = detalle;
                this.utilsSvc.setElementInLocalstorage("carrito_eventos", this.carrito_eventos);
                subDetalle.unsubscribe();
              },
              error: (error) => {
                console.error('Error getting carrito eventos details:', error);
                subDetalle.unsubscribe();
              }
            });
          }
          subEventos.unsubscribe();
        },
        error: (error) => {
          console.error('Error getting carrito eventos:', error);
          subEventos.unsubscribe();
        }
      });

      // CREAR CARRITO NEGOCIO SI ES NEGOCIO
      if (this.form.value.isBusiness) {
        let pathNegocio = `users/${uid}/carrito_negocio`;
        await this.firebaseSvc.addDocument(pathNegocio, this.form_carrito_negocio.value);
        
        let subNegocio = this.firebaseSvc.getCollectionData(pathNegocio, []).subscribe({
          next: (res: any) => {
            this.carrito_negocio = res;
            if (this.carrito_negocio && this.carrito_negocio.length > 0 && this.carrito_negocio[0].id) {
              let pathDetalleNegocio = `users/${uid}/carrito_negocio/${this.carrito_negocio[0].id}/detalle_carrito`;
              let subDetalleNegocio = this.firebaseSvc.obtenerColeccion(pathDetalleNegocio).subscribe({
                next: (detalle: any) => {
                  this.carrito_negocio[0].detalle_carrito = detalle;
                  this.utilsSvc.setElementInLocalstorage("carrito_negocio", this.carrito_negocio);
                  subDetalleNegocio.unsubscribe();
                },
                error: (error) => {
                  console.error('Error getting carrito negocio details:', error);
                  subDetalleNegocio.unsubscribe();
                }
              });
            }
            subNegocio.unsubscribe();
          },
          error: (error) => {
            console.error('Error getting carrito negocio:', error);
            subNegocio.unsubscribe();
          }
        });
      }

    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  }

  async setUserInfo(uid: string) {
    if (!uid) {
      console.error('UID is required for setting user info');
      return;
    }

    if (this.form && this.form.valid) {
      try {
        let path = `users/${uid}`;
        let formValue = { ...this.form.value };
        delete formValue.password; // No guardar la contraseña original

        await this.firebaseSvc.setDocument(path, formValue);
        this.utilsSvc.saveInLocalStorage('user', formValue);
        this.form.reset();
      } catch (error) {
        console.error('Error setting user info:', error);
      }
    }
  }

  // Checkbox: sincronización de aceptación
  onTermsChange() {
    const acceptedAll = this.form.controls.acceptedAll.value;
    if (acceptedAll) {
      this.form.controls.acceptedTerms.setValue(true);
      this.form.controls.acceptedPrivacy.setValue(true);
    } else {
      if (!this.form.controls.acceptedTerms.value || !this.form.controls.acceptedPrivacy.value) {
        this.form.controls.acceptedAll.setValue(false);
      }
    }
  }

  // Abrir términos y privacidad (navegación)
  async openTerms() {
    let success = await this.utilsSvc.presentModal({
          component: Terms2Component,
          cssClass: 'app-terms',
          componentProps: {  },
        })
        if (success) {
          
        }
  }
  openPrivacy() {
    this.navCtrl.navigateForward('/privacidad');
  }
  rules = {
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false
  };

  originalPassword(event: any) {
    const value = event.target.value || '';

    this.rules.length = value.length >= 12; 
    this.rules.upper = /[A-Z]/.test(value);
    this.rules.lower = /[a-z]/.test(value);
    this.rules.number = /\d/.test(value);
    this.rules.symbol = /[!"#%()*+,\-\.\/:=\?@\[\]\^_`{}]/.test(value);
  }

  getStrengthBarWidth(): string {
    switch (this.passwordStrength) {
      case 'Débil': return '25%';
      case 'Media': return '50%';
      case 'Aceptable': return '75%';
      case 'Fuerte': return '100%';
      default: return '0%';
    }
  }

}



