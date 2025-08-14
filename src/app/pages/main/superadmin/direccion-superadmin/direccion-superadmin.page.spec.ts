import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DireccionSuperadminPage } from './direccion-superadmin.page';

describe('DireccionSuperadminPage', () => {
  let component: DireccionSuperadminPage;
  let fixture: ComponentFixture<DireccionSuperadminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DireccionSuperadminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
