import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DireccionSuperadminPage } from './direccion-superadmin.page';

const routes: Routes = [
  {
    path: '',
    component: DireccionSuperadminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DireccionSuperadminPageRoutingModule {}
