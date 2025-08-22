import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MainPage } from './main.page';

const routes: Routes = [
  {
    path: '',
    component: MainPage,
    children:[
      {
        path: 'home',
        loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
      },
      {
        path: 'profile-admin',
        loadChildren: () => import('./admin/profile/profile.module').then( m => m.ProfilePageModule)
      },
      {
        path: 'sign-up',
        loadChildren: () => import('./admin/sign-up/sign-up.module').then( m => m.SignUpPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
      },
      {
        path: 'direccion',
        loadChildren: () => import('./direccion/direccion.module').then( m => m.DireccionPageModule)
      },
      {
        path: 'pedidos',
        loadChildren: () => import('./admin/pedidos/pedidos.module').then( m => m.PedidosPageModule)
      },
      {
        path: 'informe-superadmin',
        loadChildren: () => import('./superadmin/informe/informe.module').then( m => m.InformePageModule)
      },
      {
        path: 'inventario-superadmin',
        loadChildren: () => import('./superadmin/inventario/inventario.module').then( m => m.InventarioPageModule)
      },
      {
        path: 'administracion-usuarios-superadmin',
        loadChildren: () => import('./superadmin/administracion/administracion.module').then( m => m.AdministracionPageModule)
      },
      {
        path: 'gestion-superadmin',
        loadChildren: () => import('./superadmin/gestion/gestion.module').then( m => m.GestionPageModule)
      },
      {
        path: 'gastos-superadmin',
        loadChildren: () => import('./superadmin/gastos/gastos.module').then( m => m.GastosPageModule)
      },
      {
        path: 'entregas',
        loadChildren: () => import('./admin/entregas/entregas.module').then( m => m.EntregasPageModule)
      },
      {
        path: 'inventario',
        loadChildren: () => import('./superadmin/gestion/gestion.module').then( m => m.GestionPageModule)
      },
      {
        path: 'horario',
        loadChildren: () => import('./admin/horario/horario.module').then( m => m.HorarioPageModule)
      },
      {
        path: 'productos',
        loadChildren: () => import('./usuario/productos/productos.module').then( m => m.ProductosPageModule)
      },
      {
        path: 'eventos',
        loadChildren: () => import('./usuario/eventos/eventos.module').then( m => m.EventosPageModule)
      },
      {
        path: 'rangos-eventos',
        loadChildren: () => import('./admin/rangos-eventos/rangos-eventos.module').then( m => m.RangosEventosPageModule)
      },
      {
        path: 'historial-pedidos',
        loadChildren: () => import('./usuario/historial-pedidos/historial-pedidos.module').then( m => m.HistorialPedidosPageModule)
      },
      {
        path: 'escaner-qr',
        loadChildren: () => import('./admin/escaner-qr/escaner-qr.module').then( m => m.EscanerQrPageModule)
      },
      {
        path: 'carrito',
        loadChildren: () => import('./usuario/carrito/carrito.module').then( m => m.CarritoPageModule)
      },
      {
        path: 'recibo-pago',
        loadChildren: () => import('./usuario/recibo-pago/recibo-pago.module').then( m => m.ReciboPagoPageModule)
      },
      {
        path: 'metodo-entrega',
        loadChildren: () => import('./usuario/metodo-entrega/metodo-entrega.module').then( m => m.MetodoEntregaPageModule)
      },
      {
        path: 'confirmacion-pago',
        loadChildren: () => import('./usuario/confirmacion-pago/confirmacion-pago.module').then( m => m.ConfirmacionPagoPageModule)
      },
      {
        path: 'cupones-superadmin',
        loadChildren: () => import('./superadmin/cupones/cupones.module').then( m => m.CuponesPageModule)
      },
      {
        path: 'privacidad',
        loadChildren: () => import('./privacidad/privacidad.module').then( m => m.PrivacidadPageModule)
      },
      {
        path: 'corte-caja-admin',
        loadChildren: () => import('./admin/corte-caja/corte-caja.module').then( m => m.CorteCajaPageModule)
      },
      {
        path: 'corte-caja-superadmin',
        loadChildren: () => import('./superadmin/corte-caja/corte-caja.module').then( m => m.CorteCajaPageModule)
      },
      {
        path: 'carrito-eventos',
        loadChildren: () => import('./usuario/carrito-eventos/carrito-eventos.module').then( m => m.CarritoEventosPageModule)
      },
      {
        path: 'metodo-entrega-eventos',
        loadChildren: () => import('./usuario/metodo-entrega-eventos/metodo-entrega-eventos.module').then( m => m.MetodoEntregaEventosPageModule)
      },
      {
        path: 'direccion-superadmin',
        loadChildren: () => import('./superadmin/direccion-superadmin/direccion-superadmin.module').then( m => m.DireccionSuperadminPageModule)
      },
      {
        path: 'productos-negocio',
        loadChildren: () => import('./admin/productos-negocio/productos-negocio.module').then( m => m.ProductosNegocioPageModule)
      },
      {
        path: 'productos-negocio',
        loadChildren: () => import('./admin/productos-negocio/productos-negocio.module').then( m => m.ProductosNegocioPageModule)
      },
      {
        path: 'carrito-negocio',
        loadChildren: () => import('./usuario/carrito-negocio/carrito-negocio.module').then( m => m.CarritoNegocioPageModule)
      },
      {
        path: 'negocio',
        loadChildren: () => import('./usuario/negocio/negocio.module').then( m => m.NegocioPageModule)
      },
      {
        path: 'metodo-entrega-negocio',
        loadChildren: () => import('./usuario/metodo-entrega-negocio/metodo-entrega-negocio.module').then( m => m.MetodoEntregaNegocioPageModule)
      },
      {
        path: 'precio-viaje',
        loadChildren: () => import('./admin/precio-viaje/precio-viaje.module').then( m => m.PrecioViajePageModule)
      },
    
    ]
  },
  

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainPageRoutingModule {}
