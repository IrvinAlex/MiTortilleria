import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarritoEventosPage } from './carrito-eventos.page';

describe('CarritoEventosPage', () => {
  let component: CarritoEventosPage;
  let fixture: ComponentFixture<CarritoEventosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CarritoEventosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
