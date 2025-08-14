import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RangosEventosPage } from './rangos-eventos.page';

const routes: Routes = [
  {
    path: '',
    component: RangosEventosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RangosEventosPageRoutingModule {}
