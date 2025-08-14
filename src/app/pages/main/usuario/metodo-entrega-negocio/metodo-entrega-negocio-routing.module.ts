import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MetodoEntregaNegocioPage } from './metodo-entrega-negocio.page';

const routes: Routes = [
  {
    path: '',
    component: MetodoEntregaNegocioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MetodoEntregaNegocioPageRoutingModule {}
