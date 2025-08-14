import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CuponesPageRoutingModule } from './cupones-routing.module';

import { CuponesPage } from './cupones.page';
import { SharedModule } from "../../../../shared/shared.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CuponesPageRoutingModule,
    SharedModule
],
  declarations: [CuponesPage]
})
export class CuponesPageModule {}
