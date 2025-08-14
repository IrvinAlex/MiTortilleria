import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-filtros-modal',
  templateUrl: './filtros-modal.component.html',
  styleUrls: ['./filtros-modal.component.scss']
})
export class FiltrosModalComponent {
  estatusOptions = ['Pedido confirmado', 'En preparación', 'En espera de recolección', 'Entregado', 'Cancelado'];
  selectedStatus: { [key: string]: boolean } = {};
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  precioMin: number | null = null;
  precioMax: number | null = null;
  mostrarEstatus: boolean = true;
  @Input() estatus: boolean; // Recibe el pedido actual

  constructor(private modalCtrl: ModalController) {}

  closeModal() {
    this.modalCtrl.dismiss();
  }

  toggleStatusFilter(status: string) {
    this.selectedStatus[status] = !this.selectedStatus[status];
  }

  applyFilter() {
    const selectedStatusArray = Object.keys(this.selectedStatus).filter(status => this.selectedStatus[status]);
    const filterParams = {
      selectedStatus: selectedStatusArray,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      precioMin: this.precioMin,
      precioMax: this.precioMax
    };

    this.modalCtrl.dismiss(filterParams);
  }

  clearFilters() {
    this.selectedStatus = {};
    this.fechaInicio = null;
    this.fechaFin = null;
    this.precioMin = null;
    this.precioMax = null;
  }

  getStatusIcon(estatus: string): string {
    switch (estatus.toLowerCase()) {
      case 'pedido confirmado':
        return 'bag-check-outline';
      case 'en preparación':
        return 'refresh-circle-outline';
      case 'en espera de recolección':
          return 'time-outline';
      case 'entregado':
        return 'checkmark-done-outline';
      case 'cancelado':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline'; // Ícono por defecto
    }
  }
}
