export interface Venta {
    id: string;               // Identificador único del pedido
    uid_cliente: string;       // Identificador único del cliente
    estatus: string;           // Estado del pedido (e.g., "pendiente", "en preparación", "entregado")
    fecha: string;             // Fecha del pedido
    pago_confirmado: boolean;  // Indica si el pago está confirmado
    tipo_pago: string;         // Tipo de pago (e.g., "efectivo", "tarjeta")
    total: number;             // Total del pedido
  }
  