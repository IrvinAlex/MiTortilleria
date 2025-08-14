import { Injectable, inject } from '@angular/core';
import { where, serverTimestamp } from 'firebase/firestore';
import { Observable, map } from 'rxjs';
import { Coupon } from '../models/coupon.model';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class CouponService {
  private firebaseSvc = inject(FirebaseService);

  // Enviar/crear cupón para un usuario
  async sendCoupon(coupon: Omit<Coupon, 'id' | 'usado' | 'creado'>) {
    return this.firebaseSvc.addDocument('cupones', {
      ...coupon,
      usado: false,
      creado: serverTimestamp(),
    });
  }

  // Listar cupones activos (sin índice compuesto)
  getActiveCoupons(uid: string): Observable<Coupon[]> {
    const now = new Date();
    return this.firebaseSvc
      .getCollectionData('cupones', [where('uid', '==', uid)]) // solo por uid, evita índice compuesto
      .pipe(
        map((items: any[]) => {
          const toDate = (v: any) => (v?.toDate ? v.toDate() : new Date(v));
          return items
            .filter(c => c && c.usado === false && toDate(c.expira) >= now)
            .sort((a, b) => toDate(a.expira).getTime() - toDate(b.expira).getTime());
        })
      ) as Observable<Coupon[]>;
  }

  // Marcar cupón como usado (p.ej. al aplicar en checkout)
  async markUsed(couponId: string) {
    return this.firebaseSvc.updateDocumet(`cupones/${couponId}`, { usado: true });
  }
}