import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NegocioPage } from './negocio.page';

const routes: Routes = [
  {
    path: '',
    component: NegocioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NegocioPageRoutingModule {}
