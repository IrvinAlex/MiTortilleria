export interface DetallePedido {
    id: string;               // Identificador único del detalle
    uid_producto: string;      // Identificador del producto
    cantidad: number;          // Cantidad de producto en el pedido
    subtotal: number;          // Subtotal del producto
  }
  