import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CorteCajaPageRoutingModule } from './corte-caja-routing.module';

import { CorteCajaPage } from './corte-caja.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CorteCajaPageRoutingModule
  ],
  declarations: [CorteCajaPage]
})
export class CorteCajaPageModule {}
