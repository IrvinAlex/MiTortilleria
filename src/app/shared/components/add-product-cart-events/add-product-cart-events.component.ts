import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Carrito } from 'src/app/models/carrito.model';
import { CartEventService } from 'src/app/services/cart-event.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-product-cart-events',
  templateUrl: './add-product-cart-events.component.html',
  styleUrls: ['./add-product-cart-events.component.scss'],
})
export class AddProductCartEventsComponent  implements OnInit {

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

  constructor(
    private fb: FormBuilder,
    private cartService: CartEventService,
    private utilsSvc: UtilsService // Servicio de toasts
  ) {
    this.form = this.fb.group({
      tipoCambio: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      opcion: [''],
      total: [0],
    });

    this.form_detalle_carrito = this.fb.group({
      cantidad: ['', Validators.required],
      subtotal: ['', [Validators.required]],
      uid_producto: ['', Validators.required],
      uid_opcion: ['', Validators.required],
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
        total: productInCart.subtotal
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
    this.filteredOpciones = this.producto.opciones.filter((opcion: any) => opcion.nombre === 'Con aluminio');
  }

  onSelectChange(event: any) {
    this.prefix = event.detail.value === 'kg' ? 'kg' : '$';
  }

  carrito(): Carrito {
    return this.utilsSvc.getFromLocalStorage('carrito_eventos');
  }

  increment() {
    if (this.quantity < this.producto.stock) {
      this.quantity = this.quantity + 1;
      this.form.get('cantidad')?.setValue(this.quantity);
    } else {
      this.utilsSvc.presentToast({
        message: 'Cantidad excede el stock disponible',
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
    if (this.quantity > 1) {
      this.quantity = this.quantity - 1;
      this.form.get('cantidad')?.setValue(this.quantity);
    }
  }

  onInputChange(event: any) {
    const inputValue = event.target.value;
    if (inputValue > this.producto.stock) {
      this.utilsSvc.presentToast({
        message: 'Cantidad ingresada excede el stock disponible',
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline',
      });
      this.quantity = this.producto.stock; // Corrige la cantidad al máximo permitido
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
    this.form.value.total = this.carrito()[0].total + this.dinero;
    
    return this.total;
  }
  
  actualizarTotalKg() {
    let total=this.form.value.cantidad * this.buscarPrecioPorId(this.form.value.opcion);
    this.form.value.total = this.carrito()[0].total + total;
    return this.form.value.total;
  }

  isProductInCart(productId: string): boolean {
    const carrito = this.carrito();
    if (carrito && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      return carrito[0].detalle_carrito.some((item: any) => item.uid_producto === productId);
    }
    return false;
  }

  updateProductInCart(productId: string, cantidad: number, subtotal: number) {
    const carrito = this.carrito();
    if (carrito && carrito[0] && Array.isArray(carrito[0].detalle_carrito)) {
      const productIndex = carrito[0].detalle_carrito.findIndex((item: any) => item.uid_producto === productId);
      if (productIndex !== -1) {
        const oldSubtotal = carrito[0].detalle_carrito[productIndex].subtotal;
        carrito[0].detalle_carrito[productIndex].cantidad = cantidad;
        carrito[0].detalle_carrito[productIndex].subtotal = subtotal;
        carrito[0].total = carrito[0].total - oldSubtotal + subtotal;
        carrito[0].detalle_carrito[productIndex].uid_opcion = this.form.value.opcion;
        this.utilsSvc.setElementInLocalstorage('carrito_eventos', carrito);
      }
    }
  }

  

  submit() {
    if (this.form.valid) {
      const productId = this.producto.id;
      const cantidad = this.form.value.cantidad;
      const subtotal = this.form.value.cantidad * this.buscarPrecioPorId(this.form.value.opcion);

      if (this.isProductInCart(productId)) {
        this.cartService.updateProductInCart(productId, cantidad, subtotal);
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
            const formDetalleCarrito = this.form_detalle_carrito.value;
            const formCarritoTotal = subtotal;

            this.cartService.addToCart(formCarritoTotal, formDetalleCarrito);
          } else if (this.form.value.tipoCambio === '$') {
            // =========================DETALLE DEL CARRITO=========================
            // Definir el valor de la cantidad en kg
            this.form_detalle_carrito.get('cantidad')?.setValue(this.actualizarTotal());

            // Definir el valor del subtotal
            this.form_detalle_carrito.get('subtotal')?.setValue(cantidad);

            this.form_detalle_carrito.get('uid_producto')?.setValue(productId);
            this.form_detalle_carrito.value.uid_opcion = this.form.value.opcion;
            const formDetalleCarrito = this.form_detalle_carrito.value;
            const formCarritoTotal = cantidad;

            this.cartService.addToCart(formCarritoTotal, formDetalleCarrito);
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

          this.cartService.addToCart(formCarritoTotal, formDetalleCarrito);
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
