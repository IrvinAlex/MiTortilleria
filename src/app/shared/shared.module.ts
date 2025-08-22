import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from './components/header/header.component';
import { LogoComponent } from './components/logo/logo.component';
import { CustomInputComponent } from './components/custom-input/custom-input.component';
import { AddUpdateProductComponent } from './components/add-update-product/add-update-product.component';
import { AddUpdateUserComponent } from './components/add-update-user/add-update-user.component';
import { TermsComponent } from './components/terms/terms.component';
import { Terms2Component } from './components/terms/terms2.component';
import { AddProductCartComponent } from './components/add-product-cart/add-product-cart.component';
import { FiltrosModalComponent } from './components/filtros-modal/filtros-modal.component';
import { PedidoModalComponent } from './components/pedido-modal/pedido-modal.component';
import { AddUpdateInventarioComponent } from './components/add-update-inventario/add-update-inventario.component';
import { AddUpdateGestionComponent } from './components/add-update-gestion/add-update-gestion.component';
import { AddUpdateGastosComponent } from './components/add-update-gastos/add-update-gastos.component';
import { AddUpdateCuponComponent } from './components/add-update-cupon/add-update-cupon.component';
import { AddUpdateRangoComponent } from './components/add-update-rango/add-update-rango.component';
import { UpdateInventarioComponent } from './components/update-inventario/update-inventario.component';
import { AddUpdatePreciosComponent } from './components/add-update-precios/add-update-precios.component';
import { AddCloseCajaComponent } from './components/add-close-caja/add-close-caja.component';
import { AsignarProductoComponent } from './components/asignar-producto/asignar-producto.component';
import { AssignHoraryComponent } from './components/assign-horary/assign-horary.component';
import { UpdateProfileComponent } from './components/update-profile/update-profile.component';
import { AsignarEntregaComponent } from './components/asignar-entrega/asignar-entrega.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { EntregaDomicilioComponent } from './components/entrega-domicilio/entrega-domicilio.component';
import { DetallePedidoComponent } from './components/detalle-pedido/detalle-pedido.component';
import { BarcodeScanningModalComponent } from './components/detalle-pedido/barcode-scanning-modal.component';

// o para angularx-qrcode
import { QrCodeModule  } from 'ng-qrcode';
import { AddProductCartEventsComponent } from './components/add-product-cart-events/add-product-cart-events.component';
import { EntregaDomicilioEventosComponent } from './components/entrega-domicilio-eventos/entrega-domicilio-eventos.component';
import { EntregaNegocioEventosComponent } from './components/entrega-negocio-eventos/entrega-negocio-eventos.component';
import { CloseCajaComponent } from './components/close-caja/close-caja.component';
import { AddProductNegocioComponent } from './components/add-product-negocio/add-product-negocio.component';
import { EntregaNegocioNegocioComponent } from './components/entrega-negocio-negocio/entrega-negocio-negocio.component';
import { EntregaDomicilioNegocioComponent } from './components/entrega-domicilio-negocio/entrega-domicilio-negocio.component';
import { EntregaNegocioComponent } from './components/entrega-negocio/entrega-negocio.component';
import { ConfirmarDireccionComponent } from './components/confirmar-direccion/confirmar-direccion.component';
import { AddUpdateTarifaComponent } from './components/add-update-tarifa/add-update-tarifa.component';
import { NotificationModalComponent } from './components/notification-modal/notification-modal.component';


@NgModule({
  declarations: [HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    AddUpdateProductComponent,
    AddUpdateUserComponent,
    AddUpdateInventarioComponent,
    AddUpdateGestionComponent,
    AddUpdateGastosComponent,
    AddUpdateCuponComponent,
    AddUpdateRangoComponent,
    UpdateInventarioComponent,
    AddUpdatePreciosComponent,
    AddCloseCajaComponent,
    AsignarProductoComponent,
    TermsComponent,
    AddProductCartComponent,
    FiltrosModalComponent,
    PedidoModalComponent,
    AssignHoraryComponent,
    UpdateProfileComponent,
    AsignarEntregaComponent,
    CheckoutComponent,
    EntregaNegocioComponent,
    EntregaDomicilioComponent,
    DetallePedidoComponent,
    BarcodeScanningModalComponent,
    AddProductCartEventsComponent,
    EntregaDomicilioEventosComponent,
    EntregaNegocioEventosComponent,
    CloseCajaComponent,
    AddProductNegocioComponent,
    EntregaNegocioNegocioComponent,
    EntregaDomicilioNegocioComponent,
    ConfirmarDireccionComponent,
    Terms2Component,
    AddUpdateTarifaComponent,
    NotificationModalComponent
  ],

  exports:  [HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    ReactiveFormsModule,
    AddUpdateProductComponent,
    AddUpdateUserComponent,
    AddUpdateInventarioComponent,
    AddUpdateGestionComponent,
    AddUpdateGastosComponent,
    AddUpdateCuponComponent,
    AddUpdateRangoComponent,
    AddCloseCajaComponent,
    UpdateInventarioComponent,
    AddUpdatePreciosComponent,
    AsignarProductoComponent,
    TermsComponent,
    AddProductCartComponent,
    FiltrosModalComponent,
    PedidoModalComponent,
    AssignHoraryComponent,
    UpdateProfileComponent,
    AsignarEntregaComponent,
    CheckoutComponent,
    EntregaNegocioComponent,
    EntregaDomicilioComponent,
    DetallePedidoComponent,
    BarcodeScanningModalComponent,
    AddProductCartEventsComponent,
    EntregaDomicilioEventosComponent,
    EntregaNegocioEventosComponent,
    CloseCajaComponent,
    AddProductNegocioComponent,
    EntregaNegocioNegocioComponent,
    EntregaDomicilioNegocioComponent,
    ConfirmarDireccionComponent,
    Terms2Component,
    AddUpdateTarifaComponent,
    NotificationModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
    QrCodeModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule { }
