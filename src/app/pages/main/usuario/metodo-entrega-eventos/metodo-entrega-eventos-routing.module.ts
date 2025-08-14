import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MetodoEntregaEventosPage } from './metodo-entrega-eventos.page';

const routes: Routes = [
  {
    path: '',
    component: MetodoEntregaEventosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MetodoEntregaEventosPageRoutingModule {}
