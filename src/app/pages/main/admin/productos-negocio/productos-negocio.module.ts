import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProductosNegocioPageRoutingModule } from './productos-negocio-routing.module';

import { ProductosNegocioPage } from './productos-negocio.page';
import { SharedModule } from "../../../../shared/shared.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProductosNegocioPageRoutingModule,
    SharedModule
],
  declarations: [ProductosNegocioPage]
})
export class ProductosNegocioPageModule {}
