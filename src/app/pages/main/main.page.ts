import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Direccion } from 'src/app/models/direccion.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { InactivityService, InactivityWarningData } from 'src/app/services/inactivity.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
})
export class MainPage implements OnInit, OnDestroy {

  

  router = inject(Router);
  currentPath: string = '';
  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);
  private inactivitySvc = inject(InactivityService);
  
  // Variables para alerta de inactividad
  showInactivityWarning: boolean = false;
  inactivityWarningData: InactivityWarningData | null = null;

  pages = [];

  user(): User {
    return this.utilSvc.getFromLocalStorage('user');
  }
  constructor(){}

  ngOnInit() {


    this.router.events.subscribe((event: any) => {
      if (event?.url) {
        this.currentPath = event.url;
        this.updatePages(); // Llama a la función para actualizar el menú
      }
    });
  
    // Llama a updatePages inicialmente
    this.updatePages();
    
    // Iniciar monitoreo de inactividad después del login
    this.startInactivityMonitoring();
    
    // Suscribirse a los cambios de la alerta de inactividad
    this.subscribeToInactivityWarning();
  }
  
  ngOnDestroy() {
    // Detener monitoreo al destruir el componente
    this.inactivitySvc.stopMonitoring();
  }

  /**
   * Inicia el monitoreo de inactividad según el tipo de usuario
   */
  private startInactivityMonitoring() {
    const user = this.utilSvc.getElementFromLocalstorage('user');
    
    if (user) {
      // Solo iniciar para clientes (type_profile = 3) y negocios (type_profile = 2)
      if (user.type_profile === 2 || user.type_profile === 3) {
        this.inactivitySvc.startMonitoring();
        console.log(`Monitoreo de inactividad iniciado para usuario tipo: ${user.type_profile}`);
      } else {
        console.log(`Usuario tipo ${user.type_profile} - Sin monitoreo de inactividad`);
      }
    }
  }

  /**
   * Se suscribe a los cambios de la alerta de inactividad
   */
  private subscribeToInactivityWarning() {
    // Suscribirse al estado de mostrar la alerta
    this.inactivitySvc.getShowWarningCard().subscribe(show => {
      this.showInactivityWarning = show;
    });

    // Suscribirse a los datos de la alerta
    this.inactivitySvc.getWarningData().subscribe(data => {
      this.inactivityWarningData = data;
    });
  }

  /**
   * Continúa la sesión cuando el usuario confirma
   */
  continueSession() {
    this.inactivitySvc.continueSession();
    
    this.utilSvc.presentToast({
      message: '✅ Sesión extendida exitosamente',
      duration: 2000,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle-outline'
    });
  }

  /**
   * Cierra la sesión desde la alerta de inactividad
   */
  async logoutFromInactivity() {
    await this.inactivitySvc.logoutFromWarning();
  }

  /**
   * Cierra la alerta de advertencia sin tomar acción
   */
  dismissInactivityWarning() {
    this.inactivitySvc.dismissWarning();
  }

  // Mueve la lógica de configuración de las páginas a una función
  private updatePages() {
    this.pages = []; // Reinicia las páginas para evitar duplicados
  
    const user = this.user();
    if (user) {
      if (user.type_profile == 1) {
        this.pages.push(
          { title: 'Informes de ventas', url: '/main/informe-superadmin', icon: 'bar-chart-outline' },
          { title: 'Inventario', url: '/main/inventario-superadmin', icon: 'file-tray-stacked-outline' },
          { title: 'Administración de usuarios', url: '/main/administracion-usuarios-superadmin', icon: 'people-outline' },
          { title: 'Gestión de productos', url: '/main/gestion-superadmin', icon: 'bag-outline' },
          { title: 'Gastos', url: '/main/gastos-superadmin', icon: 'wallet-outline' },
          { title: 'Cupones', url: '/main/cupones-superadmin', icon: 'pricetags-outline' },
          { title: 'Privacidad', url: '/main/privacidad', icon: 'shield-checkmark-outline' },
          { title: 'Rangos de productos', url: '/main/rangos-eventos', icon: 'options-outline' },
          { title: 'Precio del viaje', url: '/main/precio-viaje', icon: 'bicycle-outline' },
          { title: 'Corte de caja', url: '/main/corte-caja-admin', icon: 'cash-outline' },
          { title: 'Perfil', url: '/main/profile', icon: 'person-outline' },
        );
      } else if (user.type_profile == 2) {
        this.pages.push(
          { title: 'Pedidos', url: '/main/pedidos', icon: 'archive-outline' },
          { title: 'Horario de entrega', url: '/main/horario', icon: 'timer-outline' },
          { title: 'Entregas', url: '/main/entregas', icon: 'download-outline' },
          { title: 'Inventario', url: '/main/inventario', icon: 'newspaper-outline' },
          { title: 'Escaner QR', url: '/main/escaner-qr', icon: 'qr-code-outline' },
          { title: 'Privacidad', url: '/main/privacidad', icon: 'shield-checkmark-outline' },
          { title: 'Rangos de productos', url: '/main/rangos-eventos', icon: 'options-outline' },
          { title: 'Precio del viaje', url: '/main/precio-viaje', icon: 'bicycle-outline' },
          { title: 'Corte de caja', url: '/main/corte-caja-admin', icon: 'cash-outline' },
          { title: 'Perfil', url: '/main/profile-admin', icon: 'person-outline' },
        );
      } else if (user.type_profile == 3) {
        this.pages.push(
          { title: 'Productos', url: '/main/productos', icon: 'apps-outline' },
          { title: 'Eventos/compras anticipadas', url: '/main/eventos', icon: 'calendar-outline' },
        );
        if (user.isBusiness) {
          this.pages.push(
            { title: 'Productos para negocios', url: '/main/productos-negocio', icon: 'storefront-outline' },
            
          );
        }
        this.pages.push(
          { title: 'Historial de pedidos', url: '/main/historial-pedidos', icon: 'reader-outline' },
          { title: 'Carrito', url: '/main/carrito', icon: 'cart-outline' },
          { title: 'Perfil', url: '/main/profile', icon: 'person-outline' },
          { title: 'Privacidad', url: '/main/privacidad', icon: 'shield-checkmark-outline' }
          
        );
      }
    }
    
  }
  


  //================= Cerrar sesion ==================
  signOut() {
    this.firebaseSvc.signOut();
    localStorage.clear(); // Limpia el almacenamiento local
    this.updatePages();
  }
  


}
