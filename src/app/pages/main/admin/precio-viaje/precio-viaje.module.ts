import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PrecioViajePageRoutingModule } from './precio-viaje-routing.module';

import { PrecioViajePage } from './precio-viaje.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PrecioViajePageRoutingModule,
    SharedModule
  ],
  declarations: [PrecioViajePage]
})
export class PrecioViajePageModule {}
