import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MetodoEntregaNegocioPageRoutingModule } from './metodo-entrega-negocio-routing.module';

import { MetodoEntregaNegocioPage } from './metodo-entrega-negocio.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MetodoEntregaNegocioPageRoutingModule,
    SharedModule
  ],
  declarations: [MetodoEntregaNegocioPage]
})
export class MetodoEntregaNegocioPageModule {}
