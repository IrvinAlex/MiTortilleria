import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Producto } from 'src/app/models/producto.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-gestion',
  templateUrl: './add-update-gestion.component.html',
  styleUrls: ['./add-update-gestion.component.scss'],
})
export class AddUpdateGestionComponent  implements OnInit {
  @Input() producto: Producto | null = null;
  

  form = new FormGroup({
    uid: new FormControl(''),
    imagen: new FormControl('', [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.minLength(4)]),
    descripcion: new FormControl('', [Validators.required, Validators.minLength(4)]),
    // Solo enteros no negativos
    stock: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.pattern(/^\d+$/)
    ]),
    disponible: new FormControl(false, [Validators.required]),
  })



  firebaseSvc = inject(FirebaseService);
  utilSvc = inject(UtilsService);

  ngOnInit() {
    if (this.producto) {
      this.form.patchValue({
        ...this.producto,
      });
      
    }
    // Sanitiza inputs numéricos
    this.setNumberInputs();
  }
  
  setNumberInputs(){
    const stockCtrl = this.form.controls.stock as FormControl<number | null>;
    stockCtrl.valueChanges.subscribe((val) => {
      if (val === null || val === undefined) return;
      const asString = String(val);
      // Mantener solo dígitos
      const onlyDigits = asString.replace(/[^\d]/g, '');
      if (onlyDigits === '') {
        stockCtrl.setValue(null, { emitEvent: false });
        return;
      }
      // Asegurar entero no negativo
      const num = Math.max(0, parseInt(onlyDigits, 10));
      if (num !== val) {
        stockCtrl.setValue(num, { emitEvent: false });
      }
    });
  }

  //================ Tomar/Seleccionar Imagen ====================
  async takePicture() {
    const dataUrl = (await this.utilSvc.takePicture('Imagen del producto')).dataUrl;
    this.form.controls.imagen.setValue(dataUrl);
  }

  async submit() {
    if (this.form.valid) {
      if (this.producto) {
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
      if (this.form.value.imagen) {
        const imagePath = `productos/${Date.now()}`;
        imageUrl = await this.firebaseSvc.uploadImage(imagePath, this.form.value.imagen);
        this.form.controls.imagen.setValue(imageUrl);
      }

      // Asegurar que stock sea number y no negativo
      const rawStock = this.form.value.stock as unknown as string | number | null;
      const stockNumber = typeof rawStock === 'number' ? rawStock : parseInt(String(rawStock ?? ''), 10);
      this.form.controls.stock.setValue(Number.isFinite(stockNumber) ? Math.max(0, stockNumber) : 0);
  
      const newProduct = { ...this.form.value, imagen: imageUrl};
  
      // Usamos el nuevo método para agregar el usuario con el uid generado
      await this.firebaseSvc.addDocumentWithUid(path, newProduct);

      this.utilSvc.presentToast({
        message: `Producto creado exitosamente`,
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: 'checkmark-circle-outline'
      })

      this.utilSvc.dismissModal({ success: true });
    } catch (error) {


      this.utilSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      })

    } finally {
      loading.dismiss();
    }




  }

  async updateProduct() {
    
    let path = `productos/${this.producto.uid}`
    const loading = await this.utilSvc.loading();
    await loading.present();

    //============== si cambio la imagen, Subir la nueva y obtener la  URL==========
    if (this.form.value.imagen !== this.producto.imagen) {
      let dataUrl = this.form.value.imagen;
      let imagePath = await this.firebaseSvc.getFilePath(this.producto.imagen);
      let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);
      this.form.controls.imagen.setValue(imageUrl);
    }


    // Asegurar que stock sea number y no negativo
    const rawStock = this.form.value.stock as unknown as string | number | null;
    const stockNumber = typeof rawStock === 'number' ? rawStock : parseInt(String(rawStock ?? ''), 10);
    this.form.controls.stock.setValue(Number.isFinite(stockNumber) ? Math.max(0, stockNumber) : 0);

    delete this.form.value.uid

    this.firebaseSvc.updateDocumet(path, this.form.value).then(async res => {

      this.utilSvc.dismissModal({ success: true });

      this.utilSvc.presentToast({
        message: `Producto actualizado exitosamente`,
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


}
