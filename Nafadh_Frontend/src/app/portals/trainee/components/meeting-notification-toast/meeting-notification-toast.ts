
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges
} from '@angular/core';

@Component({
  selector: 'app-meeting-notification-toast',
  imports: [],
  templateUrl: './meeting-notification-toast.html',
  styleUrl: './meeting-notification-toast.scss',
})
export class MeetingNotificationToast implements OnChanges {
  @Input() visible = false;
  @Input() title = 'بدأت الحصة المباشرة';
  @Input() message = 'يمكنك الآن الانضمام إلى الحصة.';
  @Input() meetingLink = '';

  @Output() dismissed = new EventEmitter<void>();

  private audioContext?: AudioContext;

  // تشغيل الصوت تلقائيًا عند ظهور الإشعار
  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible'] &&
      this.visible &&
      !changes['visible'].previousValue
    ) {
      void this.playNotificationSound();
    }
  }

  closeNotification(): void {
    this.visible = false;
    this.dismissed.emit();
  }

  joinMeeting(): void {
    if (!this.meetingLink) return;

    try {
      const url = new URL(this.meetingLink);

      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return;
      }

      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch {
      console.warn('Invalid meeting link');
    }
  }

  async playNotificationSound(): Promise<void> {
    try {
      this.audioContext ??= new AudioContext();

      const context = this.audioContext;

      if (context.state === 'suspended') {
        await context.resume();
      }

      const start = context.currentTime;

      this.playTone(context, 660, start, 0.13);
      this.playTone(context, 880, start + 0.16, 0.2);

    } catch (error) {
      console.warn('Notification sound unavailable:', error);
    }
  }

  private playTone(
    context: AudioContext,
    frequency: number,
    startTime: number,
    duration: number
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      0.08,
      startTime + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }
}
