import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReciboPagoPage } from './recibo-pago.page';

describe('ReciboPagoPage', () => {
  let component: ReciboPagoPage;
  let fixture: ComponentFixture<ReciboPagoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReciboPagoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
