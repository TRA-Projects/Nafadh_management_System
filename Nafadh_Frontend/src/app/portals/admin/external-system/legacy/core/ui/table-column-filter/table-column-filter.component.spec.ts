import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableColumnFilterComponent } from './table-column-filter.component';

@Component({
  standalone: true,
  imports: [TableColumnFilterComponent],
  template: `
    <app-table-column-filter
      [type]="type"
      [value]="value"
      [active]="active"
      [options]="options"
      [columnLabel]="columnLabel"
      [placeholder]="placeholder"
      (apply)="onApply($event)"
      (clear)="onClear()"
    />
  `,
})
class HostComponent {
  type: 'text' | 'select' = 'text';
  value = '';
  active = false;
  options: { value: string; label: string }[] = [];
  columnLabel = 'Title';
  placeholder = 'Search';
  applied: string | null = null;
  cleared = false;

  onApply(value: string): void {
    this.applied = value;
    this.value = value;
    this.active = !!value;
  }

  onClear(): void {
    this.cleared = true;
    this.value = '';
    this.active = false;
  }
}

@Component({
  standalone: true,
  imports: [TableColumnFilterComponent],
  template: `
    <app-table-column-filter columnLabel="Title" placeholder="Search" />
    <app-table-column-filter columnLabel="Status" type="select" [options]="statusOptions" />
  `,
})
class DualHostComponent {
  statusOptions = [
    { value: '', label: 'All' },
    { value: 'Draft', label: 'Draft' },
  ];
}

@Component({
  standalone: true,
  imports: [TableColumnFilterComponent],
  template: `
    <select data-top-status [value]="status" (change)="status = $any($event.target).value">
      @for (option of statusOptions; track option.value) {
        <option [value]="option.value">{{ option.label }}</option>
      }
    </select>
    <app-table-column-filter
      type="select"
      columnLabel="Status"
      [value]="status"
      [active]="!!status"
      [options]="statusOptions"
      (apply)="status = $event"
      (clear)="status = ''"
    />
  `,
})
class SharedStatusHostComponent {
  status = '';
  statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'PendingScheduling', label: 'Pending scheduling' },
    { value: 'Active', label: 'Pending interviews' },
  ];
}

describe('TableColumnFilterComponent single-open', () => {
  let fixture: ComponentFixture<DualHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DualHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DualHostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  it('closes the previously opened popover when another filter is opened', () => {
    const triggers = fixture.nativeElement.querySelectorAll(
      '[data-table-column-filter-trigger]'
    ) as NodeListOf<HTMLButtonElement>;
    expect(triggers.length).toBe(2);

    triggers[0].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[data-table-column-filter-panel]').length).toBe(1);

    triggers[1].click();
    fixture.detectChanges();
    const panels = fixture.nativeElement.querySelectorAll('[data-table-column-filter-panel]');
    expect(panels.length).toBe(1);
    expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
  });
});

describe('TableColumnFilterComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let previousDir: string;

  beforeEach(async () => {
    previousDir = document.documentElement.dir;
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.dir = previousDir;
    fixture.nativeElement.remove();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[data-table-column-filter-trigger]');
  }

  function panel(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-table-column-filter-panel]');
  }

  function clearButton(): HTMLButtonElement | null {
    return panel()?.querySelector('[data-table-column-filter-clear]') ?? null;
  }

  async function openAndSettle(): Promise<void> {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  it('stays closed by default and exposes an accessible filter trigger', () => {
    expect(trigger().getAttribute('aria-label')).toBe('Filter: Title');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-pressed')).toBe('false');
    expect(trigger().tagName).toBe('BUTTON');
    expect(panel()).toBeNull();
  });

  it('opens a text filter and applies the draft value', () => {
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(panel()).toBeTruthy();

    const input = panel()!.querySelector('input') as HTMLInputElement;
    input.value = '  IELTS  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const applyBtn = Array.from(panel()!.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('Apply')
    );
    expect(applyBtn).toBeTruthy();
    applyBtn!.click();
    fixture.detectChanges();

    expect(host.applied).toBe('IELTS');
    expect(panel()).toBeNull();
  });

  it('emits clear for an empty text apply and for the Clear button', () => {
    trigger().click();
    fixture.detectChanges();
    const applyBtn = Array.from(panel()!.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('Apply')
    );
    applyBtn!.click();
    fixture.detectChanges();
    expect(host.cleared).toBeTrue();
    expect(host.applied).toBeNull();

    host.cleared = false;
    trigger().click();
    fixture.detectChanges();
    const clearBtn = clearButton();
    expect(clearBtn).toBeTruthy();
    expect((clearBtn!.textContent ?? '').trim()).toBe('Clear');
    expect(clearBtn!.querySelector('svg')).toBeNull();
    expect(clearBtn!.classList.contains('text-danger')).toBeTrue();
    clearBtn!.click();
    fixture.detectChanges();
    expect(host.cleared).toBeTrue();
    expect(panel()).toBeNull();
  });

  it('renders select options and applies immediately on change', () => {
    host.type = 'select';
    host.options = [
      { value: '', label: 'All statuses' },
      { value: 'Scheduled', label: 'Pending assessment' },
      { value: 'Completed', label: 'Completed' },
    ];
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();
    const select = panel()!.querySelector('select') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(select.options[1].textContent?.trim()).toBe('Pending assessment');

    select.value = 'Completed';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(host.applied).toBe('Completed');
    expect(panel()).toBeNull();
  });

  it('keeps the select showing the applied value after Apply and reopen', async () => {
    host.type = 'select';
    host.options = [
      { value: '', label: 'All statuses' },
      { value: 'PendingScheduling', label: 'Pending scheduling' },
      { value: 'Active', label: 'Pending interviews' },
    ];
    fixture.detectChanges();

    await openAndSettle();
    const select = panel()!.querySelector('select') as HTMLSelectElement;
    select.value = 'PendingScheduling';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(host.value).toBe('PendingScheduling');
    expect(panel()).toBeNull();

    await openAndSettle();
    expect((panel()!.querySelector('select') as HTMLSelectElement).value).toBe('PendingScheduling');
  });

  it('keeps the text input showing the applied value after Apply and reopen', async () => {
    await openAndSettle();
    const input = panel()!.querySelector('input') as HTMLInputElement;
    input.value = 'test';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    const applyBtn = Array.from(panel()!.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('Apply')
    );
    applyBtn!.click();
    fixture.detectChanges();

    expect(host.value).toBe('test');
    expect(panel()).toBeNull();

    await openAndSettle();
    expect((panel()!.querySelector('input') as HTMLInputElement).value).toBe('test');
  });

  it('resets to the default option after Clear and reopen', async () => {
    host.type = 'select';
    host.options = [
      { value: '', label: 'All statuses' },
      { value: 'PendingScheduling', label: 'Pending scheduling' },
    ];
    host.value = 'PendingScheduling';
    host.active = true;
    fixture.detectChanges();

    await openAndSettle();
    expect((panel()!.querySelector('select') as HTMLSelectElement).value).toBe('PendingScheduling');
    clearButton()!.click();
    fixture.detectChanges();

    expect(host.value).toBe('');
    expect(panel()).toBeNull();

    await openAndSettle();
    expect((panel()!.querySelector('select') as HTMLSelectElement).value).toBe('');
  });

  it('shows a parent-applied value the next time the popover opens', async () => {
    host.type = 'select';
    host.options = [
      { value: '', label: 'All statuses' },
      { value: 'Completed', label: 'Completed' },
    ];
    fixture.detectChanges();

    host.value = 'Completed';
    host.active = true;
    fixture.detectChanges();

    await openAndSettle();
    expect((panel()!.querySelector('select') as HTMLSelectElement).value).toBe('Completed');
  });

  it('renders a danger text Clear action for text and select filters', () => {
    trigger().click();
    fixture.detectChanges();
    const textClear = clearButton()!;
    expect((textClear.textContent ?? '').trim()).toBe('Clear');
    expect(textClear.classList.contains('text-danger')).toBeTrue();
    expect(textClear.querySelector('svg')).toBeNull();
    expect(getComputedStyle(textClear).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    host.type = 'select';
    host.options = [{ value: '', label: 'All' }];
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(panel()!.querySelector('button.btn-primary')).toBeNull();
    expect((clearButton()?.textContent ?? '').trim()).toBe('Clear');
  });

  it('shows an active state on the trigger', () => {
    host.active = true;
    host.value = 'IELTS';
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-pressed')).toBe('true');
    expect(trigger().getAttribute('title')).toBe('IELTS');
    expect(fixture.nativeElement.querySelector('.table-column-filter--active')).toBeTruthy();
    expect(trigger().querySelector('.table-column-filter__dot')).toBeTruthy();
    const icon = trigger().querySelector('.table-column-filter__icon') as SVGElement;
    expect(icon.classList.contains('table-column-filter__icon')).toBeTrue();
    const width = parseFloat(getComputedStyle(icon).width);
    if (Number.isFinite(width) && width > 0) {
      expect(width).toBeGreaterThanOrEqual(15);
      expect(width).toBeLessThanOrEqual(17);
    }
  });

  it('closes when clicking outside', () => {
    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('closes on Escape', () => {
    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('opens in RTL without changing trigger accessibility', () => {
    document.documentElement.dir = 'rtl';
    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();
    expect(trigger().getAttribute('aria-label')).toBe('Filter: Title');
    expect(getComputedStyle(document.documentElement).direction).toBe('rtl');
  });

  it('opens directly below the trigger in LTR, start-aligned to the icon', async () => {
    document.documentElement.dir = 'ltr';
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const triggerRect = trigger().getBoundingClientRect();
    const panelRect = panel()!.getBoundingClientRect();
    const pad = 12;
    const width = Math.min(268, window.innerWidth - pad * 2);
    const expectedLeft = Math.max(pad, Math.min(triggerRect.left, window.innerWidth - width - pad));
    expect(panelRect.top - triggerRect.bottom).toBeGreaterThanOrEqual(6);
    expect(panelRect.top - triggerRect.bottom).toBeLessThanOrEqual(10);
    expect(Math.abs(parseFloat(panel()!.style.left) - expectedLeft)).toBeLessThan(2);
  });

  it('opens directly below the trigger in RTL, start-aligned to the icon', async () => {
    document.documentElement.dir = 'rtl';
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const triggerRect = trigger().getBoundingClientRect();
    const panelRect = panel()!.getBoundingClientRect();
    const pad = 12;
    const width = Math.min(268, window.innerWidth - pad * 2);
    const expectedLeft = Math.max(
      pad,
      Math.min(triggerRect.right - width, window.innerWidth - width - pad)
    );
    expect(panelRect.top - triggerRect.bottom).toBeGreaterThanOrEqual(6);
    expect(panelRect.top - triggerRect.bottom).toBeLessThanOrEqual(10);
    expect(Math.abs(parseFloat(panel()!.style.left) - expectedLeft)).toBeLessThan(2);
  });

  it('shifts inward only as needed so the panel never overflows the viewport', async () => {
    document.documentElement.dir = 'ltr';
    const btn = trigger();
    spyOn(btn, 'getBoundingClientRect').and.returnValue({
      top: 80,
      bottom: 108,
      left: window.innerWidth - 24,
      right: window.innerWidth - 4,
      width: 20,
      height: 28,
      x: window.innerWidth - 24,
      y: 80,
      toJSON: () => ({}),
    } as DOMRect);

    btn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const left = parseFloat(panel()!.style.left);
    const width = parseFloat(panel()!.style.width);
    expect(left).toBeGreaterThanOrEqual(12);
    expect(left + width).toBeLessThanOrEqual(window.innerWidth - 12);
  });

  it('keeps the popover compact and trailing-aligned', async () => {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    const el = panel()!;
    expect(el).toBeTruthy();
    const width = el.getBoundingClientRect().width;
    if (Number.isFinite(width) && width > 0) {
      expect(width).toBeGreaterThanOrEqual(Math.min(264, window.innerWidth - 24));
      expect(width).toBeLessThanOrEqual(272);
    }
    const styles = getComputedStyle(el);
    expect(styles.paddingTop).toBe('12px');
    const actions = el.querySelector('.table-column-filter__actions') as HTMLElement;
    expect(getComputedStyle(actions).justifyContent).toBe('flex-end');
    expect(getComputedStyle(actions).columnGap || getComputedStyle(actions).gap).toBe('8px');
    const input = el.querySelector('input') as HTMLInputElement;
    const inputMin = parseFloat(getComputedStyle(input).minHeight);
    if (Number.isFinite(inputMin) && inputMin > 0) {
      expect(inputMin).toBeGreaterThanOrEqual(38);
      expect(inputMin).toBeLessThanOrEqual(42);
    }
  });
});

describe('TableColumnFilterComponent shared status state', () => {
  let fixture: ComponentFixture<SharedStatusHostComponent>;
  let host: SharedStatusHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedStatusHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SharedStatusHostComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  async function openColumnFilter(): Promise<HTMLSelectElement> {
    const trigger = fixture.nativeElement.querySelector(
      '[data-table-column-filter-trigger]'
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    return fixture.nativeElement.querySelector(
      '[data-table-column-filter-panel] select'
    ) as HTMLSelectElement;
  }

  it('keeps one Status value between a top control and the column filter', async () => {
    let select = await openColumnFilter();
    select.value = 'PendingScheduling';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(host.status).toBe('PendingScheduling');

    select = await openColumnFilter();
    expect(select.value).toBe('PendingScheduling');
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    host.status = 'Active';
    fixture.detectChanges();

    select = await openColumnFilter();
    expect(select.value).toBe('Active');
    expect(host.status).toBe('Active');
  });
});
