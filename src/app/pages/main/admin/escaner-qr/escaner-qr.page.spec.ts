import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EscanerQrPage } from './escaner-qr.page';

describe('EscanerQrPage', () => {
  let component: EscanerQrPage;
  let fixture: ComponentFixture<EscanerQrPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EscanerQrPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
