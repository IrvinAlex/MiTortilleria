import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CorteCajaPage } from './corte-caja.page';

describe('CorteCajaPage', () => {
  let component: CorteCajaPage;
  let fixture: ComponentFixture<CorteCajaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CorteCajaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
