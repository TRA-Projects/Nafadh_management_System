
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { Router } from '@angular/router';

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
  @Input() sessionId: number | null = null;

  @Output() dismissed = new EventEmitter<void>();

  private audioContext?: AudioContext;

  constructor(private router: Router) {}

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
    if (this.sessionId == null || this.sessionId <= 0) {
      console.warn('Missing session ID');
      return;
    }

    void this.router.navigate([
      '/trainee/live-session-room',
      this.sessionId
    ]);
  }

  async playNotificationSound(): Promise<void> {
    try {
      this.audioContext ??= new AudioContext();

      const context = this.audioContext;

      if (context.state === 'suspended') {
        await context.resume();
      }

      if (context.state !== 'running') {
        console.warn('Notification sound blocked by browser');
        return;
      }

      const start = context.currentTime + 0.02;

      // Teams-style notification: two short pairs of tones.
      this.playTone(context, 660, start, 0.18);
      this.playTone(context, 880, start + 0.22, 0.24);

      this.playTone(context, 660, start + 0.65, 0.18);
      this.playTone(context, 880, start + 0.87, 0.28);

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
      0.12,
      startTime + 0.03
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}
