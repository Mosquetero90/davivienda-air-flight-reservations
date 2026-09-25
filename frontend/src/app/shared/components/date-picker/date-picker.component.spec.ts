import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePickerComponent } from './date-picker.component';

describe('DatePickerComponent', () => {
  let component: DatePickerComponent;
  let fixture: ComponentFixture<DatePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DatePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
    expect(component.isOpen).toBeFalse();
  });

  it('debe alternar su estado al invocar toggleOpen', () => {
    const fakeEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;
    component.toggleOpen(fakeEvent);
    expect(component.isOpen).toBeTrue();
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();

    component.toggleOpen(fakeEvent);
    expect(component.isOpen).toBeFalse();
  });

  it('debe actualizar el valor y sincronizar vista con writeValue', () => {
    component.writeValue('2026-11-15');
    expect(component.value).toBe('2026-11-15');
    expect(component.viewYear).toBe(2026);
    expect(component.viewMonth).toBe(10); // Noviembre (0-indexed)
  });

  it('debe formatear la fecha correctamente en español', () => {
    component.writeValue('2026-09-25');
    expect(component.formattedDisplayDate).toContain('25');
    expect(component.formattedDisplayDate).toContain('Sep');
    expect(component.formattedDisplayDate).toContain('2026');
  });

  it('debe seleccionar preset Hoy y emitir onChange', () => {
    const changeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(changeSpy);

    component.selectPreset('today');
    expect(component.value).toBe(component.todayIso);
    expect(changeSpy).toHaveBeenCalledWith(component.todayIso);
    expect(component.isOpen).toBeFalse();
  });

  it('debe seleccionar preset Mañana y emitir onChange', () => {
    const changeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(changeSpy);

    component.selectPreset('tomorrow');
    expect(component.value).toBe(component.tomorrowIso);
    expect(changeSpy).toHaveBeenCalledWith(component.tomorrowIso);
  });

  it('debe limpiar la fecha al llamar a clearSelection', () => {
    const changeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(changeSpy);
    component.writeValue('2026-09-25');

    const fakeEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;
    component.clearSelection(fakeEvent);

    expect(component.value).toBe('');
    expect(changeSpy).toHaveBeenCalledWith('');
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
  });

  it('debe permitir navegar entre meses', () => {
    const currentMonth = component.viewMonth;
    component.nextMonth();
    expect(component.viewMonth).toBe((currentMonth + 1) % 12);

    component.prevMonth();
    expect(component.viewMonth).toBe(currentMonth);
  });

  it('debe marcar fechas pasadas con isPast = true', () => {
    const days = component.calendarDays;
    const today = new Date();
    const todayDayNumber = today.getDate();

    // Días anteriores al de hoy en el mes actual deben ser isPast
    const pastDays = days.filter((d) => d.dayNumber < todayDayNumber);
    pastDays.forEach((d) => {
      expect(d.isPast).toBeTrue();
    });
  });

  it('debe cerrarse al presionar la tecla Escape', () => {
    component.isOpen = true;
    component.onEscape();
    expect(component.isOpen).toBeFalse();
  });

  it('debe cerrarse al hacer clic fuera del componente', () => {
    component.isOpen = true;
    const outsideElement = document.createElement('div');
    const fakeMouseEvent = { target: outsideElement } as unknown as MouseEvent;

    component.onDocumentClick(fakeMouseEvent);
    expect(component.isOpen).toBeFalse();
  });
});
