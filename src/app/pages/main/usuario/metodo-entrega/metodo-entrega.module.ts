import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MetodoEntregaPageRoutingModule } from './metodo-entrega-routing.module';

import { MetodoEntregaPage } from './metodo-entrega.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MetodoEntregaPageRoutingModule,
    SharedModule
  ],
  declarations: [MetodoEntregaPage]
})
export class MetodoEntregaPageModule {}
