import { Component, inject, OnInit } from '@angular/core';
import { orderBy, where } from 'firebase/firestore';
import { Carrito } from 'src/app/models/carrito.model';
import { Producto } from 'src/app/models/producto.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddProductCartComponent } from 'src/app/shared/components/add-product-cart/add-product-cart.component';
import { NotificationsPushService } from 'src/app/services/notifications-push.service';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
})
export class ProductosPage implements OnInit {
  

  constructor() { }
  utilsSvc = inject(UtilsService);
  firebaseSvc = inject(FirebaseService);
  notificationsPushSvc = inject(NotificationsPushService);
  productos : any[]=[];
  allProductos: any[] = [];
  searchTerm: string = '';
  

  ngOnInit() {
    this.getProductos();
  }


  carrito(): Carrito {
    return this.utilsSvc.getFromLocalStorage('carrito');
  }

  user(): User {
    return this.utilsSvc.getFromLocalStorage('user');
  }

  userToken(): string { 
    const updatedUser = this.firebaseSvc.getDocument(`users/${this.user().uid}`);
    return updatedUser['token'];
  }

  
  public alertButtons = [
    {
      text: 'Cancelar',
      role: 'cancel',
      handler: () => {
      },
    },
    {
      text: 'Iniciar sesión',
      role: 'confirm',
      handler: () => {
        this.utilsSvc.routerLink('auth')
      },
    },
  ];

  getCartCount(){
    const carrito = this.carrito();
    if (carrito && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      return carrito[0].detalle_carrito.length;
    } else {
      return 0;
    }
    
  }

  isProductInCart(producto: any): boolean {
    const carrito = this.carrito();
    if (carrito[0].total > 0 && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      return carrito[0].detalle_carrito.some((item: any) => item.uid_producto === producto.id);
    }
    return false;
  }

  getButtonText(producto: any): string {
    return this.isProductInCart(producto) ? 'Ver en carrito' : 'Agregar al carrito';
  }

  getButtonIcon(producto: any): string {
    return this.isProductInCart(producto) ? 'eye-outline' : 'cart-outline';
  }

  async handleProductAction(producto: Producto) {
    if (this.isProductInCart(producto)) {
      // Ir al carrito
      this.utilsSvc.routerLink('/main/carrito');
    } else {
      // Agregar al carrito
      await this.modalCarrito(producto);
    }
  }

  async modalCarrito(producto: Producto) {
    try {
      const isWithinHours = await this.firebaseSvc.isWithinOperatingHours();
      if (!isWithinHours) {
        const horarioDoc = await this.firebaseSvc.getDocument('horario/waeYL5UAeC3YyZ8BW3KT');
        if (!horarioDoc || !horarioDoc['hora_entrada'] || !horarioDoc['hora_salida']) {
          throw new Error('No se pudo obtener el documento de horario o está incompleto.');
        }
        this.utilsSvc.presentToast({
          message: `No puedes agregar productos fuera del horario de ${horarioDoc['hora_entrada']} a ${horarioDoc['hora_salida']}`,
          duration: 2500,
          color: 'danger',
          position: 'bottom',
          icon: 'alert-circle-outline'
        });
        return;
      }
  
      let success = await this.utilsSvc.presentModal({
        component: AddProductCartComponent,
        cssClass: 'app-terms',
        componentProps: { producto },
      });
      
      if (success) {
        // Mostrar toast de éxito
        this.utilsSvc.presentToast({
          message: 'Producto agregado al carrito exitosamente',
          duration: 2000,
          color: 'success',
          position: 'bottom',
          icon: 'checkmark-circle-outline'
        });
        
        // Mostrar botón para ir al carrito
        setTimeout(() => {
          this.showGoToCartOption();
        }, 500);
      }
    } catch (error) {
      console.error('Error checking operating hours:', error);
      this.utilsSvc.presentToast({
        message: 'Error al verificar el horario de operación.',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
    }
  }

  private async showGoToCartOption() {
    
  }
  

  getProductos(){
    let query =[
      where('disponible', '==', true),
      where('stock', '>', 0),
      orderBy('precio', 'asc')
    ];

    //OBTENER LA DIRECCION DEL USUARIO
    let path2 = `productos`;
    let sub = this.firebaseSvc.getCollectionData(path2, []).subscribe({
      next: (res:any) => {
        this.allProductos = res; // Store all products first
        this.productos = [...res]; // Copy to productos array

        //OBTENER OPCIONES POR CADA UNO DE LOS PRODUCTOS
        this.productos.forEach(async (producto: any) => {
          const opcionesPath = `productos/${producto.id}/opciones`;
          try {
            let sub2 = this.firebaseSvc.getCollectionData(opcionesPath, []).subscribe({
              next: (res:any) => {
                let opciones = res;
                producto.opciones = opciones;
                
                // También actualizar en allProductos
                const productoInAll = this.allProductos.find(p => p.id === producto.id);
                if (productoInAll) {
                  productoInAll.opciones = opciones;
                }
                
                sub2.unsubscribe();
                
              }
            })
          } catch (err) {
          }
        });

        sub.unsubscribe();
      }
    })
  }

  filterProductos() {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (term && this.allProductos.length > 0) {
      this.productos = this.allProductos.filter(producto => 
        (producto.nombre && producto.nombre.toLowerCase().includes(term)) ||
        (producto.descripcion && producto.descripcion.toLowerCase().includes(term))
      );
    } else {
      this.productos = [...this.allProductos]; // Reset to all products
    }
  }

  // Método para limpiar la búsqueda
  clearSearch() {
    this.searchTerm = '';
    this.filterProductos();
  }
}
