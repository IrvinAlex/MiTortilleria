import { Component, inject, OnInit } from '@angular/core';
import { set } from 'date-fns';
import { orderBy, where } from 'firebase/firestore';
import { Carrito } from 'src/app/models/carrito.model';
import { Producto } from 'src/app/models/producto.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddProductCartEventsComponent } from 'src/app/shared/components/add-product-cart-events/add-product-cart-events.component';
import { AddProductCartComponent } from 'src/app/shared/components/add-product-cart/add-product-cart.component';

@Component({
  selector: 'app-eventos',
  templateUrl: './eventos.page.html',
  styleUrls: ['./eventos.page.scss'],
})
export class EventosPage implements OnInit {
  

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
    return this.utilsSvc.getFromLocalStorage('carrito_eventos');
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

  

  async modalCarrito(producto:Producto){
    let success = await this.utilsSvc.presentModal({
      component: AddProductCartEventsComponent,
      cssClass: 'app-terms',
      componentProps: { producto },
    })
    if (success) {
      
    }
  }



  async getProductos() {
    const loading = await this.utilsSvc.loading();
      await loading.present();

    let path = `rango_productos`;
    let sub3 = this.firebaseSvc.getCollectionData(path, [where("tipo","==","Evento")]).subscribe({
      next: (res:any) => {
        this.rango_productos = res;
        this.utilsSvc.setElementInLocalstorage('rango_productos', res);
              
        sub3.unsubscribe();
      }
    })
    let query = [];
    setTimeout(() => {
      
      console.log(this.rango_productos);
      this.rango_productos.forEach((rango: any) => {
        query.push(where("nombre", "==", rango.producto));
      });
      console.log(query);

      //OBTENER LA DIRECCION DEL USUARIO
      let path2 = `productos`;
      let sub = this.firebaseSvc.getCollectionData(path2, query).subscribe({
        next: (res:any) => {
          this.productos = res;
          this.allProductos = res; // Store all products
  
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
                  loading.dismiss();
                  sub2.unsubscribe();

                  
                }
              })
            } catch (err) {
            }
          });       
           sub.unsubscribe();
        }
      })
    }, 1000);
    
    
  }

  filterProductos() {
    const term = this.searchTerm.toLowerCase();
    if (term) {
      this.productos = this.allProductos.filter(producto => 
        producto.nombre.toLowerCase().includes(term) ||
        producto.descripcion.toLowerCase().includes(term) ||
        producto.precio.toString().includes(term)
      );
    } else {
      this.productos = [...this.allProductos]; // Reset to all products
    }
  }

  // Verificar si un producto ya está en el carrito de eventos
  isProductInCart(producto: any): boolean {
    const carrito = this.carrito();
    if (carrito[0].total > 0 && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      return carrito[0].detalle_carrito.some((item: any) => item.uid_producto === producto.id);
    }
    return false;
  }

  // Navegar al carrito de eventos
  goToCart() {
    this.utilsSvc.routerLink('/main/carrito-eventos');
  }
}

