import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InformePageRoutingModule } from './informe-routing.module';

import { InformePage } from './informe.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InformePageRoutingModule,
    SharedModule
  ],
  declarations: [InformePage]
})
export class InformePageModule {}
