import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as CryptoJS from 'crypto-js';
import { FacebookLogin, FacebookLoginPlugin } from '@capacitor-community/facebook-login';
import { Device } from '@capacitor/device';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { isPlatform, AlertController } from '@ionic/angular';
import { Direccion } from 'src/app/models/direccion.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { getAuth} from 'firebase/auth'
import { NotificationsPushService } from 'src/app/services/notifications-push.service';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { firstValueFrom } from 'rxjs';



@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage implements OnInit {
  fbLogin: FacebookLoginPlugin;
  user = null;
  token = null;

  form_registro_google = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required, Validators.minLength(4)]),
    mother_Last_Name: new FormControl(''),
    father_Last_Name: new FormControl(''),
    email_verified: new FormControl(''),
    password_Change: new FormControl(''),
    image: new FormControl(''),
    type_profile: new FormControl(),
    active_user: new FormControl('1'),
  });

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(30)]),
    password: new FormControl('', [Validators.required, Validators.maxLength(30)])
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

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  alertCtrl = inject(AlertController);
  notificationsPushSvc = inject(NotificationsPushService);
  
  // Variables para control de sesión única
  currentDeviceId: string = '';
  
  // Variables para tarjeta flotante de sesión bloqueada
  showSessionBlockedCard: boolean = false;
  sessionBlockedData: any = null;
  
  direccion: Direccion;
  carrito: any;
  carrito_eventos: any;
  carrito_negocio: any;

  constructor(private http: HttpClient) {
    this.utilsSvc.initializeSocialLogins();
    this.setupFbLogin();
    if (!isPlatform('capacitor')) {
      GoogleAuth.initialize();
    }
    this.getCurrentDeviceId();
  }

  ngOnInit() {
  }

  /**
   * Obtiene un ID único del dispositivo actual
   */
  async getCurrentDeviceId() {
    try {
      // Si está en Capacitor, intentar usar Device plugin
      if (isPlatform('capacitor')) {
        const deviceInfo = await Device.getId();
        this.currentDeviceId = deviceInfo.identifier;
      } else {
        // Fallback para web
        this.currentDeviceId = this.generateFallbackDeviceId();
      }
    } catch (error) {
      // Fallback: generar un ID único basado en características del navegador/dispositivo
      this.currentDeviceId = this.generateFallbackDeviceId();
    }
  }

  /**
   * Genera un ID único como fallback si no se puede obtener del dispositivo
   */
  private generateFallbackDeviceId(): string {
    const userAgent = navigator.userAgent;
    const screenRes = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    const deviceString = `${userAgent}-${screenRes}-${timezone}-${language}`;
    
    // Crear un hash simple del string
    let hash = 0;
    for (let i = 0; i < deviceString.length; i++) {
      const char = deviceString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    
    return `web_${Math.abs(hash)}_${Date.now()}`;
  }

  /**
   * Verifica si hay una sesión activa en otro dispositivo
   */
  async checkDeviceSession(user: any): Promise<boolean> {
    return new Promise(async (resolve) => {
      // Si el usuario no tiene sesión de dispositivo registrada, permitir login
      if (!user.device_session || !user.device_session.device_id) {
        resolve(true);
        return;
      }

      // Si es el mismo dispositivo, permitir login
      if (user.device_session.device_id === this.currentDeviceId) {
        resolve(true);
        return;
      }

      // Verificar si la sesión del otro dispositivo ha expirado (24 horas)
      const sessionTime = user.device_session.timestamp;
      const currentTime = Date.now();
      const sessionDuration = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

      if (currentTime - sessionTime > sessionDuration) {
        // La sesión ha expirado, permitir login
        resolve(true);
        return;
      }

      // Hay una sesión activa en otro dispositivo - MOSTRAR ALERTA PERO NO REDIRIGIR
      await this.showDeviceSessionBlockedAlert(user.device_session);
      resolve(false); // Negar el acceso pero mantener en la página de auth
    });
  }

  /**
   * Muestra tarjeta flotante de sesión activa en otro dispositivo (BLOQUEANTE)
   */
  async showDeviceSessionBlockedAlert(deviceSession: any): Promise<void> {
    const deviceInfo = this.getDeviceInfo(deviceSession);
    const timeAgo = this.getTimeAgo(deviceSession.timestamp);
    
    // Preparar datos para la tarjeta flotante
    this.sessionBlockedData = {
      deviceInfo,
      timeAgo,
      platform: deviceSession.platform || 'Desconocida',
      userAgent: deviceSession.user_agent || ''
    };
    
    // Mostrar tarjeta flotante
    this.showSessionBlockedCard = true;
  }

  /**
   * Cierra la tarjeta flotante de sesión bloqueada
   */
  closeSessionBlockedCard() {
    this.showSessionBlockedCard = false;
    this.sessionBlockedData = null;
  }

  /**
   * Muestra información sobre cómo cerrar sesión desde la tarjeta flotante
   */
  showHelpFromCard() {
    this.showHowToLogoutAlert();
  }

  /**
   * Obtiene información del dispositivo para mostrar
   */
  private getDeviceInfo(deviceSession: any) {
    const userAgent = deviceSession.user_agent || '';
    const platform = deviceSession.platform || '';
    
    let icon = '💻';
    let name = 'Dispositivo desconocido';
    
    if (platform === 'mobile' || /Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      if (/iPhone|iPad/i.test(userAgent)) {
        icon = '📱';
        name = 'iPhone/iPad';
      } else if (/Android/i.test(userAgent)) {
        icon = '📱';
        name = 'Android';
      } else {
        icon = '📱';
        name = 'Móvil';
      }
    } else {
      if (/Chrome/i.test(userAgent)) {
        icon = '🌐';
        name = 'Chrome (PC)';
      } else if (/Firefox/i.test(userAgent)) {
        icon = '🦊';
        name = 'Firefox (PC)';
      } else if (/Safari/i.test(userAgent)) {
        icon = '🧭';
        name = 'Safari (PC)';
      } else if (/Edge/i.test(userAgent)) {
        icon = '🔷';
        name = 'Edge (PC)';
      } else {
        icon = '💻';
        name = 'Computadora';
      }
    }
    
    return { icon, name };
  }

  /**
   * Calcula el tiempo transcurrido desde la última actividad
   */
  private getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Hace menos de 1 minuto';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }

  /**
   * Muestra información sobre cómo cerrar sesión en otros dispositivos
   */
  async showHowToLogoutAlert() {
    const alert = await this.alertCtrl.create({
      header: '🔧 ¿Cómo cerrar sesión?',
      subHeader: 'Instrucciones paso a paso',
      message: `
        <div class="alert-content-help">
          <div class="instruction-section mobile">
            <h4>📱 En dispositivos móviles:</h4>
            <ol>
              <li>Abre la app Mi Tortillería</li>
              <li>Ve al menú principal (☰)</li>
              <li>Selecciona "Cerrar Sesión"</li>
            </ol>
          </div>
          
          <div class="instruction-section web">
            <h4>💻 En navegadores web:</h4>
            <ol>
              <li>Ve a la página web</li>
              <li>Haz clic en tu perfil (esquina superior)</li>
              <li>Selecciona "Cerrar Sesión"</li>
            </ol>
          </div>
          
          <div class="instruction-section auto">
            <h4>⏰ Opción automática:</h4>
            <p>
              Si no puedes acceder al otro dispositivo, la sesión expirará automáticamente en <strong>24 horas</strong>.
            </p>
          </div>
          
          <div class="security-tip">
            <p>
              <strong>💡 Consejo:</strong> Siempre cierra sesión al usar dispositivos compartidos
            </p>
          </div>
        </div>
      `,
      cssClass: 'custom-alert-help',
      buttons: [
        {
          text: 'Entendido',
          cssClass: 'alert-button-primary',
          handler: () => {
            // Cerrar alerta
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Muestra alerta de sesión activa en otro dispositivo (DEPRECATED)
   */
  async showDeviceSessionAlert(): Promise<boolean> {
    // Método mantenido por compatibilidad pero ya no se usa
    return false;
  }

  /**
   * Actualiza la información de sesión del dispositivo en Firebase
   */
  async updateDeviceSession(uid: string) {
    const deviceSessionData = {
      device_id: this.currentDeviceId,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      platform: isPlatform('capacitor') ? 'mobile' : 'web'
    };

    const path = `users/${uid}`;
    try {
      await this.firebaseSvc.updateDocumet(path, { device_session: deviceSessionData });
    } catch (error) {
      console.log('Error actualizando sesión de dispositivo:', error);
    }
  }

  convertirTimestampAFecha(seconds: number, nanoseconds: number): string {
    const milisegundos = seconds * 1000 + nanoseconds / 1000000;
    const fecha = new Date(milisegundos);
    return fecha.toISOString();  // Devuelve un string ISO, pero puedes formatearlo de otra manera si lo prefieres
  }

  /**
 * Maneja el inicio de sesión usando correo y contraseña.
 * Obtiene información del usuario si las credenciales son válidas.
 */ 
  async submit() {
    if (this.form.valid) {
      const loading = await this.utilsSvc.loading();
      await loading.present();

      try {
        // Intentar login con Firebase Authentication primero
        const res = await this.firebaseSvc.signIn(this.form.value as User);
        
        // Si el login de Firebase es exitoso, verificar contraseña en base de datos
        const user: any = await this.firebaseSvc.getDocument(`users/${res.user.uid}`);
        
        // Verificar contraseña almacenada vs ingresada
        //const passwordMatch = this.verifyPassword(this.form.value.password, user.password_Change);
        
        //if (!passwordMatch) {
          // Si las contraseñas no coinciden, cerrar sesión de Firebase y mostrar error
          //await this.firebaseSvc.signOutAutomatic();
          //throw new Error('Contraseña incorrecta');
        //}

        // Si la contraseña coincide, proceder con el login
        await this.getUserInfo(res.user.uid);
        
      } catch (error) {
        let errorMessage = 'Error en el inicio de sesión';
        
        if (error.message === 'Contraseña incorrecta') {
          errorMessage = 'Contraseña incorrecta';
        } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'Usuario no encontrado';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = 'Contraseña incorrecta';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'El formato del correo electrónico no es válido';
        } else if (error.code === 'auth/user-disabled') {
          errorMessage = 'Esta cuenta ha sido deshabilitada';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
        }

        this.utilsSvc.presentToast({
          message: errorMessage,
          duration: 3000,
          color: 'danger',
          position: 'middle',
          icon: 'alert-circle-outline'
        });
      } finally {
        loading.dismiss();
      }
    }
  }

  // Método para validar entrada de email
  onEmailInput(event: any) {
    let value = event.target.value;
    
    // Limitar a 30 caracteres
    if (value.length > 30) {
      value = value.substring(0, 30);
      this.form.controls.email.setValue(value);
      return;
    }
    
    // Si ya tiene .com, no permitir más caracteres después de 'm'
    const comIndex = value.indexOf('.com');
    if (comIndex !== -1 && value.length > comIndex + 4) {
      value = value.substring(0, comIndex + 4);
      this.form.controls.email.setValue(value);
    }
  }

  // Método para validar entrada de contraseña
  onPasswordInput(event: any) {
    let value = event.target.value;
    
    // Limitar a 30 caracteres
    if (value.length > 30) {
      value = value.substring(0, 30);
      this.form.controls.password.setValue(value);
    }
  }

  // Método para cifrar contraseña (mismo que en sign-up)
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

  // Método para descifrar contraseña
  private decryptPassword(encryptedPassword: string): string {
    try {
      if (!encryptedPassword.includes(':')) {
        // No está cifrada, devolver tal como está
        return encryptedPassword;
      }

      const secretKey = 'MiTortilleria2024#SecureKey!@#$';
      const parts = encryptedPassword.split(':');
      const salt = CryptoJS.enc.Hex.parse(parts[0]);
      const encrypted = parts[1];
      
      const key = CryptoJS.PBKDF2(secretKey, salt, {
        keySize: 256/32,
        iterations: 1000
      });
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, key.toString());
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting password:', error);
      return encryptedPassword; // Devolver la original si falla el descifrado
    }
  }

  // Método para verificar contraseña (tanto cifrada como sin cifrar)
  private verifyPassword(inputPassword: string, storedPassword: string): boolean {
    try {
      // Si la contraseña almacenada contiene ':', probablemente está cifrada
      if (storedPassword.includes(':')) {
        const decryptedPassword = this.decryptPassword(storedPassword);
        return inputPassword === decryptedPassword;
      } else {
        // Contraseña sin cifrar, comparación directa
        return inputPassword === storedPassword;
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  async getUserInfo(uid: string) {
    const loading = await this.utilsSvc.loading();
    try {
      let path = `users/${uid}`;
      console.log(uid);
      
      const user: any = await this.firebaseSvc.getDocument(path);
      
      // Verificar sesión de dispositivo antes de continuar
      const canLogin = await this.checkDeviceSession(user);
      
      if (!canLogin) {
        loading.dismiss();
        // NO CERRAR SESIÓN AUTOMÁTICAMENTE - solo denegar acceso
        // this.firebaseSvc.signOutAutomatic(); // REMOVIDO
        
        // Mostrar toast informativo pero mantenerse en la página
        this.utilsSvc.presentToast({
          message: '❌ Acceso denegado: Sesión activa en otro dispositivo',
          duration: 4000,
          color: 'danger',
          position: 'top',
          icon: 'shield-outline'
        });
        
        // Cerrar sesión de Firebase Auth pero sin limpiar localStorage completamente
        const auth = getAuth();
        await auth.signOut();
        
        return; // Permanecer en la página de auth
      }

      // Actualizar sesión de dispositivo
      await this.updateDeviceSession(uid);
      
      let deviceToken = '';
      if (isPlatform('capacitor')) {
        // Listener antes de registrar
        deviceToken = await new Promise<string>((resolve) => {
          let resolved = false;
          PushNotifications.addListener('registration', (token: Token) => {
            if (!resolved) {
              resolved = true;
              resolve(token.value);
            }
          });
          PushNotifications.requestPermissions().then(result => {
            if (result.receive === 'granted') {
              PushNotifications.register();
            } else {
              resolve('');
            }
          });
          setTimeout(async () => {
            if (!resolved) {
              // fallback: intenta obtener el token guardado en Firestore
              const userDoc: any = await this.firebaseSvc.getDocument(`users/${uid}`);
              if (userDoc && userDoc.token) {
                resolved = true;
                resolve(userDoc.token);
              } else {
                resolve('');
              }
            }
          }, 4000);
        });
      } else {
        // Web: genera token local
        deviceToken = `web_${uid}_${this.currentDeviceId}`;
      }

      // Registrar token en backend y Firestore
      try {
        await firstValueFrom(this.notificationsPushSvc.http.post('https://api-tortilleria.onrender.com/registrarToken', {
          token: deviceToken,
          uid: uid
        }));
      } catch (err) {
        console.error('Error al registrar token en backend:', err);
      }
      await this.notificationsPushSvc.updateDocumet(`users/${uid}`, { token: deviceToken });
      
      // Actualizar contraseña a cifrada si no lo está
      if (user.password_Change && !user.password_Change.includes(':')) {
        const encryptedPassword = this.encryptPassword(user.password_Change);
        await this.firebaseSvc.updateDocumet(`users/${uid}`, { 
          password_Change: encryptedPassword 
        });
      }
      
      this.utilsSvc.setElementInLocalstorage('user', user);

      //OBTENER LOS TERMINOS
      let path_terms = `users/${user.uid}/terms`;
      let sub2 = this.firebaseSvc.obtenerColeccion(path_terms).subscribe({
        next: (res: any) => {
          let terms = res;
          this.utilsSvc.setElementInLocalstorage('terms', terms);
          sub2.unsubscribe();
        }
      });

      let path2;
      if (user.type_profile == 1) {
        path2 = `direccionNegocio`;  // Ruta para la dirección a obtener
        //OBTENER LA DIRECCION DEL USUARIO
        let sub = this.firebaseSvc.getCollectionData(path2, []).subscribe({
          next: (res: any) => {
            this.direccion = res;
            this.utilsSvc.setElementInLocalstorage("direccion", this.direccion);
            sub.unsubscribe();
          }
        });
      } else {
        path2 = `users/${user.uid}/Address`;  // Ruta para obtener la colección de direcciones
        //OBTENER LA DIRECCION DEL USUARIO
        let sub = this.firebaseSvc.getCollectionData(path2, []).subscribe({
          next: (res: any) => {
            this.direccion = res;
            this.utilsSvc.setElementInLocalstorage("direccion", this.direccion);
            sub.unsubscribe();
          }
        });
      }

      if (user.type_profile == 3) {
        let path3 = `users/${user.uid}/carrito`;
        let sub3 = this.firebaseSvc.getCollectionData(path3, []).subscribe({
          next: (res: any) => {
            this.carrito = res;
            if (user.type_profile == 3) {
              //OBTENER LOS DETALLES DEL CARRITO
              let path4 = `users/${user.uid}/carrito/${this.carrito[0].id}/detalle_carrito`;
              let sub4 = this.firebaseSvc.obtenerColeccion(path4).subscribe({
                next: (detalle: any) => {
                  this.carrito[0].detalle_carrito = detalle;
                  this.utilsSvc.setElementInLocalstorage("carrito", this.carrito);
                  sub4.unsubscribe();
                }
              });

              sub3.unsubscribe();
            }
          }
        });
          let path5 = `users/${uid}/carrito_eventos`;
          let sub5 = this.firebaseSvc.getCollectionData(path5, []).subscribe({
            next: (res: any) => {
              this.carrito_eventos = res;
              if (this.carrito_eventos) {
                //OBTENER LOS DETALLES DEL CARRITO
                let path6 = `users/${uid}/carrito_eventos/${this.carrito_eventos[0].id}/detalle_carrito`;
                
                let sub6 = this.firebaseSvc.obtenerColeccion(path6).subscribe({
                  next: (detalle: any) => {
                    this.carrito_eventos[0].detalle_carrito = detalle;
                    this.utilsSvc.setElementInLocalstorage("carrito_eventos", this.carrito_eventos);
                    sub6.unsubscribe();
                  }
                });

                sub5.unsubscribe();
              }
            }
          });
          
          this.form_carrito_eventos.reset();

        if (user.isBusiness) {
          let path5 = `users/${uid}/carrito_negocio`;
          let sub5 = this.firebaseSvc.getCollectionData(path5, []).subscribe({
            next: async (res: any) => {
              this.carrito_negocio = res;
              if (!this.carrito_negocio || this.carrito_negocio.length === 0) {
                // Si no existe, crear carrito_negocio
                // Forzar el valor de total a 0 si está nulo
                if (
                  this.form_carrito_negocio.value.total === null ||
                  this.form_carrito_negocio.value.total === undefined
                ) {
                  this.form_carrito_negocio.patchValue({ total: 0 });
                }
                await this.firebaseSvc.addDocument(path5, this.form_carrito_negocio.value);
                // Volver a consultar después de crear
                let subNew = this.firebaseSvc.getCollectionData(path5, []).subscribe({
                  next: (resNew: any) => {
                    this.carrito_negocio = resNew;
                    if (this.carrito_negocio && this.carrito_negocio.length > 0) {
                      let path6 = `users/${uid}/carrito_negocio/${this.carrito_negocio[0].id}/detalle_carrito`;
                      let sub6 = this.firebaseSvc.obtenerColeccion(path6).subscribe({
                        next: (detalle: any) => {
                          this.carrito_negocio[0].detalle_carrito = detalle;
                          this.utilsSvc.setElementInLocalstorage("carrito_negocio", this.carrito_negocio);
                          sub6.unsubscribe();
                        }
                      });
                    }
                    subNew.unsubscribe();
                  }
                });
              } else {
                // Si existe, obtener detalles
                let path6 = `users/${uid}/carrito_negocio/${this.carrito_negocio[0].id}/detalle_carrito`;
                let sub6 = this.firebaseSvc.obtenerColeccion(path6).subscribe({
                  next: (detalle: any) => {
                    this.carrito_negocio[0].detalle_carrito = detalle;
                    this.utilsSvc.setElementInLocalstorage("carrito_negocio", this.carrito_negocio);
                    sub6.unsubscribe();
                  }
                });
              }
              sub5.unsubscribe();
            }
          });
          
          this.form_carrito_negocio.reset();
        }
      }

      if (user.type_profile == 1) {
        this.utilsSvc.routerLink('main/informe-superadmin');
      } else if (user.type_profile == 2) {
        this.utilsSvc.routerLink('main/pedidos');
      } else if (user.type_profile == 3) {
        this.utilsSvc.routerLink('main/productos');
      }

      this.form.reset();

      this.utilsSvc.presentToast({
        message: `Te damos la bienvenida ${user.name}`,
        duration: 1500,
        color: 'primary',
        position: 'bottom',
        icon: 'person-circle-outline'
      });

    } catch (error: any) {
      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    } finally {
      loading.dismiss();
    }
  }

  async loginGoogle() {
    let user = await this.firebaseSvc.loginWithGoogle();
    //VALIDAR SI ES NUEVO USUARIO
    if (user.additionalUserInfo.isNewUser) {
      this.form_registro_google.value.uid = user.user.uid;
      this.form_registro_google.value.name = user.additionalUserInfo.profile['name'];
      this.form_registro_google.value.email = user.additionalUserInfo.profile['email'];
      this.form_registro_google.value.image = user.additionalUserInfo.profile['picture'];
      this.form_registro_google.value.email_verified = user.additionalUserInfo.profile['verified_email'];
      this.form_registro_google.value.type_profile = 3;
      delete this.form_registro_google.value.password;
      this.setUserInfo(user.user.uid);
      this.utilsSvc.presentToast({
        message: `Bienvenido ${this.form_registro_google.value.name}`,
        duration: 1500,
        color: 'primary',
        icon: 'person-outline',
      });
    } else {
      this.getUserInfo(user.user.uid); // Carga la información del usuario existente
    }
  }

  /**
 * Inicia sesión con Google y maneja la creación de usuarios nuevos.
 */
  async loginGoogleNew() {
    if (isPlatform('capacitor')) {
      this.user = await GoogleAuth.signIn();
      console.log('user', this.user);
    } else {
    }
  }

  async refresh() {
    const result = await GoogleAuth.refresh();
    console.log('result', result);
    // { accessToken: '...', idToken: '...' }
  }

  /**
   * Configura el plugin de Facebook Login.
   */
  async setupFbLogin() {
    if (isPlatform('desktop')) {
      this.fbLogin = FacebookLogin;
    } else {
      //const { FacebookLogin } = Plugins;
      this.fbLogin = FacebookLogin;
    }
  }
  /**
   * Inicia sesión con Facebook y gestiona los tokens obtenidos.
   */
  async loginFacebookNew() {
    const FACEBOOK_PERMISSIONS = ['email', 'public_profile'];
    const result = await this.fbLogin.login({ permissions: FACEBOOK_PERMISSIONS });
    console.log('result', result);
    if (result.accessToken && result.accessToken.userId) {
      this.token = result.accessToken;
      this.loadUserData();
    } else if (result.accessToken && !result.accessToken.userId) {
      //OBTIENE EL TOKEN PERO NO EL ID DEL USUARIO
      this.getCurrentToken();
    } else {
      //LOGIN FALLIDO
    }
  }

  async loginFacebook() {
    let user = await this.firebaseSvc.loginWithFacebook();
    console.log(user)

    //VALIDAR SI ES NUEVO USUARIO
    if (user.additionalUserInfo.isNewUser) {
      this.form_registro_google.value.uid = user.user.uid;
      this.form_registro_google.value.name = user.additionalUserInfo.profile['name'];
      this.form_registro_google.value.email = user.additionalUserInfo.profile['email'];
      this.form_registro_google.value.email_verified = 'true';
      this.form_registro_google.value.type_profile = 3;
      delete this.form_registro_google.value.password;

      
       this.setUserInfo(user.user.uid);

      this.utilsSvc.presentToast({
        message: `Bienvenido ${this.form_registro_google.value.name}`,
        duration: 1500,
        color: 'primary',
        icon: 'person-outline',
      });

    } else {
      this.getUserInfo(user.user.uid);
      
    }

  }

  async getCurrentToken() {
    const result = await this.fbLogin.getCurrentAccessToken();

    if (result.accessToken) {
      this.token = result.accessToken;
      this.loadUserData();
    } else {
      //NO SE PUDO OBTENER EL TOKEN
    }
  }

  async loadUserData() {
    const url = `https://graph.facebook.com/${this.token.userId}?fields=id,name,picture.width(720).height(720)&access_token=${this.token.token}`;
    this.http.get(url).subscribe((res: any) => {
      console.log('res', res);
      this.user = res;
    });
  }

  async logout() {
    await this.fbLogin.logout();
    this.user = null;
    this.token = null;
  }

  async setUserInfo(uid: string) {

    const loading = await this.utilsSvc.loading();
    await loading.present();

    let path = `users/${uid}`;


    this.firebaseSvc.setDocumet(path, this.form_registro_google.value).then(async (res) => {

      // Actualizar sesión de dispositivo para usuario nuevo
      await this.updateDeviceSession(uid);

      this.utilsSvc.saveInLocalStorage('user', this.form_registro_google.value);
      this.utilsSvc.routerLink('/main/productos');

          this.carrito = res;
          //OBTENER LOS DETALLES DEL CARRITO
          let pathc = `users/${uid}/carrito`;
          // Forzar el valor de total a 0 si está nulo
          if (
            this.form_carrito.value.total === null ||
            this.form_carrito.value.total === undefined
          ) {
            this.form_carrito.patchValue({ total: 0 });
          }
          this.firebaseSvc.addDocument(pathc, this.form_carrito.value).then(async (res) => {

            this.utilsSvc.saveInLocalStorage('carrito', this.form_carrito.value);
            this.utilsSvc.routerLink('/main/productos');
            this.form.reset();
            this.form_carrito.reset();
            
      
          });
      //OBTENER LOS TERMINOS
      let path = `users/${uid}/terms`;
      let sub2 = this.firebaseSvc.obtenerColeccion(path).subscribe({
        next: (res: any) => {
          let terms = res;
          this.utilsSvc.saveInLocalStorage('terms', terms);
          sub2.unsubscribe();
        }
      })


       let path5 = `users/${uid}/carrito_eventos`;
       // Forzar el valor de total a 0 si está nulo
       if (
         this.form_carrito_eventos.value.total === null ||
         this.form_carrito_eventos.value.total === undefined
       ) {
         this.form_carrito_eventos.patchValue({ total: 0 });
       }
       await this.firebaseSvc.addDocument(path5, this.form_carrito_eventos.value).then(async (res) => {
         let path5 = `users/${uid}/carrito_eventos`;
         let sub5 = this.firebaseSvc.getCollectionData(path5, []).subscribe({
           next: (res: any) => {
             this.carrito_eventos = res;
             if (this.carrito_eventos) {
               //OBTENER LOS DETALLES DEL CARRITO
               let path6 = `users/${uid}/carrito_eventos/${this.carrito_eventos[0].id}/detalle_carrito`;
               
               let sub6 = this.firebaseSvc.obtenerColeccion(path6).subscribe({
                 next: (detalle: any) => {
                   this.carrito_eventos[0].detalle_carrito = detalle;
                   this.utilsSvc.setElementInLocalstorage("carrito_eventos", this.carrito_eventos);
                   sub6.unsubscribe();
                 }
               })

               sub5.unsubscribe();
             }
           }
         })
         this.form_carrito_eventos.reset();
       });


    },
      (error) => {
        this.utilsSvc.presentToast({
          message: error,
          duration: 5000,
          color: 'primary',
          position: 'middle',
          icon: 'alert-circle-outline',
        });
      }).finally(() => {
        loading.dismiss();
      })
  }

  async getUserInfoGoogle(uid: string) {

    const loading = await this.utilsSvc.loading();
    await loading.present();

    let path = `users/${uid}`;

    this.firebaseSvc.getDocument(path).then((user: User) => {

      this.utilsSvc.saveInLocalStorage('user', user);

      //OBTENER LOS TERMINOS
      let path = `users/${user.uid}/terms`;
      let sub2 = this.firebaseSvc.obtenerColeccion(path).subscribe({
        next: (res: any) => {
          let terms = res;
          this.utilsSvc.saveInLocalStorage('terms', terms);
          sub2.unsubscribe();
        }
      })

      if (user.type_profile == 1) {
        let path2 = `direccionNegocio`;  // Ruta para la dirección a obtener
        //OBTENER LA DIRECCION DEL USUARIO
        let sub = this.firebaseSvc.getCollectionData(path2, []).subscribe({
          next: (res: any) => {
            this.direccion = res;
            this.utilsSvc.setElementInLocalstorage("direccion", this.direccion);
            sub.unsubscribe();
          }
        });
      } else {
        let path2 = `users/${user.uid}/Address`;  // Ruta para obtener la colección de direcciones
        //OBTENER LA DIRECCION DEL USUARIO
        let sub = this.firebaseSvc.getCollectionData(path2, []).subscribe({
          next: (res: any) => {
            this.direccion = res;
            this.utilsSvc.setElementInLocalstorage("direccion", this.direccion);
            sub.unsubscribe();
          }
        });
      }

      let path3 = `users/${uid}/carrito`;
      let sub3 = this.firebaseSvc.getCollectionData(path3, []).subscribe({
        next: (res: any) => {
          this.carrito = res;
          //OBTENER LOS DETALLES DEL CARRITO
          let path4 = `users/${user.uid}/carrito/${this.carrito[0].id}/detalle_carrito`;
          let sub4 = this.firebaseSvc.obtenerColeccion(path4).subscribe({
            next: (detalle: any) => {
              this.carrito[0].detalle_carrito = detalle;
              this.utilsSvc.setElementInLocalstorage("carrito", this.carrito);
              sub4.unsubscribe();
            }
          })

          sub3.unsubscribe();
        }
      })

      let path4 = `users/${uid}/carrito_eventos`;
      let sub4 = this.firebaseSvc.getCollectionData(path4, []).subscribe({
        next: (res: any) => {
          this.carrito_eventos = res;
          //OBTENER LOS DETALLES DEL CARRITO
          let path4 = `users/${user.uid}/carrito_eventos/${this.carrito_eventos[0].id}/detalle_carrito`;
          let sub4 = this.firebaseSvc.obtenerColeccion(path4).subscribe({
            next: (detalle: any) => {
              this.carrito_eventos[0].detalle_carrito = detalle;
              this.utilsSvc.setElementInLocalstorage("carrito_eventos", this.carrito_eventos);
              sub4.unsubscribe();
            }
          })

          sub4.unsubscribe();
        }
      });
      
      this.form_carrito_eventos.reset();

        if (user.isBusiness) {
          let path5 = `users/${uid}/carrito_negocio`;
          let sub5 = this.firebaseSvc.getCollectionData(path5, []).subscribe({
            next: async (res: any) => {
              this.carrito_negocio = res;
              if (!this.carrito_negocio || this.carrito_negocio.length === 0) {
                // Si no existe, crear carrito_negocio
                // Forzar el valor de total a 0 si está nulo
                if (
                  this.form_carrito_negocio.value.total === null ||
                  this.form_carrito_negocio.value.total === undefined
                ) {
                  this.form_carrito_negocio.patchValue({ total: 0 });
                }
                await this.firebaseSvc.addDocument(path5, this.form_carrito_negocio.value);
                // Volver a consultar después de crear
                let subNew = this.firebaseSvc.getCollectionData(path5, []).subscribe({
                  next: (resNew: any) => {
                    this.carrito_negocio = resNew;
                    if (this.carrito_negocio && this.carrito_negocio.length > 0) {
                      let path6 = `users/${uid}/carrito_negocio/${this.carrito_negocio[0].id}/detalle_carrito`;
                      let sub6 = this.firebaseSvc.obtenerColeccion(path6).subscribe({
                        next: (detalle: any) => {
                          this.carrito_negocio[0].detalle_carrito = detalle;
                          this.utilsSvc.setElementInLocalstorage("carrito_negocio", this.carrito_negocio);
                          sub6.unsubscribe();
                        }
                      });
                    }
                    subNew.unsubscribe();
                  }
                });
              } else {
                // Si existe, obtener detalles
                let path6 = `users/${uid}/carrito_negocio/${this.carrito_negocio[0].id}/detalle_carrito`;
                let sub6 = this.firebaseSvc.obtenerColeccion(path6).subscribe({
                  next: (detalle: any) => {
                    this.carrito_negocio[0].detalle_carrito = detalle;
                    this.utilsSvc.setElementInLocalstorage("carrito_negocio", this.carrito_negocio);
                    sub6.unsubscribe();
                  }
                });
              }
              sub5.unsubscribe();
            }
          });
          this.form_carrito_negocio.reset();
      }
      
      if (user.type_profile == 1) {
        this.utilsSvc.routerLink('main/informe-superadmin');
      } else if (user.type_profile == 2) {
        this.utilsSvc.routerLink('main/pedidos');
      } else if (user.type_profile == 3) {
        this.utilsSvc.routerLink('main/productos');
      }

      this.utilsSvc.presentToast({
        message: `Te damos la bienvenida ${user.name}`,
        duration: 1500,
        color: 'primary',
        position: 'bottom',
        icon: 'person-circle-outline'
      });

    }).catch(error => {


      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      });

    }).finally(() => {
      loading.dismiss();
    });
  }

}
