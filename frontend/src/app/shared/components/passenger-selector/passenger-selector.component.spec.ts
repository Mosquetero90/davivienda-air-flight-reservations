import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PassengerSelectorComponent } from './passenger-selector.component';

describe('PassengerSelectorComponent', () => {
  let component: PassengerSelectorComponent;
  let fixture: ComponentFixture<PassengerSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassengerSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PassengerSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse con 1 adulto por defecto y popover cerrado', () => {
    expect(component).toBeTruthy();
    expect(component.totalCount).toBe(1);
    expect(component.breakdown.adults).toBe(1);
    expect(component.breakdown.children).toBe(0);
    expect(component.breakdown.infants).toBe(0);
    expect(component.isOpen).toBeFalse();
  });

  it('debe abrir y cerrar el popover al invocar toggleOpen', () => {
    const fakeEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;
    component.toggleOpen(fakeEvent);
    expect(component.isOpen).toBeTrue();
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();

    component.toggleOpen(fakeEvent);
    expect(component.isOpen).toBeFalse();
  });

  it('debe incrementar y decrementar adultos respetando el mínimo de 1', () => {
    const fakeEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;
    const changeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(changeSpy);

    // Intentar decrementar por debajo de 1
    component.changeAdults(-1, fakeEvent);
    expect(component.breakdown.adults).toBe(1);

    // Incrementar a 2
    component.changeAdults(1, fakeEvent);
    expect(component.breakdown.adults).toBe(2);
    expect(component.totalCount).toBe(2);
    expect(changeSpy).toHaveBeenCalledWith(2);

    // Decrementar a 1
    component.changeAdults(-1, fakeEvent);
    expect(component.breakdown.adults).toBe(1);
    expect(component.totalCount).toBe(1);
  });

  it('debe incrementar niños y bebés respetando el límite máximo', () => {
    const fakeEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;
    component.maxPassengers = 3;

    component.changeChildren(1, fakeEvent);
    expect(component.breakdown.children).toBe(1);
    expect(component.totalCount).toBe(2);

    component.changeInfants(1, fakeEvent);
    expect(component.breakdown.infants).toBe(1);
    expect(component.totalCount).toBe(3);

    // Intentar superar el máximo de 3
    component.changeChildren(1, fakeEvent);
    expect(component.breakdown.children).toBe(1);
    expect(component.totalCount).toBe(3);
  });

  it('debe sincronizar valor inicial con writeValue', () => {
    component.writeValue(4);
    expect(component.breakdown.adults).toBe(4);
    expect(component.totalCount).toBe(4);
  });

  it('debe cerrar el popover al invocar closeDropdown', () => {
    const fakeEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;
    component.isOpen = true;
    component.closeDropdown(fakeEvent);
    expect(component.isOpen).toBeFalse();
  });
});
