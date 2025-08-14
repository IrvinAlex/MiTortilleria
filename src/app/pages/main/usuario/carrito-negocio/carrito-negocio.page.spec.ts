import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarritoNegocioPage } from './carrito-negocio.page';

describe('CarritoNegocioPage', () => {
  let component: CarritoNegocioPage;
  let fixture: ComponentFixture<CarritoNegocioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CarritoNegocioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
