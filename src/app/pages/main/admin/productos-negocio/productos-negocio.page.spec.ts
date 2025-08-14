import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductosNegocioPage } from './productos-negocio.page';

describe('ProductosNegocioPage', () => {
  let component: ProductosNegocioPage;
  let fixture: ComponentFixture<ProductosNegocioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductosNegocioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
