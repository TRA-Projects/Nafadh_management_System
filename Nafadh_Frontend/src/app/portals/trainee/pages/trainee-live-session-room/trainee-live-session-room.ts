
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant
} from 'livekit-client';

import { TraineeApi } from '../../services/trainee-api';

@Component({
  selector: 'app-trainee-live-session-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainee-live-session-room.html',
  styleUrl: './trainee-live-session-room.scss'
})
export class TraineeLiveSessionRoom implements OnInit, OnDestroy {
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
  screenSharing = signal(false);
  speakerMuted = signal(false);
  showParticipants = signal(false);
  showChat = signal(false);
  participantCount = signal(0);

  participants = signal<{
    identity: string;
    name: string;
    micEnabled: boolean;
  }[]>([]);

  chatInput = '';

  chatMessages = signal<{
    id: number;
    sender: string;
    text: string;
    mine: boolean;
  }[]>([]);

  private chatMessageId = 0;
  private room: Room | null = null;
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TraineeApi
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

    this.api.joinTraineeLiveRoom(this.sessionId).subscribe({
      next: async connection => {
        if (this.destroyed) return;

        try {
          const room = new Room({
            adaptiveStream: true,
            dynacast: true
          });

          this.room = room;

          room.on(
            RoomEvent.DataReceived,
            (payload, participant, _kind, topic) => {
              if (topic !== 'session-chat') return;

              try {
                const data = JSON.parse(
                  new TextDecoder().decode(payload)
                );

                if (
                  data.type !== 'chat' ||
                  typeof data.text !== 'string' ||
                  !data.text.trim()
                ) {
                  return;
                }

                this.chatMessages.update(messages => [
                  ...messages,
                  {
                    id: ++this.chatMessageId,
                    sender:
                      participant?.name ||
                      participant?.identity ||
                      'مشارك',
                    text: data.text,
                    mine: false
                  }
                ]);
              } catch (error) {
                console.error('Invalid chat message:', error);
              }
            }
          );

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

          room.on(RoomEvent.LocalTrackUnpublished, () => {
            const screenTrack = room.localParticipant
              .getTrackPublication(Track.Source.ScreenShare);

            if (!screenTrack) {
              this.screenSharing.set(false);
              this.renderLocalScreenShare();
            }
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
      error: error => {
        console.error('Trainee room join failed:', error);

        this.errorMessage.set(
          error.status === 409
            ? 'المحاضرة لم تبدأ بعد أو غير متاحة للانضمام.'
            : 'تعذر الحصول على صلاحية دخول المحاضرة.'
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

    if (element instanceof HTMLAudioElement) {
      element.muted = this.speakerMuted();
    }

    if (track.kind === Track.Kind.Video) {
      element.classList.add('participant-video');
    }

    container.appendChild(element);
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

    this.participantCount.set(remoteParticipants.length + 1);
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
        'تعذر تشغيل المايك. تحقق من صلاحيات المتصفح.'
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
        'تعذر تشغيل الكاميرا. تحقق من صلاحيات المتصفح.'
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
      this.renderLocalScreenShare();
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

  private renderLocalScreenShare(): void {
    const container = this.videoContainer?.nativeElement;
    if (!container || !this.room) return;

    container
      .querySelectorAll('[data-local-screen]')
      .forEach(element => element.remove());

    const publication = this.room.localParticipant
      .getTrackPublication(Track.Source.ScreenShare);

    const track = publication?.videoTrack;

    if (!track || !this.screenSharing()) return;

    const element = track.attach();
    element.setAttribute('data-local-screen', 'true');
    element.classList.add('participant-video');

    container.appendChild(element);
  }

  toggleParticipantsPanel(): void {
    this.showParticipants.update(value => !value);
  }

  toggleChat(): void {
    this.showChat.update(value => !value);
  }

  toggleSpeaker(): void {
    const muted = !this.speakerMuted();
    this.speakerMuted.set(muted);

    const audioElements =
      this.audioContainer?.nativeElement.querySelectorAll('audio');

    audioElements?.forEach(audio => {
      audio.muted = muted;
    });
  }

  async sendChatMessage(): Promise<void> {
    const text = this.chatInput.trim();

    if (!this.room || !this.connected() || !text) return;

    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({
          type: 'chat',
          text
        })
      );

      await this.room.localParticipant.publishData(
        payload,
        { reliable: true, topic: 'session-chat' }
      );

      this.chatMessages.update(messages => [
        ...messages,
        {
          id: ++this.chatMessageId,
          sender: 'أنت',
          text,
          mine: true
        }
      ]);

      this.chatInput = '';
    } catch (error) {
      console.error('Chat message failed:', error);
      this.errorMessage.set('تعذر إرسال الرسالة.');
    }
  }

  async leaveSession(): Promise<void> {
    await this.room?.disconnect();
    this.connected.set(false);

    void this.router.navigate(['/trainee/dashboard']);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.room?.disconnect();
  }
}
