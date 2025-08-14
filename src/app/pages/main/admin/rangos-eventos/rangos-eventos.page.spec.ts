import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RangosEventosPage } from './rangos-eventos.page';

describe('RangosEventosPage', () => {
  let component: RangosEventosPage;
  let fixture: ComponentFixture<RangosEventosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RangosEventosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
