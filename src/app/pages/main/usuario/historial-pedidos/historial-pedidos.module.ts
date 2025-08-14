import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HistorialPedidosPageRoutingModule } from './historial-pedidos-routing.module';

import { HistorialPedidosPage } from './historial-pedidos.page';
import { SharedModule } from "../../../../shared/shared.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HistorialPedidosPageRoutingModule,
    SharedModule
],
  declarations: [HistorialPedidosPage]
})
export class HistorialPedidosPageModule {}
