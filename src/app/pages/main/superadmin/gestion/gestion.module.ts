import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GestionPageRoutingModule } from './gestion-routing.module';

import { GestionPage } from './gestion.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GestionPageRoutingModule,
    SharedModule
  ],
  declarations: [GestionPage]
})
export class GestionPageModule {}
