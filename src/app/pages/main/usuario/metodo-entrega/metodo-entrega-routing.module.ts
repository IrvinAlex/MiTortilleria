import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MetodoEntregaPage } from './metodo-entrega.page';

const routes: Routes = [
  {
    path: '',
    component: MetodoEntregaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MetodoEntregaPageRoutingModule {}
