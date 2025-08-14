import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InformePage } from './informe.page';

describe('InformePage', () => {
  let component: InformePage;
  let fixture: ComponentFixture<InformePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InformePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
