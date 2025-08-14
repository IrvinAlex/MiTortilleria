import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EntregasPageRoutingModule } from './entregas-routing.module';

import { EntregasPage } from './entregas.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EntregasPageRoutingModule,
    SharedModule
  ],
  declarations: [EntregasPage]
})
export class EntregasPageModule {}
