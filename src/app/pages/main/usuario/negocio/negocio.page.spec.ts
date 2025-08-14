import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NegocioPage } from './negocio.page';

describe('NegocioPage', () => {
  let component: NegocioPage;
  let fixture: ComponentFixture<NegocioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NegocioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
