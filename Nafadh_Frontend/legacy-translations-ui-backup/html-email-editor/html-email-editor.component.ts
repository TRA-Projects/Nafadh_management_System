/// <reference types="@angular/localize" />

import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Quill from 'quill';

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['link', 'image'],
  ['clean'],
] as const;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/jpg,image/gif,image/webp';

@Component({
  selector: 'app-html-email-editor',
  standalone: true,
  templateUrl: './html-email-editor.component.html',
  styleUrl: './html-email-editor.component.scss',
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HtmlEmailEditorComponent),
      multi: true,
    },
  ],
})
export class HtmlEmailEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  readonly dir = input<'ltr' | 'rtl'>('ltr');
  readonly ariaLabel = input('Email body');
  readonly placeholder = input(
    $localize`:@@jobseeker.admin.notificationTemplates.emailEditorPlaceholder:Write your email content…`,
  );

  readonly focusin = output<void>();

  private readonly editorContainer = viewChild.required<ElementRef<HTMLElement>>('editorContainer');

  private quill: Quill | null = null;
  private pendingValue = '';
  private isSettingValue = false;
  private readonly disabled = signal(false);
  private onChange: (value: string) => void = () => undefined;
  private onTouchedCallback: () => void = () => undefined;

  ngAfterViewInit(): void {
    this.initQuill();
    if (this.pendingValue) {
      this.applyHtml(this.pendingValue);
    }
    if (this.disabled()) {
      this.quill?.enable(false);
    }
  }

  ngOnDestroy(): void {
    this.quill = null;
  }

  writeValue(value: string | null): void {
    const html = value ?? '';
    if (!this.quill) {
      this.pendingValue = html;
      return;
    }
    this.applyHtml(html);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    this.quill?.enable(!isDisabled);
  }

  insertToken(token: string): void {
    if (!this.quill || this.disabled()) {
      return;
    }

    const range = this.quill.getSelection(true);
    const index = range?.index ?? Math.max(0, this.quill.getLength() - 1);
    const placeholder = `{${token}}`;
    this.quill.insertText(index, placeholder, 'user');
    this.quill.setSelection(index + placeholder.length);
  }

  private initQuill(): void {
    const host = this.editorContainer().nativeElement;
    this.quill = new Quill(host, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        toolbar: {
          container: TOOLBAR_OPTIONS,
          handlers: {
            image: () => this.insertImageFromFile(),
            link: (value: string) => this.insertLink(value),
          },
        },
      },
    });

    const editor = this.quill.root;
    editor.setAttribute('dir', this.dir());
    editor.setAttribute('aria-label', this.ariaLabel());

    this.quill.on('text-change', () => {
      if (this.isSettingValue || !this.quill) {
        return;
      }
      this.onChange(this.readHtml());
    });

    this.quill.on('selection-change', (range) => {
      if (range) {
        this.focusin.emit();
      }
    });

    editor.addEventListener('blur', () => this.onTouchedCallback());
  }

  private readHtml(): string {
    if (!this.quill) {
      return '';
    }

    const html = this.quill.getSemanticHTML?.() ?? this.quill.root.innerHTML;
    return html === '<p><br></p>' ? '' : html;
  }

  private applyHtml(html: string): void {
    if (!this.quill) {
      return;
    }

    const current = this.readHtml();
    if (current === html) {
      return;
    }

    this.isSettingValue = true;
    if (!html.trim()) {
      this.quill.setText('');
    } else {
      this.quill.clipboard.dangerouslyPasteHTML(html);
    }
    this.isSettingValue = false;
  }

  private insertImageFromFile(): void {
    if (!this.quill || this.disabled()) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_IMAGE_TYPES;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !this.quill) {
        return;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        window.alert(
          $localize`:@@jobseeker.admin.notificationTemplates.emailEditorImageTooLarge:Image must be 2 MB or smaller.`,
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl || !this.quill) {
          return;
        }

        const range = this.quill.getSelection(true);
        const index = range?.index ?? Math.max(0, this.quill.getLength() - 1);
        this.quill.insertEmbed(index, 'image', dataUrl, 'user');
        this.quill.setSelection(index + 1);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  private insertLink(value: string): void {
    if (!this.quill || this.disabled()) {
      return;
    }

    const range = this.quill.getSelection();
    if (!range) {
      return;
    }

    if (value) {
      this.quill.format('link', value);
      return;
    }

    const current = range.length > 0 ? this.quill.getFormat(range)['link'] : null;
    const url = window.prompt(
      $localize`:@@jobseeker.admin.notificationTemplates.emailEditorLinkPrompt:Enter link URL`,
      typeof current === 'string' ? current : 'https://',
    );
    if (url === null) {
      return;
    }

    if (!url.trim()) {
      this.quill.format('link', false);
      return;
    }

    this.quill.format('link', url.trim());
  }
}
