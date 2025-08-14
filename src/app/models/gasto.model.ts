import { Timestamp } from '@firebase/firestore';
export interface Gasto{
    name: string,
    pago: number,
    fecha: Timestamp | Date,
    uid: string
}