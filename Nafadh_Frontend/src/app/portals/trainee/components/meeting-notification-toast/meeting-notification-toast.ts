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
  standalone: true,
  imports: [],
  templateUrl: './meeting-notification-toast.html',
  styleUrl: './meeting-notification-toast.scss',
})
export class MeetingNotificationToast implements OnChanges {
  @Input() visible = false;
  @Input() title = 'بدأت الحصة المباشرة';
  @Input() message = 'يمكنك الآن الانضمام إلى الحصة.';
  @Input() sessionId: number | null = null;

  @Output() dismissed = new EventEmitter<void>();

  constructor(private router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && !changes['visible'].previousValue) {
      void this.playNotificationSound();
    }
  }

  closeNotification(): void {
    this.visible = false;
    this.dismissed.emit();
  }

  joinMeeting(): void {
    if (!this.sessionId || this.sessionId <= 0) {
      console.warn('Missing session ID');
      return;
    }

    // التوجيه المباشر لغرفة المحاضرة الحية للمتدرب
    void this.router.navigate(['/trainee/live-session-room', this.sessionId]);
    this.closeNotification();
  }

  async playNotificationSound(): Promise<void> {
    try {
      const context = new AudioContext();
      if (context.state === 'suspended') {
        await context.resume();
      }
      const start = context.currentTime + 0.02;
      this.playTone(context, 660, start, 0.18);
      this.playTone(context, 880, start + 0.22, 0.24);
    } catch (error) {
      console.warn('Sound warning:', error);
    }
  }

  private playTone(context: AudioContext, frequency: number, startTime: number, duration: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }
}