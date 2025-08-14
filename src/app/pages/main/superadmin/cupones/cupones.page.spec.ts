import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CuponesPage } from './cupones.page';

describe('CuponesPage', () => {
  let component: CuponesPage;
  let fixture: ComponentFixture<CuponesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CuponesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
