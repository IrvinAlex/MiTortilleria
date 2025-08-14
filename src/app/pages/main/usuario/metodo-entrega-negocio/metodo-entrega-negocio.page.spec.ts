import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetodoEntregaNegocioPage } from './metodo-entrega-negocio.page';

describe('MetodoEntregaNegocioPage', () => {
  let component: MetodoEntregaNegocioPage;
  let fixture: ComponentFixture<MetodoEntregaNegocioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MetodoEntregaNegocioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
