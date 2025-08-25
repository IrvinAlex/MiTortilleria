import { Component, inject, OnInit } from '@angular/core';
import { set } from 'date-fns';
import { orderBy, where } from 'firebase/firestore';
import { Carrito } from 'src/app/models/carrito.model';
import { Producto } from 'src/app/models/producto.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddProductNegocioComponent } from 'src/app/shared/components/add-product-negocio/add-product-negocio.component';

@Component({
  selector: 'app-productos-negocio',
  templateUrl: './productos-negocio.page.html',
  styleUrls: ['./productos-negocio.page.scss'],
})
export class ProductosNegocioPage implements OnInit {
  

  constructor() { }
  utilsSvc = inject(UtilsService);
  firebaseSvc = inject(FirebaseService);
  productos: any[] = [];
  rango_productos: any[] = [];
  allProductos: any[] = [];
  searchTerm: string = '';
  

  ngOnInit() {
    this.getProductos();
  }

  carrito(): Carrito {
    return this.utilsSvc.getFromLocalStorage('carrito_negocio');
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
    if (carrito && carrito[0] && carrito[0].total > 0 && Array.isArray(carrito[0].detalle_carrito)) {
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
      // Ir al carrito de negocio
      this.utilsSvc.routerLink('/main/carrito-negocio');
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

      // Solo pasa producto, ya tiene minimo y maximo
      let success = await this.utilsSvc.presentModal({
        component: AddProductNegocioComponent,
        cssClass: 'add-product-negocio',
        componentProps: { 
          producto
        },
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

  async getProductos() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    let path = `rango_productos`;
    let sub3 = this.firebaseSvc.getCollectionData(path, [where("tipo","==","Taqueria")]).subscribe({
      next: (res:any) => {
        this.rango_productos = res;
        this.utilsSvc.setElementInLocalstorage('rango_productos', res);
        sub3.unsubscribe();
      }
    });

    setTimeout(() => {
      let path2 = `productos`;
      let sub = this.firebaseSvc.getCollectionData(path2, []).subscribe({
        next: (res:any) => {
          // Filtrar solo productos con nombre "Masa" o "Tortillas"
          const productosNegocio = res.filter((producto: any) =>
            producto.nombre === 'Masa' || producto.nombre === 'Tortillas'
          );
          this.productos = productosNegocio;
          this.allProductos = [...this.productos];

          // Asignar rango y opciones solo a los productos de negocio
          this.productos.forEach(async (producto: any) => {
            const rango = this.rango_productos.find((r: any) => r.producto === producto.nombre);
            if (rango) {
              producto.minimo = Number(rango.min_producto);
              producto.maximo = Number(rango.max_producto);
            }
            const opcionesPath = `productos/${producto.id}/opciones`;
            try {
              let sub2 = this.firebaseSvc.getCollectionData(opcionesPath, []).subscribe({
                next: (opciones:any) => {
                  producto.opciones = opciones;
                  sub2.unsubscribe();
                }
              });
            } catch (err) {}
          });

          loading.dismiss();
          sub.unsubscribe();
        }
      });
    }, 1000);
    
    
    
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

