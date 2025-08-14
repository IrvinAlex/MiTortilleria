import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EntregaDomicilioEventosComponent } from './entrega-domicilio-eventos.component';

describe('EntregaDomicilioEventosComponent', () => {
  let component: EntregaDomicilioEventosComponent;
  let fixture: ComponentFixture<EntregaDomicilioEventosComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EntregaDomicilioEventosComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EntregaDomicilioEventosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
