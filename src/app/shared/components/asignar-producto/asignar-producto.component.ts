import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { ProductBodega } from 'src/app/models/productBodega.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { Timestamp } from 'firebase/firestore';


@Component({
  selector: 'app-asignar-producto',
  templateUrl: './asignar-producto.component.html',
  styleUrls: ['./asignar-producto.component.scss'],
})
export class AsignarProductoComponent  implements OnInit {

  dataSelect = [];
  
  @Input() user: User;

  form = new FormGroup({
    id: new FormControl(''),
    cal: new FormControl(0, [Validators.required, Validators.min(0)]),
    maiz: new FormControl(0, [Validators.required, Validators.min(0)])
  });


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

  // ===========Actualizar Producto============
  async updateProduct() {
    const { cal, maiz } = this.form.value;
    const path = 'inventario_bodega';
    const registroPath = 'registro_asignacion'; // Ruta para la colección donde guardarás el registro
    
    // Obtener el timestamp actual
    const currentTimestamp = Timestamp.now();  // Usar Timestamp ahora correctamente
  
    const loading = await this.utilSvc.loading();
    await loading.present();
  
    // Se obtienen todos los productos desde Firebase
    this.firebaseSvc.getCollectionData(path, []).pipe(take(1)).subscribe((products: ProductBodega[]) => {
      const productCal = products.find(product => product.name?.toLowerCase().trim() === 'cal');
      const productMaiz = products.find(product => product.name?.toLowerCase().trim() === 'maíz');
  
      // Se actualiza el stock de cal si se ha ingresado cantidad
      if (productCal && cal > 0) {
        const newStockCal = productCal.stock - cal;
        if (newStockCal >= 0) {
          // Actualizamos el stock de Cal
          this.firebaseSvc.updateDocumet(`${path}/${productCal.id}`, { stock: newStockCal })
            .then(() => {
              this.utilSvc.presentToast({
                message: `El inventario de cal se actualizó exitosamente`,
                duration: 1500,
                color: 'success',
                position: 'middle',
                icon: 'checkmark-circle-outline'
              });
  
              // Registrar en 'registro_asignacion' con timestamp
              this.firebaseSvc.addDocument(registroPath, {
                producto: 'cal',
                cantidadAsignada: cal,
                fechaAsignacion: currentTimestamp, // Usamos el timestamp
                usuario: this.user.name // O cualquier dato del usuario que quieras registrar
              });
            })
            .catch(error => {
              this.utilSvc.presentToast({
                message: error.message,
                duration: 2500,
                color: 'primary',
                position: 'middle',
                icon: 'alert-circle-outline'
              });
            });
  
          // Verificar si el stock de cal es menor a 20
          if (newStockCal < 20) {
            this.utilSvc.presentToast({
              message: `¡Alerta! El stock de cal es inferior a 20 costales. Necesitas abastecerte.`,
              duration: 3000,
              color: 'danger',
              position: 'bottom',
              icon: 'alert-circle-outline'
            });
          }
        }
      }
  
      // Se actualiza el stock de maíz si se ha ingresado cantidad
      if (productMaiz && maiz > 0) {
        const newStockMaiz = productMaiz.stock - maiz;
        if (newStockMaiz >= 0) {
          // Actualizamos el stock de Maíz
          this.firebaseSvc.updateDocumet(`${path}/${productMaiz.id}`, { stock: newStockMaiz })
            .then(() => {
              this.utilSvc.presentToast({
                message: `El inventario de maíz se actualizó exitosamente`,
                duration: 1500,
                color: 'success',
                position: 'middle',
                icon: 'checkmark-circle-outline'
              });
  
              // Registrar en 'registro_asignacion' con timestamp
              this.firebaseSvc.addDocument(registroPath, {
                producto: 'maíz',
                cantidadAsignada: maiz,
                fechaAsignacion: currentTimestamp, // Usamos el timestamp
                usuario: this.user.name // O cualquier dato del usuario que quieras registrar
              });
            })
            .catch(error => {
              this.utilSvc.presentToast({
                message: error.message,
                duration: 2500,
                color: 'primary',
                position: 'middle',
                icon: 'alert-circle-outline'
              });
            });
  
          // Verificar si el stock de maíz es menor a 20
          if (newStockMaiz < 20) {
            this.utilSvc.presentToast({
              message: `¡Alerta! El stock de maíz es inferior a 20 costales. Necesitas abastecerte.`,
              duration: 3000,
              color: 'danger',
              position: 'bottom',
              icon: 'alert-circle-outline'
            });
          }
        }
      }
  
      loading.dismiss();
      this.utilSvc.dismissModal({ success: true });
    });
  }
  //Recupera los productos disponibles en el inventario desde Firebase, específicamente desde la colección inventario_bodega.
  //Extrae y guarda los nombres de los productos en el array dataSelect, para que puedan ser seleccionados en la interfaz.

  getInventario() {
    let query = [];
    this.firebaseSvc.getCollectionData('inventario_bodega', query).subscribe((products: ProductBodega[]) => {
      // Extrae solo el campo 'name' de cada producto y lo guarda en dataGrafica
      this.dataSelect = products.map(product => product.name);

    });
  }
}
