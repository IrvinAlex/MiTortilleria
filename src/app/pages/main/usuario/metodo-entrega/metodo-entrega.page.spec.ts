import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetodoEntregaPage } from './metodo-entrega.page';

describe('MetodoEntregaPage', () => {
  let component: MetodoEntregaPage;
  let fixture: ComponentFixture<MetodoEntregaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MetodoEntregaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
