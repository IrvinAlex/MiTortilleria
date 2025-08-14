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

      let success = await this.utilsSvc.presentModal({
        component: AddProductNegocioComponent,
        cssClass: 'add-product-negocio',
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
    })
    let query = [];
    setTimeout(() => {
      
      console.log(this.rango_productos);
      
      console.log(query);

      //OBTENER LA DIRECCION DEL USUARIO
      let path2 = `productos`;
      let sub = this.firebaseSvc.getCollectionData(path2, []).subscribe({
        next: (res:any) => {
          // Store all products
          res.forEach((producto: any) => {
            this.rango_productos.forEach((rango: any) => {
              if(rango.producto == producto.nombre){
                this.productos.push(producto);
                this.allProductos.push(producto);
              }
            
            });
          });
          
          

          console.log(this.productos);
  
          //OBTENER OPCIONES POR CADA UNO DE LOS PRODUCTOS
          this.productos.forEach(async (producto: any) => {
            this.rango_productos.forEach((rango: any) => {
              if(rango.producto == producto.nombre){
                producto.minimo = rango.min_producto;
                producto.maximo = rango.max_producto;
              }
            });
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
          loading.dismiss(); // Dismiss loading after all products and options are fetched
           sub.unsubscribe();
        }
      })
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

