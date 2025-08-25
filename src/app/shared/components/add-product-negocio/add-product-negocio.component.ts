import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Carrito } from 'src/app/models/carrito.model';
import { CartNegocioService } from 'src/app/services/cart-negocio.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-product-negocio',
  templateUrl: './add-product-negocio.component.html',
  styleUrls: ['./add-product-negocio.component.scss'],
})
export class AddProductNegocioComponent  implements OnInit {

  @Input() producto: any; // Recibe el producto con 'minimo' y 'maximo' incluido
  form: FormGroup;
  form_detalle_carrito: FormGroup;
  selectedOption: string = 'kg';
  prefix: string = 'kg';
  quantity: number = 1;
  dinero: number = 0;
  total: number = 0; 
  rangos: any[] = [];
  filteredOpciones: any[] = [];
  showTortillaSize: boolean = false;

  constructor(
    private fb: FormBuilder,
    private cartNegocioService: CartNegocioService,
    private utilsSvc: UtilsService // Servicio de toasts
  ) {
    this.form = this.fb.group({
      tipoCambio: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      opcion: [''],
      total: [0],
      tamano_tortilla: [''],
    });

    this.form_detalle_carrito = this.fb.group({
      cantidad: ['', Validators.required],
      subtotal: ['', [Validators.required]],
      uid_producto: ['', Validators.required],
      uid_opcion: ['', Validators.required],
      tamano_tortilla: [''],
      minimo: [0],
      maximo: [0],
    });

  }

  getCartCount() {
    const carrito = this.carrito();
    if (carrito && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      return carrito[0].detalle_carrito.length;
    }
    return 0;
  }

  getProductFromCart(productId: string) {
    const carrito = this.carrito();
    if (carrito && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      return carrito[0].detalle_carrito.find((item: any) => item.uid_producto === productId);
    }
    return null;
  }

  ngOnInit() {
    let min = Number(this.producto.minimo);
    let max = Number(this.producto.maximo);
    console.log(this.producto);
    if (isNaN(min) || min < 1) min = 1;
    if (isNaN(max) || max < min) max = 9999;
    this.producto.minimo = min;
    this.producto.maximo = max;

    this.filteredOpciones = Array.isArray(this.producto.opciones) ? this.producto.opciones : [];
    if (this.filteredOpciones.length > 0 && !this.form.value.opcion) {
      this.form.patchValue({ opcion: this.filteredOpciones[0].id });
    }
    let precio = Number(this.buscarPrecioPorId(this.form.value.opcion)) || 0;
    const productInCart = this.getProductFromCart(this.producto.id);
    if (productInCart) {
      let cantidad = Number(productInCart.cantidad);
      if (isNaN(cantidad)) cantidad = min;
      cantidad = Math.max(min, Math.min(Number(this.producto.maximo), cantidad));
      this.form.patchValue({
        tipoCambio: 'kg',
        cantidad: cantidad,
        opcion: productInCart.uid_opcion,
        total: productInCart.subtotal,
        tamano_tortilla: productInCart.tamano_tortilla,
      });
      this.quantity = cantidad;
      if (this.producto.granel && this.form.value.tipoCambio === '$') {
        this.dinero = cantidad * precio;
        this.form.get('cantidad')?.setValue(this.dinero);
      }
    } else {
      this.quantity = min;
      this.form.patchValue({
        cantidad: min
      });
      const defaultOption = this.producto.opciones.find((opcion: any) => opcion.nombre === 'Con aluminio');
      if (defaultOption) {
        this.form.patchValue({
          opcion: defaultOption.id
        });
        precio = Number(this.buscarPrecioPorId(defaultOption.id)) || 0;
      }
      if (this.producto.granel && this.form.value.tipoCambio === '$') {
        this.dinero = min * precio;
        this.form.get('cantidad')?.setValue(this.dinero);
      }
    }
    if (this.producto.granel && this.form.value.tipoCambio === '$') {
      this.dinero = min * precio;
      this.quantity = min;
      this.form.get('cantidad')?.setValue(this.dinero);
    }
    if (this.producto.nombre === 'Tortillas') {
      this.showTortillaSize = true;
    }
  }

  onSelectChange(event: any) {
    this.prefix = event.detail.value === 'kg' ? 'kg' : '$';
    let min = Number(this.producto.minimo);
    let precio = Number(this.buscarPrecioPorId(this.form.value.opcion)) || 0;
    this.filteredOpciones = Array.isArray(this.producto.opciones) ? this.producto.opciones : [];
    if (this.filteredOpciones.length > 0 && !this.form.value.opcion) {
      this.form.patchValue({ opcion: this.filteredOpciones[0].id });
      precio = Number(this.buscarPrecioPorId(this.form.value.opcion)) || 0;
    }
    if (event.detail.value === 'kg') {
      if (Number(this.quantity) < min) {
        this.quantity = min;
        this.form.get('cantidad')?.setValue(this.quantity);
      }
    } else if (event.detail.value === '$') {
      // Siempre muestra el mínimo en pesos al cambiar a granel
      this.dinero = min * precio;
      this.quantity = min;
      this.form.get('cantidad')?.setValue(this.dinero);
    }
  }

  carrito(): Carrito {
    const carrito = this.utilsSvc.getFromLocalStorage('carrito_negocio');
    // Initialize cart if it doesn't exist or is invalid
    if (!carrito || !Array.isArray(carrito) || !carrito[0]) {
      const initialCart = [{
        id: '',
        total: 0,
        detalle_carrito: []
      }];
      this.utilsSvc.setElementInLocalstorage('carrito_negocio', initialCart);
    }
    return carrito;
  }

  increment() {
    let min = Number(this.producto.minimo);
    let max = Number(this.producto.maximo);
    let current = Number(this.quantity);
    if (isNaN(min) || min < 1) min = 1;
    if (isNaN(max) || max < min) max = 9999;
    if (isNaN(current)) current = min;
    if (current < max) {
      this.quantity = current + 1;
      this.form.get('cantidad')?.setValue(this.quantity);
    } else {
      this.quantity = max;
      this.form.get('cantidad')?.setValue(this.quantity);
      this.utilsSvc.presentToast({
        message: `Cantidad máxima permitida es ${max} kg`,
        duration: 2500,
        color: 'primary',
        position: 'bottom',
        icon: 'alert-circle-outline',
      });
    }
  }

  buscarPrecioPorId(id: string) {
    // Verificar que el arreglo de opciones no sea nulo o vacío
    if (!this.producto?.opciones || this.producto.opciones.length === 0) {
      console.error('El arreglo "opciones" no existe o está vacío.');
      return undefined;
    }
    let opcion =[]
    // Buscar la opción por el ID proporcionado
    opcion = this.producto.opciones.find((opcion: any) => {
      if(opcion.id==id) return opcion.precio
      
    });
    return opcion['precio'];
  }
  

  decrement() {
    let min = Number(this.producto.minimo);
    let current = Number(this.quantity);
    if (isNaN(min) || min < 1) min = 1;
    if (isNaN(current)) current = min;
    if (current > min) {
      this.quantity = current - 1;
      this.form.get('cantidad')?.setValue(this.quantity);
    } else {
      this.quantity = min;
      this.form.get('cantidad')?.setValue(this.quantity);
      this.utilsSvc.presentToast({
        message: `La cantidad mínima permitida es ${min} kg`,
        duration: 2000,
        color: 'warning',
        position: 'bottom',
        icon: 'remove-circle-outline',
      });
    }
  }

  onInputChange(event: any) {
    let inputValue = Number(event.target.value);
    let min = Number(this.producto.minimo);
    let max = Number(this.producto.maximo);
    let precio = Number(this.buscarPrecioPorId(this.form.value.opcion)) || 0;

    if (isNaN(min) || min < 1) min = 1;
    if (isNaN(max) || max < min) max = 9999;
    if (isNaN(inputValue)) inputValue = min * precio;

    if (this.form.value.tipoCambio === '$') {
      // El usuario ingresa pesos, convertir a kg
      let minPesos = min * precio;
      let kg = precio ? parseFloat((inputValue / precio).toFixed(2)) : min;
      if (inputValue < minPesos) {
        kg = min;
        inputValue = minPesos;
        this.form.get('cantidad')?.setValue(inputValue);
        this.quantity = kg;
        this.utilsSvc.presentToast({
          message: `El monto mínimo permitido es $${minPesos} (${min} kg)`,
          duration: 2000,
          color: 'warning',
          position: 'bottom',
          icon: 'remove-circle-outline',
        });
        return;
      } else if (kg > max) {
        kg = max;
        inputValue = max * precio;
        this.form.get('cantidad')?.setValue(inputValue);
        this.quantity = kg;
        this.utilsSvc.presentToast({
          message: `Cantidad máxima permitida es ${max} kg`,
          duration: 2500,
          color: 'primary',
          position: 'bottom',
          icon: 'alert-circle-outline',
        });
        return;
      }
      this.quantity = kg;
      this.form.get('cantidad')?.setValue(inputValue);
    } else {
      // Modo kg normal
      if (inputValue > max) {
        this.quantity = max;
        this.form.get('cantidad')?.setValue(max);
        this.utilsSvc.presentToast({
          message: `Cantidad máxima permitida es ${max} kg`,
          duration: 2500,
          color: 'primary',
          position: 'bottom',
          icon: 'alert-circle-outline',
        });
      } else if (inputValue < min) {
        this.quantity = min;
        this.form.get('cantidad')?.setValue(min);
        this.utilsSvc.presentToast({
          message: `Cantidad mínima permitida es ${min} kg`,
          duration: 2000,
          color: 'warning',
          position: 'bottom',
          icon: 'remove-circle-outline',
        });
      } else {
        this.quantity = inputValue;
        this.form.get('cantidad')?.setValue(this.quantity);
      }
    }
  }

  onKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow: backspace, delete, tab, escape, enter, decimal point
    if ([8, 9, 27, 13, 46, 110, 190].indexOf(charCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (charCode === 65 && event.ctrlKey === true) ||
        (charCode === 67 && event.ctrlKey === true) ||
        (charCode === 86 && event.ctrlKey === true) ||
        (charCode === 88 && event.ctrlKey === true)) {
      return true;
    }
    // Ensure that it is a number and stop the keypress
    if ((charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  actualizarTotal() {
    // Calcula el total en modo granel ($)
    let dinero = Number(this.form.value.cantidad);
    let precio = Number(this.buscarPrecioPorId(this.form.value.opcion)) || 0;
    if (precio === 0) return 0;
    let kg = parseFloat((dinero / precio).toFixed(2));
    let min = Number(this.producto.minimo);
    let max = Number(this.producto.maximo);
    if (kg < min) kg = min;
    if (kg > max) kg = max;
    return kg;
  }

  actualizarTotalKg() {
    // Calcula el total en modo kg
    let cantidad = Number(this.form.value.cantidad);
    let precio = Number(this.buscarPrecioPorId(this.form.value.opcion)) || 0;
    let total = cantidad * precio;
    let min = Number(this.producto.minimo);
    let max = Number(this.producto.maximo);
    if (cantidad < min) cantidad = min;
    if (cantidad > max) cantidad = max;
    return total;
  }

  isProductInCart(productId: string): boolean {
    const carrito = this.carrito();
    if (carrito && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      return carrito[0].detalle_carrito.some((item: any) => item.uid_producto === productId);
    }
    return false;
  }

  updateProductInCart(productId: string, cantidad: number, subtotal: number, tamano_tortilla: number) {
    const carrito = this.carrito();
    if (carrito && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      const productIndex = carrito[0].detalle_carrito.findIndex((item: any) => item.uid_producto === productId);
      if (productIndex !== -1) {
        const oldSubtotal = carrito[0].detalle_carrito[productIndex].subtotal;
        carrito[0].detalle_carrito[productIndex].cantidad = cantidad;
        carrito[0].detalle_carrito[productIndex].subtotal = subtotal;
        carrito[0].detalle_carrito[productIndex].tamano_tortilla = tamano_tortilla;
        carrito[0].total = carrito[0].total - oldSubtotal + subtotal;
        carrito[0].detalle_carrito[productIndex].uid_opcion = this.form.value.opcion;
        this.utilsSvc.setElementInLocalstorage('carrito_negocio', carrito);
      }
    }
  }

  

  submit() {
    if (this.form.valid) {
      const productId = this.producto.id;
      let cantidad = this.form.value.cantidad;
      const precio = Number(this.buscarPrecioPorId(this.form.value.opcion)) || 0;
      const tamano_tortilla = this.form.value.tamano_tortilla;

      if (this.producto.granel && this.form.value.tipoCambio === '$') {
        // En granel, cantidad es pesos, convertir a kg
        let minPesos = Number(this.producto.minimo) * precio;
        if (cantidad < minPesos) {
          this.utilsSvc.presentToast({
            message: `El monto mínimo permitido es $${minPesos} (${this.producto.minimo} kg)`,
            duration: 2000,
            color: 'warning',
            position: 'bottom',
            icon: 'remove-circle-outline',
          });
          return;
        }
        cantidad = precio ? parseFloat((cantidad / precio).toFixed(2)) : 0;
      }

      const subtotal = cantidad * precio;

      if (this.isProductInCart(productId)) {
        this.cartNegocioService.updateProductInCart(productId, cantidad, subtotal, tamano_tortilla);
        this.utilsSvc.presentToast({
          message: 'Producto actualizado en el carrito',
          duration: 2500,
          color: 'primary',
          position: 'bottom',
          icon: 'cart-outline',
        });
      } else {
        if (this.producto.granel) {
          // =========================CARRITO=========================
          this.form_detalle_carrito.get('cantidad')?.setValue(cantidad);
          this.form_detalle_carrito.get('subtotal')?.setValue(subtotal);
          this.form_detalle_carrito.get('uid_producto')?.setValue(productId);
          this.form_detalle_carrito.get('minimo')?.setValue(this.producto.minimo);
          this.form_detalle_carrito.get('maximo')?.setValue(this.producto.maximo);
          this.form_detalle_carrito.value.uid_opcion = this.form.value.opcion;
          if (this.showTortillaSize) { this.form_detalle_carrito.value.tamano_tortilla = tamano_tortilla; }
          const formDetalleCarrito = this.form_detalle_carrito.value;
          const formCarritoTotal = subtotal;
          this.cartNegocioService.addToCart(formCarritoTotal, formDetalleCarrito);
        } else {
          // =========================PRODUCTO NO GRANEL=========================
          // Definir el valor de la cantidad
          this.form_detalle_carrito.get('cantidad')?.setValue(cantidad);

          // Definir el valor del subtotal
          this.form_detalle_carrito.get('subtotal')?.setValue(subtotal);

          this.form_detalle_carrito.get('uid_producto')?.setValue(productId);
          this.form_detalle_carrito.get('minimo')?.setValue(this.producto.minimo);
          this.form_detalle_carrito.get('maximo')?.setValue(this.producto.maximo);
          this.form_detalle_carrito.value.uid_opcion = this.form.value.opcion;
          const formDetalleCarrito = this.form_detalle_carrito.value;
          const formCarritoTotal = subtotal;

          this.cartNegocioService.addToCart(formCarritoTotal, formDetalleCarrito);
        }
        this.utilsSvc.presentToast({
          message: `Producto agregado al carrito`,
          duration: 2500,
          color: 'primary',
          position: 'bottom',
          icon: 'cart-outline',
        });
      }
      this.utilsSvc.dismissModal(true);
    }
  }
  

}