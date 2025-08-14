import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { ProductBodega } from 'src/app/models/productBodega.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-inventario',
  templateUrl: './add-update-inventario.component.html',
  styleUrls: ['./add-update-inventario.component.scss'],
})
export class AddUpdateInventarioComponent  implements OnInit {

  dataSelect = [];
  
  @Input() user: User;

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
  }

  submit() {
    if (this.form.valid) {
      this.updateProduct();
    }
  }

  // =========== Convierte valores de tipo string a number ============
  setNumberInputs(){
    let { soldUnits } = this.form.controls;
    if(soldUnits.value) soldUnits.setValue(parseFloat(soldUnits.value));

  }

  // ===========Crear Producto============

  async createProduct() {


    let path = `users/${this.user.uid}/products`


    const loading = await this.utilSvc.loading();
    await loading.present();

    delete this.form.value.id

    this.firebaseSvc.addDocument(path, this.form.value).then(async res => {

      this.utilSvc.dismissModal({ success: true });

      this.utilSvc.presentToast({
        message: `Producto creado exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      })


    }).catch(error => {


      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      })

    }).finally(() => {
      loading.dismiss();
    })



  }

  // ===========Actualizar Producto============
  async updateProduct() {
    const { name, soldUnits } = this.form.value;
    const path = 'inventario_bodega';
  
    const loading = await this.utilSvc.loading();
    await loading.present();
    
  
    // Llama a getCollectionData con un arreglo vacío si no necesitas condiciones
    this.firebaseSvc.getCollectionData(path, []).pipe(take(1)).subscribe((products: ProductBodega[]) => {
    
      const productToUpdate = products.find(product => product.name?.toLowerCase().trim() === name?.toLowerCase().trim());
    
      if (productToUpdate) {
        // Actualiza el producto
        const newStock = productToUpdate.stock + soldUnits;
        this.firebaseSvc.updateDocumet(`${path}/${productToUpdate.id}`, { stock: newStock })
          .then(() => {
            this.utilSvc.presentToast({
              message: `El inventario de ${name} se actualizó exitosamente`,
              duration: 1500,
              color: 'success',
              position: 'middle',
              icon: 'checkmark-circle-outline'
            });
            this.utilSvc.dismissModal({ success: true });
          })
          .catch(error => {
            this.utilSvc.presentToast({
              message: error.message,
              duration: 2500,
              color: 'primary',
              position: 'middle',
              icon: 'alert-circle-outline'
            });
          })
          .finally(() => loading.dismiss());
      } else {
        this.utilSvc.presentToast({
          message: `Producto ${name} no encontrado`,
          duration: 2500,
          color: 'warning',
          position: 'middle',
          icon: 'alert-circle-outline'
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

}
