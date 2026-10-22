
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
  batchId = 0;

  connecting = signal(true);
  connected = signal(false);
  errorMessage = signal('');
  micEnabled = signal(false);
  cameraEnabled = signal(false);
  participantCount = signal(0);
  screenSharing = signal(false);

  participants = signal<{
    identity: string;
    name: string;
    micEnabled: boolean;
  }[]>([]);

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

    this.batchId = Number(
      this.route.snapshot.queryParamMap.get('batchId')
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

    this.api.joinTrainerLiveRoom(this.sessionId).subscribe({
      next: async connection => {
        if (this.destroyed) return;

        try {
          const room = new Room({
            adaptiveStream: true,
            dynacast: true
          });

          this.room = room;

          room.on(RoomEvent.LocalTrackUnpublished, () => {
            const screenTrack = room.localParticipant
              .getTrackPublication(Track.Source.ScreenShare);

            if (!screenTrack) {
              this.screenSharing.set(false);
            }
          });

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

          room.on(RoomEvent.TrackUnsubscribed, track => {
            track.detach().forEach(element => element.remove());
          });

          room.on(RoomEvent.ParticipantConnected, () => {
            this.updateParticipants();
          });

          room.on(RoomEvent.ParticipantDisconnected, () => {
            this.updateParticipants();
          });

          room.on(RoomEvent.TrackMuted, () => {
            this.updateParticipants();
          });

          room.on(RoomEvent.TrackUnmuted, () => {
            this.updateParticipants();
          });

          room.on(RoomEvent.TrackPublished, () => {
            this.updateParticipants();
          });

          room.on(RoomEvent.TrackUnpublished, () => {
            this.updateParticipants();
          });

          room.on(RoomEvent.Disconnected, () => {
            this.connected.set(false);
            this.micEnabled.set(false);
            this.cameraEnabled.set(false);
            this.screenSharing.set(false);
            this.updateParticipants();
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
          this.updateParticipants();

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

  private updateParticipants(): void {
    if (!this.room || !this.connected()) {
      this.participants.set([]);
      this.participantCount.set(0);
      return;
    }

    const remoteParticipants = Array.from(
      this.room.remoteParticipants.values()
    );

    this.participants.set(
      remoteParticipants.map(participant => {
        const microphone = participant.getTrackPublication(
          Track.Source.Microphone
        );

        return {
          identity: participant.identity,
          name: participant.name || participant.identity,
          micEnabled: !!microphone && !microphone.isMuted
        };
      })
    );

    this.updateParticipantCount();
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

  async toggleScreenShare(): Promise<void> {
    if (!this.room || !this.connected()) return;

    try {
      const next = !this.screenSharing();

      await this.room.localParticipant
        .setScreenShareEnabled(next);

      this.screenSharing.set(next);
    } catch (error) {
      console.error('Screen sharing failed:', error);

      this.errorMessage.set(
        'تعذرت مشاركة الشاشة أو تم إلغاء اختيار الشاشة.'
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

    this.router.navigate(['/trainer/live-sessions'], {
      queryParams:
        this.batchId > 0
          ? { batchId: this.batchId }
          : {}
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.room?.disconnect();
  }
}
