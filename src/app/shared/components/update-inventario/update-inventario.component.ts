import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators  } from '@angular/forms';
import { take } from 'rxjs';
import { ProductBodega } from 'src/app/models/productBodega.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-update-inventario',
  templateUrl: './update-inventario.component.html',
  styleUrls: ['./update-inventario.component.scss'],
})
export class UpdateInventarioComponent  implements OnInit {

  dataSelect = [];
  
  @Input() user: User;
  @Input() nombre: string;

  form = new FormGroup({
    id: new FormControl(''),
    name: new FormControl('', [Validators.required]),
    soldUnits: new FormControl(null, [Validators.required, Validators.min(0)])
  })



  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    this.user = this.utilSvc.getFromLocalStorage('user');
    this.getInventario();
    this.getProduct(this.nombre);
  }

  submit() {
    if (this.nombre) {
      this.updateProduct();
    }
  }

  //=========Convierte valores de tipo string a number========
  setNumberInputs() {
    let { soldUnits } = this.form.controls;

    if (soldUnits.value) {
      soldUnits.setValue(parseFloat(soldUnits.value));
    }
  }

  // ===========Actualizar Producto============
  async updateProduct() {
    const { name, soldUnits } = this.form.value; // Obtén los valores del formulario
    const path = 'inventario_bodega';
    const nombre = this.nombre;
  
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    this.firebaseSvc.getCollectionData(path, []).pipe(take(1)).subscribe((products: ProductBodega[]) => {
      // Encuentra el producto a actualizar
      const productToUpdate = products.find(product => product.name?.toLowerCase().trim() === nombre?.toLowerCase().trim());
  
      if (productToUpdate) {
        // Prepara los cambios a realizar
        const updates: Partial<ProductBodega> = {};
  
        if (name) {
          updates.name = name; // Actualiza el campo 'name' si viene un valor
        }
  
        if (soldUnits !== null && soldUnits !== undefined) {
          updates.stock = soldUnits; // Calcula y actualiza el stock
        }
  
        // Actualiza el documento en Firebase
        this.firebaseSvc.updateDocumet(`${path}/${productToUpdate.id}`, updates)
          .then(() => {
            this.utilSvc.presentToast({
              message: `El inventario de ${productToUpdate.name} se actualizó exitosamente`,
              duration: 1500,
              color: 'success',
              position: 'middle',
              icon: 'checkmark-circle-outline',
            });
            this.utilSvc.dismissModal({ success: true });
          })
          .catch(error => {
            this.utilSvc.presentToast({
              message: error.message,
              duration: 2500,
              color: 'primary',
              position: 'middle',
              icon: 'alert-circle-outline',
            });
          })
          .finally(() => loading.dismiss());
      } else {
        // Producto no encontrado
        this.utilSvc.presentToast({
          message: `Producto ${nombre} no encontrado`,
          duration: 2500,
          color: 'warning',
          position: 'middle',
          icon: 'alert-circle-outline',
        });
        loading.dismiss();
      }
    });
  }

  getInventario() {
    let query = [];
    this.firebaseSvc.getCollectionData('inventario_bodega', query).subscribe((products: ProductBodega[]) => {
      // Extrae solo el campo 'name' de cada producto y lo guarda en dataGrafica
      this.dataSelect = products.map(product => product.name);

    });
  }

  getProduct(nombre: string) {
    const path = 'inventario_bodega';
  
    // Agregar un indicador de carga opcional
    this.utilSvc.loading().then((loading) => {
      loading.present();
  
      this.firebaseSvc.getCollectionData(path, []).pipe(take(1)).subscribe({
        next: (products: ProductBodega[]) => {
          const product = products.find(p => p.name?.toLowerCase().trim() === nombre?.toLowerCase().trim());
          if (product) {
            // Actualiza el formulario con los valores del producto encontrado
            this.form.patchValue({
              id: product.id || '', // Asignar el ID del producto (si existe)
              name: product.name || '',
              soldUnits: product.stock || 0, // Mantener vacío hasta que el usuario ingrese datos
            });
          } else {
            // Producto no encontrado
            this.utilSvc.presentToast({
              message: `Producto ${nombre} no encontrado`,
              duration: 2500,
              color: 'warning',
              position: 'middle',
              icon: 'alert-circle-outline',
            });
          }
        },
        error: (error) => {
          this.utilSvc.presentToast({
            message: 'Error al obtener el producto',
            duration: 2500,
            color: 'danger',
            position: 'middle',
            icon: 'alert-circle-outline',
          });
        },
        complete: () => loading.dismiss(),
      });
    });
  }

}
