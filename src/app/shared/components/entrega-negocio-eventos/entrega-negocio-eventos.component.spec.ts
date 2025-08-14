import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EntregaNegocioEventosComponent } from './entrega-negocio-eventos.component';

describe('EntregaNegocioEventosComponent', () => {
  let component: EntregaNegocioEventosComponent;
  let fixture: ComponentFixture<EntregaNegocioEventosComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EntregaNegocioEventosComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EntregaNegocioEventosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
