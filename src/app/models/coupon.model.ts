export interface Coupon {
  id?: string;
  uid: string;                 // UID del usuario dueño del cupón
  codigo: string;              // Ej: "MAYY CNL"
  descripcion: string;         // Texto visible al usuario
  porcentaje: number;          // % de descuento (ej. 25)
  numero_compras: number;      // Compras mínimas acumuladas para poder usarlo
  minimo_compra: number;       // Monto mínimo de compra para usarlo
  expira: any;                 // Date | Timestamp
  usado?: boolean;             // Se marca true cuando se aplique en checkout
  creado?: any;                // Timestamp
}
