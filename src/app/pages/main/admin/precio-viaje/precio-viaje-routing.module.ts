import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PrecioViajePage } from './precio-viaje.page';

const routes: Routes = [
  {
    path: '',
    component: PrecioViajePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrecioViajePageRoutingModule {}
