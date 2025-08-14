import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CarritoEventosPageRoutingModule } from './carrito-eventos-routing.module';

import { CarritoEventosPage } from './carrito-eventos.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CarritoEventosPageRoutingModule,
    SharedModule
  ],
  declarations: [CarritoEventosPage]
})
export class CarritoEventosPageModule {}
