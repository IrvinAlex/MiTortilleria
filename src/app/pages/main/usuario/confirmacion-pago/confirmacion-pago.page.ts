import { Component, inject, OnInit } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-confirmacion-pago',
  templateUrl: './confirmacion-pago.page.html',
  styleUrls: ['./confirmacion-pago.page.scss'],
})
export class ConfirmacionPagoPage implements OnInit {

  utilsSvc = inject(UtilsService);
  constructor() { }

  ngOnInit() {
    // Redirige después de 3 segundos
    setTimeout(() => {
      this.utilsSvc.routerLink('/main/recibo-pago');
    }, 3000);
  }

}
