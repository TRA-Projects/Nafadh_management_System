
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant
} from 'livekit-client';

import { TrainerApi } from '../../services/trainer-api';

@Component({
  selector: 'app-live-session-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-session-room.html',
  styleUrl: './live-session-room.scss'
})
export class LiveSessionRoom implements OnInit, OnDestroy {

  @ViewChild('videoContainer')
  videoContainer?: ElementRef<HTMLDivElement>;

  @ViewChild('audioContainer')
  audioContainer?: ElementRef<HTMLDivElement>;

  sessionId = 0;

  connecting = signal(true);
  connected = signal(false);
  errorMessage = signal('');
  micEnabled = signal(false);
  cameraEnabled = signal(false);
  participantCount = signal(0);

  private room: Room | null = null;
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TrainerApi
  ) {}

  ngOnInit(): void {
    this.sessionId = Number(
      this.route.snapshot.paramMap.get('sessionId')
    );

    if (!Number.isInteger(this.sessionId) || this.sessionId <= 0) {
      this.errorMessage.set('رقم الجلسة غير صحيح.');
      this.connecting.set(false);
      return;
    }

    this.connectToSession();
  }

  private connectToSession(): void {
    this.connecting.set(true);
    this.errorMessage.set('');

    // نطلب رمز دخول جديدًا، ولا نخزنه في المتصفح.
    this.api.joinTrainerLiveRoom(this.sessionId).subscribe({
      next: async (connection) => {
        if (this.destroyed) return;

        try {
          const room = new Room({
            adaptiveStream: true,
            dynacast: true
          });

          this.room = room;

          room.on(
            RoomEvent.TrackSubscribed,
            (
              track: RemoteTrack,
              _publication: RemoteTrackPublication,
              participant: RemoteParticipant
            ) => {
              this.attachRemoteTrack(track, participant.identity);
            }
          );

          room.on(RoomEvent.TrackUnsubscribed, (track) => {
            track.detach().forEach(element => element.remove());
          });

          room.on(RoomEvent.ParticipantConnected, () => {
            this.updateParticipantCount();
          });

          room.on(RoomEvent.ParticipantDisconnected, () => {
            this.updateParticipantCount();
          });

          room.on(RoomEvent.Disconnected, () => {
            this.connected.set(false);
            this.updateParticipantCount();
          });

          await room.connect(
            connection.serverUrl,
            connection.participantToken
          );

          if (this.destroyed) {
            await room.disconnect();
            return;
          }

          this.connected.set(true);
          this.updateParticipantCount();

          // عرض مسارات المشاركين الموجودة عند الاتصال.
          room.remoteParticipants.forEach(participant => {
            participant.trackPublications.forEach(publication => {
              if (publication.track) {
                this.attachRemoteTrack(
                  publication.track,
                  participant.identity
                );
              }
            });
          });

        } catch (error) {
          console.error('LiveKit connection failed:', error);
          this.errorMessage.set(
            'تعذر الاتصال بالمحاضرة المباشرة.'
          );
        } finally {
          this.connecting.set(false);
        }
      },
      error: () => {
        this.errorMessage.set(
          'تعذر الحصول على صلاحية دخول المحاضرة.'
        );
        this.connecting.set(false);
      }
    });
  }

  private attachRemoteTrack(
    track: RemoteTrack,
    identity: string
  ): void {
    const container =
      track.kind === Track.Kind.Video
        ? this.videoContainer?.nativeElement
        : this.audioContainer?.nativeElement;

    if (!container) return;

    const element = track.attach();
    element.setAttribute('data-participant', identity);

    if (track.kind === Track.Kind.Video) {
      element.classList.add('participant-video');
    }

    container.appendChild(element);
  }

  private updateParticipantCount(): void {
    if (!this.room || !this.connected()) {
      this.participantCount.set(0);
      return;
    }

    this.participantCount.set(
      this.room.remoteParticipants.size + 1
    );
  }

  async toggleMic(): Promise<void> {
    if (!this.room || !this.connected()) return;

    try {
      const next = !this.micEnabled();

      await this.room.localParticipant
        .setMicrophoneEnabled(next);

      this.micEnabled.set(next);
    } catch {
      this.errorMessage.set(
        'تعذر تشغيل المايك. تأكدي من صلاحيات المتصفح.'
      );
    }
  }

  async toggleCamera(): Promise<void> {
    if (!this.room || !this.connected()) return;

    try {
      const next = !this.cameraEnabled();

      await this.room.localParticipant
        .setCameraEnabled(next);

      this.cameraEnabled.set(next);

      this.renderLocalVideo();
    } catch {
      this.errorMessage.set(
        'تعذر تشغيل الكاميرا. تأكدي من صلاحيات المتصفح.'
      );
    }
  }

  private renderLocalVideo(): void {
    const container = this.videoContainer?.nativeElement;
    if (!container || !this.room) return;

    container
      .querySelectorAll('[data-local-video]')
      .forEach(element => element.remove());

    const publication = this.room.localParticipant
      .getTrackPublication(Track.Source.Camera);

    const track = publication?.videoTrack;

    if (!track || !this.cameraEnabled()) return;

    const element = track.attach();
    element.setAttribute('data-local-video', 'true');
    element.classList.add('participant-video');

    container.appendChild(element);
  }

  async leaveSession(): Promise<void> {
    await this.room?.disconnect();

    this.connected.set(false);
    this.router.navigate(['/trainer/live-sessions']);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.room?.disconnect();
  }
}
