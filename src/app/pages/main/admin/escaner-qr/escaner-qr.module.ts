import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EscanerQrPageRoutingModule } from './escaner-qr-routing.module';


import { EscanerQrPage } from './escaner-qr.page';
import { SharedModule } from 'src/app/shared/shared.module';
import { QrCodeModule } from 'ng-qrcode';
import { BarcodeScanningModalComponent } from './barcode-scanning-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EscanerQrPageRoutingModule,
    SharedModule,
    QrCodeModule
  ],
  declarations: [EscanerQrPage, BarcodeScanningModalComponent]
})
export class EscanerQrPageModule {}



