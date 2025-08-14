import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EscanerQrPage } from './escaner-qr.page';

const routes: Routes = [
  {
    path: '',
    component: EscanerQrPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EscanerQrPageRoutingModule {}
