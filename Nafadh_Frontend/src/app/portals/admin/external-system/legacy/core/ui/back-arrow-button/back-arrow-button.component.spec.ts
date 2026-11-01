import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { LocaleService } from '../../locale/locale.service';
import { BackArrowButtonComponent } from './back-arrow-button.component';

describe('BackArrowButtonComponent', () => {
  let fixture: ComponentFixture<BackArrowButtonComponent>;
  let navigateByUrl: jasmine.Spy;

  beforeEach(async () => {
    navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
    await TestBed.configureTestingModule({
      imports: [BackArrowButtonComponent],
      providers: [
        { provide: LocaleService, useValue: { locale: signal('en') } },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BackArrowButtonComponent);
  });

  it('shows only the arrow in the compact system style', () => {
    fixture.componentRef.setInput('iconOnly', true);
    fixture.componentRef.setInput('ariaLabel', 'Back to Jobseekers List');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Back to Jobseekers List');
    expect((button.textContent ?? '').trim()).toBe('');
    expect(button.classList.contains('btn-sm')).toBeTrue();
    expect(button.classList.contains('border-0')).toBeTrue();
    expect(button.classList.contains('min-h-9')).toBeTrue();
    expect(button.querySelector('svg')?.classList.contains('rtl:rotate-180')).toBeTrue();
  });

  it('does not navigate when the parent handles the click', () => {
    const back = spyOn(history, 'back');
    fixture.componentRef.setInput('handlesNavigation', false);
    fixture.componentRef.setInput('to', '/admin/jobseeker-dashboard');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  });

  it('navigates to the given path by default', () => {
    fixture.componentRef.setInput('to', '/admin/jobseekers-board');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(navigateByUrl).toHaveBeenCalledOnceWith('/admin/jobseekers-board');
  });
});
