import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConfirmacionPagoPageRoutingModule } from './confirmacion-pago-routing.module';

import { ConfirmacionPagoPage } from './confirmacion-pago.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConfirmacionPagoPageRoutingModule
  ],
  declarations: [ConfirmacionPagoPage]
})
export class ConfirmacionPagoPageModule {}
