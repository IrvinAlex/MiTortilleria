import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { InactivityService } from '../services/inactivity.service';
import { UtilsService } from '../services/utils.service';

@Injectable({
  providedIn: 'root'
})
export class SessionGuard implements CanActivate {
  private inactivitySvc = inject(InactivityService);
  private utilsSvc = inject(UtilsService);
  private router = inject(Router);

  canActivate(): boolean {
    const user = this.utilsSvc.getElementFromLocalstorage('user');
    
    // Si no hay usuario logueado, redirigir al login
    if (!user) {
      this.router.navigate(['/auth']);
      return false;
    }

    // Verificar si la sesión está activa
    if (!this.inactivitySvc.isSessionActive()) {
      // Sesión expirada, redirigir al login
      this.router.navigate(['/auth']);
      return false;
    }

    return true;
  }
}
