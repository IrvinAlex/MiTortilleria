import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PrivacidadPageRoutingModule } from './privacidad-routing.module';

import { PrivacidadPage } from './privacidad.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PrivacidadPageRoutingModule,
    SharedModule
  ],
  declarations: [PrivacidadPage]
})
export class PrivacidadPageModule {}
