import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrecioViajePage } from './precio-viaje.page';

describe('PrecioViajePage', () => {
  let component: PrecioViajePage;
  let fixture: ComponentFixture<PrecioViajePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PrecioViajePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
