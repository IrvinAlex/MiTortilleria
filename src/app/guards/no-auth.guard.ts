import { Injectable, inject } from '@angular/core';
import { CanActivate, UrlTree,ActivatedRouteSnapshot,RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';
import { UtilsService } from '../services/utils.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})

export class NoAuthGuard implements CanActivate{

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  user(): User {
    return this.utilsSvc.getFromLocalStorage('user');
  }
  canActivate(
    route: ActivatedRouteSnapshot, 
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree{

      return new Promise((resolve) => {
        this.firebaseSvc.getAuth().onAuthStateChanged((auth) => {
          
          if(!auth)resolve(true);
          
          else {
            if (this.user()) {
              if (this.user().type_profile == 1) {
                this.utilsSvc.routerLink('/main/informe-superadmin');
              }
              else if (this.user().type_profile == 2) {
                this.utilsSvc.routerLink('/main/pedidos');
              }
              else if (this.user().type_profile == 3) {
                this.utilsSvc.routerLink('/main/productos');
              }
              resolve(false);
            }
            
          }
        });
      
        
      });
    }
}

