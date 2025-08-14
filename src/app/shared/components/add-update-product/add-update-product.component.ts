import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Product } from 'src/app/models/product.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';


@Component({
  selector: 'app-add-update-product',
  templateUrl: './add-update-product.component.html',
  styleUrls: ['./add-update-product.component.scss'],
})
export class AddUpdateProductComponent implements OnInit {

  @Input() product: Product | null = null;

  form = new FormGroup({
    id: new FormControl(''),
    image: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required, Validators.minLength(4)]),
    price: new FormControl(null, [Validators.required, Validators.min(0)]),
    soldUnits: new FormControl(null, [Validators.required, Validators.min(0)])
  })



  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    if (this.product) {
      this.form.patchValue({
        ...this.product,
      });
      
    }
  }


  //================ Tomar/Seleccionar Imagen ====================
  async takePicture() {
    const dataUrl = (await this.utilSvc.takePicture('Imagen del producto')).dataUrl;
    this.form.controls.image.setValue(dataUrl);
  }

  async submit() {
    if (this.form.valid) {

      if (this.product) {
        await this.updateProduct();
      } else {
        await this.createProduct();
      }
    }

  }

  // ===========Crear Producto============

  async createProduct() {
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    try {
      const path = `productos`;
  
      // Subir imagen solo si hay una
      let imageUrl = '';
      if (this.form.value.image) {
        const imagePath = `productos/${Date.now()}`;
        imageUrl = await this.firebaseSvc.uploadImage(imagePath, this.form.value.image);
        this.form.controls.image.setValue(imageUrl);
      }
  
      const newProduct = { ...this.form.value, image: imageUrl};
  
      // Usamos el nuevo método para agregar el usuario con el uid generado
      await this.firebaseSvc.addDocumentWithUid(path, newProduct);
  
      this.utilSvc.presentToast({
        message: `Usuario creado exitosamente`,
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
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
    } finally {
      loading.dismiss();
    }
  }

  async updateProduct() {
    
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    try {
      const path = `productos/${this.product?.id}`;
      console.log('Ruta para actualizar usuario:', path);
  
      // Manejo de imagen
      if (this.form.value.image && this.form.value.image !== this.product?.image) {
        const imagePath = `prodcutos/${Date.now()}`;
        const imageUrl = await this.firebaseSvc.uploadImage(imagePath, this.form.value.image);
        this.form.controls.image.setValue(imageUrl);
      }
  
      // Preparar datos
      const updatedProduct = { ...this.form.value };
      delete updatedProduct.id;
      console.log('Datos a actualizar:', updatedProduct);
  
      // Actualizar documento en Firebase
      await this.firebaseSvc.updateDocumet(path, updatedProduct);
  
      // Mostrar mensaje de éxito
      this.utilSvc.presentToast({
        message: `Producto actualizado exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline',
      });
  
      // Cerrar modal y enviar datos actualizados
      this.utilSvc.dismissModal({ success: true, data: updatedProduct });
    } catch (error) {
      // Manejar errores
      this.utilSvc.presentToast({
        message: `Error al actualizar usuario: ${error.message}`,
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
      console.error('Error al actualizar usuario:', error);
    } finally {
      loading.dismiss();
    }

  }


}
