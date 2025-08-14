import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EntregaDomicilioNegocioComponent } from './entrega-domicilio-negocio.component';

describe('EntregaDomicilioNegocioComponent', () => {
  let component: EntregaDomicilioNegocioComponent;
  let fixture: ComponentFixture<EntregaDomicilioNegocioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EntregaDomicilioNegocioComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EntregaDomicilioNegocioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
