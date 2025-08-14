import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Producto } from 'src/app/models/producto.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-precios',
  templateUrl: './add-update-precios.component.html',
  styleUrls: ['./add-update-precios.component.scss'],
})
export class AddUpdatePreciosComponent  implements OnInit {

  dataSelect = [];

  @Input() producto: Producto | null = null;
  

  form = new FormGroup({
    uid: new FormControl(''),
    uidProducto: new FormControl(''),
    nombreProducto: new FormControl('', [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.minLength(4)]),
    precio: new FormControl(null, [Validators.required, Validators.min(0)]),
    granel: new FormControl(false, [Validators.required]), 
  })



  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    if (this.producto) {
      this.form.patchValue({
        ...this.producto,
      });
      
    }
    this.getInventario();
  }
  

  setNumberInputs(){}



  async submit() {
    
    if (this.form.valid) {
      if (this.producto) {
        await this.updateProduct();
      } else {
        await this.createProduct(this.form.value);
      }
    }
  }

  onProductChange(event: any) {
    const selectedProduct = this.dataSelect.find(profile => profile.uidProducto === event.detail.value);
    if (selectedProduct) {
      this.form.patchValue({
        uidProducto: selectedProduct.uidProducto,
        nombreProducto: selectedProduct.nombreProducto, // Aseguramos que el nombre se actualice
      });
    }
  }

  // ===========Crear Producto============

  async createProduct(form) {
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    try {
      const path = `productos`;
  
      const newProduct = { ...form };
      

      const subcollectionPath = `productos/${newProduct.uidProducto}/opciones`;
      const newOption = {
        nombre: newProduct.nombre, // Define los campos de la opción
        precio: newProduct.precio,
        granel: newProduct.granel,
      };
  
      await this.firebaseSvc.addDocumentWithUid(subcollectionPath, newOption);
  
      // Notificación de éxito
      this.utilSvc.presentToast({
        message: `Producto y opciones creados exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline',
      });
  
      this.utilSvc.dismissModal({ success: true });
    } catch (error) {
      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
    } finally {
      loading.dismiss();
    }
  }

  async updateProduct() {

    let path = `productos/${this.producto.uidProducto}/opciones/${this.form.value.uid}`;
    const loading = await this.utilSvc.loading();
    await loading.present();
  
      // Actualizar el documento dentro de la subcolección
    this.firebaseSvc.updateDocumet(path, this.form.value).then(async res => {
      
      // Mostrar mensaje de éxito
      this.utilSvc.dismissModal({ success: true });
      this.utilSvc.presentToast({
        message: `Producto actualizado exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      })
  
    }).catch(error => {
      // Manejar errores
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

  getInventario() {
    let query = [];
    this.firebaseSvc.getCollectionData('productos', query).subscribe((productos: any[]) => {
      // Mapear para incluir solo el nombre y uid
      this.dataSelect = productos.map(product => ({
        nombreProducto: product.nombre, // Extraemos el nombre
        uidProducto: product.uid,        // Incluimos el uid del documento
      }));
  
    });
  }

}
