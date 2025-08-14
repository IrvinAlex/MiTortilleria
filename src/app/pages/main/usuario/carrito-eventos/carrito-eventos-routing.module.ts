import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CarritoEventosPage } from './carrito-eventos.page';

const routes: Routes = [
  {
    path: '',
    component: CarritoEventosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CarritoEventosPageRoutingModule {}
