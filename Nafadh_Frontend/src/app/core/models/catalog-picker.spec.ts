import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CatalogPicker } from './catalog-picker';

beforeAll(() => {
  if (!getTestBed().platform) {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  }
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => TestBed.resetTestingModule());

function setup() {
  const fixture = TestBed.createComponent(CatalogPicker);
  fixture.componentRef.setInput('options', [
    { value: 'High', label: 'عالية', labelEn: 'High priority' },
    { value: 'Critical', label: 'عالية', labelEn: 'Critical priority' },
  ]);
  fixture.componentRef.setInput('value', 'High');
  fixture.detectChanges();
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  return { fixture, picker: fixture.componentInstance, input };
}

describe('CatalogPicker presentation compatibility', () => {
  it('keeps the page control class and displays the original stable key for duplicate labels', () => {
    const { fixture, input } = setup();
    fixture.nativeElement.classList.add('form-control');
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('form-control')).toBe(true);
    expect(input.value).toBe('عالية (High)');
  });

  it.each(['عالية', 'critical'])('searches %s without emitting text as a value', query => {
    const { fixture, picker, input } = setup();
    const emit = vi.spyOn(picker.valueChange, 'emit');
    input.value = query;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role=option]').length).toBe(query === 'critical' ? 1 : 2);
    expect(emit).not.toHaveBeenCalled();
  });

  it('selects the second duplicate label with arrows and Enter using its key', () => {
    const { fixture, picker, input } = setup();
    const emit = vi.spyOn(picker.valueChange, 'emit');
    input.dispatchEvent(new Event('focus'));
    for (const key of ['ArrowDown', 'ArrowDown', 'Enter']) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    }
    expect(emit).toHaveBeenCalledExactlyOnceWith('Critical');
    expect(picker.open).toBe(false);
  });

  it('keeps historical display without adding the inactive value to new choices', () => {
    const { fixture, picker, input } = setup();
    fixture.componentRef.setInput('value', 'Retired');
    fixture.componentRef.setInput('fallbackLabel', 'قيمة تاريخية');
    fixture.detectChanges();
    expect(input.value).toBe('قيمة تاريخية');
    picker.begin();
    expect(picker.results.map(row => row.value)).toEqual(['High', 'Critical']);
  });

  it('does not select a disabled control and exposes its disabled presentation', () => {
    const { fixture, picker, input } = setup();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const emit = vi.spyOn(picker.valueChange, 'emit');
    picker.choose(picker.options[0]);
    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.classList.contains('catalog-disabled')).toBe(true);
    expect(emit).not.toHaveBeenCalled();
  });

  it('supports the existing external arrow without rendering a second arrow', () => {
    const { fixture } = setup();
    fixture.componentRef.setInput('showArrow', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.arrow')).toBeNull();
  });

  it('preserves label-for association and keyboard dismissal', () => {
    const { fixture, picker, input } = setup();
    fixture.componentRef.setInput('inputId', 'taskPriority');
    fixture.detectChanges();
    expect(input.id).toBe('taskPriority');
    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(picker.open).toBe(false);
  });

  it('updates a renamed label without changing the selected key', () => {
    const { fixture, picker, input } = setup();
    fixture.componentRef.setInput('options', [{ value: 'High', label: 'اسم جديد', labelEn: 'Renamed' }]);
    fixture.detectChanges();
    expect(input.value).toBe('اسم جديد');
    expect(picker.value).toBe('High');
  });
});
