import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProductosNegocioPage } from './productos-negocio.page';

const routes: Routes = [
  {
    path: '',
    component: ProductosNegocioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProductosNegocioPageRoutingModule {}
