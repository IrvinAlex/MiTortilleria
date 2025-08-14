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

  @Input() producto: any; // Recibe el producto con 'stock' incluido
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

    const productInCart = this.getProductFromCart(this.producto.id);
    console.log(this.producto);
    if (productInCart) {
      this.form.patchValue({
        tipoCambio: 'kg',
        cantidad: productInCart.cantidad,
        opcion: productInCart.uid_opcion,
        total: productInCart.subtotal,
        tamano_tortilla: productInCart.tamano_tortilla,
      });
      this.quantity = productInCart.cantidad;
    } else {
      const defaultOption = this.producto.opciones.find((opcion: any) => opcion.nombre === 'Con aluminio');
      if (defaultOption) {
        this.form.patchValue({
          opcion: defaultOption.id
        });
      }
    }
    this.filteredOpciones = this.producto.opciones;
    if (this.producto.nombre === 'Tortillas') {
      this.showTortillaSize = true;
    }
  }

  onSelectChange(event: any) {
    this.prefix = event.detail.value === 'kg' ? 'kg' : '$';
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
    if (this.quantity < this.producto.maximo) {
      this.quantity=this.quantity+1;
      this.form.get('cantidad')?.setValue(this.quantity);
    } else {
      this.utilsSvc.presentToast({
        message: 'Cantidad excede el máximo disponible',
        duration: 2500,
        color: 'primary',
        position: 'middle',
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
    if (this.quantity > this.producto.minimo) {
      this.quantity=this.quantity-1;
      this.form.get('cantidad')?.setValue(this.quantity);
    }
  }

  onInputChange(event: any) {
    const inputValue = event.target.value;
    if (inputValue > this.producto.maximo) {
      this.utilsSvc.presentToast({
        message: 'Cantidad ingresada excede el máximo disponible',
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
      this.quantity = this.producto.maximo; // Corrige la cantidad al máximo permitido
      this.form.get('cantidad')?.setValue(this.quantity);
    } else if (inputValue < 0) {
      this.quantity = 0; // Evita valores negativos
      this.form.get('cantidad')?.setValue(this.quantity);
    } else {
      this.quantity = inputValue; // Actualiza con un valor válido
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
    const dinero = this.form.value.cantidad;
    const precio = this.buscarPrecioPorId(this.form.value.opcion) || 0;
    this.total = parseFloat((dinero / precio).toFixed(2));
    const carrito = this.carrito();
    this.form.value.total = (carrito && carrito[0] ? carrito[0].total : 0) + this.dinero;
    
    return this.total;
  }
  
  actualizarTotalKg() {
    let total = this.form.value.cantidad * this.buscarPrecioPorId(this.form.value.opcion);
    const carrito = this.carrito();
    this.form.value.total = (carrito && carrito[0] ? carrito[0].total : 0) + total;
    return this.form.value.total;
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
      const cantidad = this.form.value.cantidad;
      const subtotal = this.form.value.cantidad * this.buscarPrecioPorId(this.form.value.opcion);
      const tamano_tortilla = this.form.value.tamano_tortilla;

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
          if (this.form.value.tipoCambio === 'kg') {
            // =========================CARRITO=========================
            // Definir el valor de la cantidad en kg
            this.form_detalle_carrito.get('cantidad')?.setValue(cantidad);

            // Definir el valor del subtotal
            this.form_detalle_carrito.get('subtotal')?.setValue(subtotal);

            this.form_detalle_carrito.get('uid_producto')?.setValue(productId);

            
            this.form_detalle_carrito.value.uid_opcion = this.form.value.opcion;
            if (this.showTortillaSize) { this.form_detalle_carrito.value.tamano_tortilla = tamano_tortilla; }
            const formDetalleCarrito = this.form_detalle_carrito.value;
            const formCarritoTotal = subtotal;

            this.cartNegocioService.addToCart(formCarritoTotal, formDetalleCarrito);
          } else if (this.form.value.tipoCambio === '$') {
            // =========================DETALLE DEL CARRITO=========================
            // Definir el valor de la cantidad en kg
            this.form_detalle_carrito.get('cantidad')?.setValue(this.actualizarTotal());

            // Definir el valor del subtotal
            this.form_detalle_carrito.get('subtotal')?.setValue(cantidad);

            this.form_detalle_carrito.get('uid_producto')?.setValue(productId);
            this.form_detalle_carrito.value.uid_opcion = this.form.value.opcion;
            if (this.showTortillaSize) { this.form_detalle_carrito.value.tamano_tortilla = tamano_tortilla; }
            const formDetalleCarrito = this.form_detalle_carrito.value;
            const formCarritoTotal = cantidad;

            this.cartNegocioService.addToCart(formCarritoTotal, formDetalleCarrito);
          }
        } else {
          // =========================PRODUCTO NO GRANEL=========================
          // Definir el valor de la cantidad
          this.form_detalle_carrito.get('cantidad')?.setValue(cantidad);

          // Definir el valor del subtotal
          this.form_detalle_carrito.get('subtotal')?.setValue(subtotal);

          this.form_detalle_carrito.get('uid_producto')?.setValue(productId);
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
