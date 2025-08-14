import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EntregaNegocioNegocioComponent } from './entrega-negocio-negocio.component';

describe('EntregaNegocioNegocioComponent', () => {
  let component: EntregaNegocioNegocioComponent;
  let fixture: ComponentFixture<EntregaNegocioNegocioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EntregaNegocioNegocioComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EntregaNegocioNegocioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
