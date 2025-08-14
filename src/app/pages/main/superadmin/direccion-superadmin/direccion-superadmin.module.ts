import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DireccionSuperadminPageRoutingModule } from './direccion-superadmin-routing.module';

import { DireccionSuperadminPage } from './direccion-superadmin.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DireccionSuperadminPageRoutingModule,
    SharedModule
  ],
  declarations: [DireccionSuperadminPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DireccionSuperadminPageModule {}
