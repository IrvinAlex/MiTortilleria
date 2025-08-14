import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MetodoEntregaEventosPageRoutingModule } from './metodo-entrega-eventos-routing.module';

import { MetodoEntregaEventosPage } from './metodo-entrega-eventos.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MetodoEntregaEventosPageRoutingModule,
    SharedModule
  ],
  declarations: [MetodoEntregaEventosPage]
})
export class MetodoEntregaEventosPageModule {}
