import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CarritoNegocioPage } from './carrito-negocio.page';

const routes: Routes = [
  {
    path: '',
    component: CarritoNegocioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CarritoNegocioPageRoutingModule {}
