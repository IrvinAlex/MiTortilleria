import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { AlertController, IonModal } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core/components';
import { UtilsService } from 'src/app/services/utils.service';
import { TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
})
export class InicioPage implements OnInit {

  constructor(private alertController: AlertController, private translate: TranslateService) { }

  // Ciclo de vida de Angular: se ejecuta cuando el componente se inicializa
  ngOnInit() {}

  // Referencia al modal en la plantilla para poder manipularlo desde el código
  @ViewChild(IonModal) modal: IonModal;

  // Propiedades para capturar datos ingresados en el modal
  name: string;
  email: string;
  numberphone: string;
  message: string;

  // Inyección del servicio de utilidades, usado para funciones como navegación
  utilsSvc = inject(UtilsService);

  /**
   * Cierra el modal sin realizar ninguna acción adicional
   * También limpia el campo `name` como ejemplo.
   * Permite al usuario abandonar una acción en el modal.
   */
  cancel() {
    this.modal.dismiss(null, 'cancel');
    this.name = ""; // Limpia el campo `name` después de cancelar
  }

  /**
   * Confirma la acción dentro del modal y cierra el modal.
   * Puede usarse para enviar datos al backend o realizar validaciones.
   * Es el punto donde se podría enviar datos ingresados en el modal al backend o realizar validaciones.
   */
  confirm() {
    this.modal.dismiss(this.name, 'confirm');
  }

  /**
   * Método que se ejecuta al cerrarse el modal.
   * Evalúa si la acción de cierre fue "confirm" para realizar acciones específicas.
   */
  onWillDismiss(event: Event) {
    const ev = event as CustomEvent<OverlayEventDetail<string>>;
    if (ev.detail.role === 'confirm') {
      // Aquí puedes manejar la acción de confirmación
    }
  }

  // Configuración de botones para la alerta y Define las acciones disponibles en la alerta, como cerrar sin realizar nada o redirigir al usuario a la página de autenticación.
  public alertButtons = [
    {
      text: 'Cancelar', // Texto del botón
      role: 'cancel', // Rol del botón, define que la alerta debe ser cerrada sin acción adicional
      handler: () => { 
      },
    },
    {
      text: 'Iniciar sesión', // Texto del botón
      role: 'confirm', // Rol del botón, define una acción de confirmación
      handler: () => {
        // Navega a la página de autenticación usando el servicio de utilidades
        this.utilsSvc.routerLink('auth');
      },
    },
    {
      text: 'Registrate', // Texto del botón
      role: 'confirm', // Rol del botón, define una acción de confirmación
      handler: () => {
        // Navega a la página de autenticación usando el servicio de utilidades
        this.utilsSvc.routerLink('auth/sign-up');
      },
    },
  ];

  changeLanguage(lang: string) {
    this.translate.use(lang).subscribe({
      next: () => console.log(`Idioma cambiado correctamente a: ${lang}`),
      error: (err) => console.error('Error cambiando idioma:', err),
  });
  }
}

