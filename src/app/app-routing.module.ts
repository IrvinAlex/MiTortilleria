import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { NoAuthGuard } from './guards/no-auth.guard';

const routes: Routes = [
 
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.module').then( m => m.AuthPageModule),canActivate:[NoAuthGuard]
  },
  {
    path: 'inicio',
    loadChildren: () => import('./pages/inicio/inicio.module').then( m => m.InicioPageModule)
  },
  {
    path: 'main',
    loadChildren: () => import('./pages/main/main.module').then( m => m.MainPageModule),canActivate:[AuthGuard]
  },
  {
    path: 'informe',
    loadChildren: () => import('./pages/main/superadmin/informe/informe.module').then( m => m.InformePageModule)
  },
  {
    path: 'privacidad',
    loadChildren: () => import('./pages/privacidad/privacidad.module').then( m => m.PrivacidadPageModule)
  },
  {
    path: 'admin/pedidos',
    loadChildren: () =>
      import('./pages/main/admin/pedidos/pedidos.module').then(m => m.PedidosPageModule)
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      preloadingStrategy: PreloadAllModules,
      useHash: true, // Important: use hash routing to avoid server 404 on deep links
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
