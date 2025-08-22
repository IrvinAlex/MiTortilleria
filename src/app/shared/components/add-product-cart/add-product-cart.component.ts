import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Carrito } from 'src/app/models/carrito.model';
import { CartService } from 'src/app/services/cart.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service'; // Servicio para toasts

@Component({
  selector: 'app-add-product-cart',
  templateUrl: './add-product-cart.component.html',
  styleUrls: ['./add-product-cart.component.scss'],
})
export class AddProductCartComponent implements OnInit {
  @Input() producto: any; // Recibe el producto con 'stock' incluido
  form: FormGroup;
  form_detalle_carrito: FormGroup;
  selectedOption: string = 'kg';
  prefix: string = 'kg';
  quantity: number = 1;
  dinero: number = 0;
  total: number = 0; 

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private firebaseSvc: FirebaseService,
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
    
    // Set appropriate prefix and selectedOption based on product type
    if (this.isTostadaOrTotopo()) {
      this.prefix = 'Bolsa(s)';
      this.selectedOption = 'bolsa';
    }
    
    if (productInCart) {
      this.form.patchValue({
        tipoCambio: this.isTostadaOrTotopo() ? 'bolsa' : 'kg',
        cantidad: productInCart.cantidad,
        opcion: productInCart.uid_opcion,
        total: productInCart.subtotal
      });
      this.quantity = productInCart.cantidad;
    }
  }

  isTostadaOrTotopo(): boolean {
    const productName = this.producto.nombre?.toLowerCase() || '';
    return productName.includes('tostada') || productName.includes('totopo');
  }

  onSelectChange(event: any) {
    if (this.isTostadaOrTotopo()) {
      this.prefix = event.detail.value === 'bolsa' ? 'bolsa(s)' : '$';
    } else {
      this.prefix = event.detail.value === 'kg' ? 'kg' : '$';
    }
  }

  carrito(): Carrito {
    return this.utilsSvc.getFromLocalStorage('carrito');
  }

  increment() {
    if (this.quantity < this.producto.stock) {
      this.quantity=this.quantity+1;
      this.form.get('cantidad')?.setValue(this.quantity);
    } else {
      this.utilsSvc.presentToast({
        message: 'Cantidad excede el stock disponible',
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
    if (this.quantity > 1) {
      this.quantity=this.quantity-1;
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
    // For granel products with tipoCambio == '$', calculate how much quantity is bought for the given money
    const dinero = this.form.value.cantidad;
    const precio = this.buscarPrecioPorId(this.form.value.opcion) || 0;
    if (precio > 0) {
      this.total = parseFloat((dinero / precio).toFixed(2));
      return this.total;
    }
    return 0;
  }
  
  actualizarTotalKg() {
    // For kg or bolsa, calculate total price
    let total = this.form.value.cantidad * this.buscarPrecioPorId(this.form.value.opcion);
    return total;
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
        carrito[0].detalle_carrito[productIndex].uid_opcion = this.form.value.opcion;
        // Recalculate total
        carrito[0].total = carrito[0].detalle_carrito.reduce((acc: number, curr: any) => acc + curr.subtotal, 0);
        this.utilsSvc.setElementInLocalstorage('carrito', carrito);
      }
    }
  }

  

  submit() {
    if (this.form.valid) {
      const productId = this.producto.id;
      const cantidad = this.form.value.cantidad;
      const opcionId = this.form.value.opcion;
      const precio = this.buscarPrecioPorId(opcionId);

      let subtotal = 0;
      let cantidadFinal = cantidad;

      if (this.producto.granel) {
        if (this.form.value.tipoCambio === 'kg' || this.form.value.tipoCambio === 'bolsa') {
          subtotal = cantidad * precio;
        } else if (this.form.value.tipoCambio === '$') {
          cantidadFinal = this.actualizarTotal();
          subtotal = cantidad; // cantidad here is the money spent
        }
      } else {
        subtotal = cantidad * precio;
      }

      if (this.isProductInCart(productId)) {
        // Update product in cart and recalculate total
        this.updateProductInCart(productId, cantidadFinal, subtotal);
        this.utilsSvc.presentToast({
          message: 'Producto actualizado en el carrito',
          duration: 2500,
          color: 'primary',
          position: 'bottom',
          icon: 'cart-outline',
        });
      } else {
        // Add new product to cart
        this.form_detalle_carrito.get('cantidad')?.setValue(cantidadFinal);
        this.form_detalle_carrito.get('subtotal')?.setValue(subtotal);
        this.form_detalle_carrito.get('uid_producto')?.setValue(productId);
        this.form_detalle_carrito.value.uid_opcion = opcionId;
        const formDetalleCarrito = this.form_detalle_carrito.value;
        const formCarritoTotal = subtotal;

        this.cartService.addToCart(formCarritoTotal, formDetalleCarrito);
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
