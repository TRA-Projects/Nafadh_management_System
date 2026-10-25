import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionEventsService } from '../../../services/session-events.service';

export interface LiveAttendanceRow {
  traineeId: number;
  traineeName: string;
  status: 'Connected' | 'Disconnected';
  checkInUtc: string | null;
  checkOutUtc: string | null;
  totalMinutes: number;
}

@Component({
  selector: 'app-live-attendance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-attendance.html',
})
export class LiveAttendanceComponent implements OnInit, OnDestroy {
  @Input({ required: true }) sessionId!: number;

  rows = signal<LiveAttendanceRow[]>([]);
  connectionError = signal('');

  constructor(private events: SessionEventsService) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.events.connect(this.sessionId);

      this.events.listen<LiveAttendanceRow>(
        'TraineeConnected',
        (row) => this.updateRow({ ...row, status: 'Connected' }),
      );

      this.events.listen<LiveAttendanceRow>(
        'TraineeDisconnected',
        (row) => this.updateRow({ ...row, status: 'Disconnected' }),
      );

      this.events.listen<LiveAttendanceRow>(
        'AttendanceUpdated',
        (row) => this.updateRow(row),
      );
    } catch {
      this.connectionError.set('تعذر الاتصال بالتحديثات المباشرة.');
    }
  }

  private updateRow(row: LiveAttendanceRow): void {
    this.rows.update((current) => {
      const index = current.findIndex((x) => x.traineeId === row.traineeId);

      if (index === -1) {
        return [...current, row];
      }

      const copy = [...current];
      copy[index] = { ...copy[index], ...row };
      return copy;
    });
  }

  ngOnDestroy(): void {
    void this.events.leave(this.sessionId);
  }
}
