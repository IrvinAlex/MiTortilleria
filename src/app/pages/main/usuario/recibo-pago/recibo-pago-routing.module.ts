import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ReciboPagoPage } from './recibo-pago.page';

const routes: Routes = [
  {
    path: '',
    component: ReciboPagoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReciboPagoPageRoutingModule {}
