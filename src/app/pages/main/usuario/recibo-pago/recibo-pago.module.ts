import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReciboPagoPageRoutingModule } from './recibo-pago-routing.module';

import { ReciboPagoPage } from './recibo-pago.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReciboPagoPageRoutingModule
  ],
  declarations: [ReciboPagoPage]
})
export class ReciboPagoPageModule {}
