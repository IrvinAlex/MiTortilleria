import { Component, inject, Input, OnInit } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent  implements OnInit {

  @Input() title!: String;
  @Input()  backButton!: string;
  @Input()  isModal!: boolean;
  @Input()  showMenu!: boolean;
  @Input() buttonsMenu!: string;
  @Input() buttonCart!: string;
  @Input() buttonCartEvents!: string;
  @Input() buttonCartNegocio!: string;
  @Input() showLogo: boolean = true;
  @Input() showNombre: boolean = true;
  @Input() backButtonShow: boolean = false;
  @Input() cartCount: number = 0;
  
  constructor(private router: Router){this.backButton = '/inicio';}

  utilsSvc = inject(UtilsService);

  ngOnInit() {}

  dismissModal(){
    this.utilsSvc.dismissModal();
  }
  
  signin(){
    window.location.href='/#/auth';
  }

  signup() {
    this.router.navigate(['/auth/sign-up']);  // Navega sin recargar la página
  }
  
  cart(){
    this.utilsSvc.routerLink('/main/carrito');
  }
  
  cartEvents(){
    this.utilsSvc.routerLink('/main/carrito-eventos');
  }

  cartNegocio(){
    this.utilsSvc.routerLink('/main/carrito-negocio');
  }
}
