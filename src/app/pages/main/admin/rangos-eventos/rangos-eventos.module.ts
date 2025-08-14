import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RangosEventosPageRoutingModule } from './rangos-eventos-routing.module';

import { RangosEventosPage } from './rangos-eventos.page';
import { SharedModule } from "../../../../shared/shared.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RangosEventosPageRoutingModule,
    SharedModule
],
  declarations: [RangosEventosPage]
})
export class RangosEventosPageModule {}
