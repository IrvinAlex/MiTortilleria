import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetodoEntregaEventosPage } from './metodo-entrega-eventos.page';

describe('MetodoEntregaEventosPage', () => {
  let component: MetodoEntregaEventosPage;
  let fixture: ComponentFixture<MetodoEntregaEventosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MetodoEntregaEventosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
