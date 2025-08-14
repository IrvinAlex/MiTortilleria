import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CorteCajaPage } from './corte-caja.page';

const routes: Routes = [
  {
    path: '',
    component: CorteCajaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CorteCajaPageRoutingModule {}
