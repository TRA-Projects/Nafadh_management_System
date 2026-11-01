
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
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
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
  showParticipants = signal(false);
  speakerMuted = signal(false);
  endingSession = signal(false);
  showEndConfirmation = signal(false);

  participants = signal<{
    identity: string;
    name: string;
    micEnabled: boolean;
    handRaised: boolean;
  }[]>([]);

  showChat = signal(false);
  chatInput = '';

  chatMessages = signal<{
    id: number;
    sender: string;
    text: string;
    mine: boolean;
  }[]>([]);

  private chatMessageId = 0;

  private room: Room | null = null;
  private raisedHands = new Map<string, boolean>();
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: TrainerApi
  ) { }

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


          room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
            if (topic !== 'session-chat' && topic !== 'session-hand') return;

            try {
              const decoded = new TextDecoder().decode(payload);
              const data = JSON.parse(decoded);

              // استقبال رفع اليد من المتدرب
              if (topic === 'session-hand') {
                if (
                  !participant ||
                  !room.remoteParticipants.has(participant.identity) ||
                  data.type !== 'raise-hand' ||
                  typeof data.raised !== 'boolean'
                ) {
                  return;
                }

                this.raisedHands.set(participant.identity, data.raised);
                this.updateParticipants();
                return;
              }

              // الشات الحالي بدون تغيير
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
                  sender: participant?.name || participant?.identity || 'مشارك',
                  text: data.text,
                  mine: false
                }
              ]);
            } catch (error) {
              console.error('Invalid LiveKit message:', error);
            }
          });

          room.on(RoomEvent.LocalTrackUnpublished, () => {
            const screenTrack = room.localParticipant
              .getTrackPublication(Track.Source.ScreenShare);

            if (!screenTrack) {
              this.screenSharing.set(false);
              this.renderLocalScreenShare();
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

          room.on(RoomEvent.ParticipantDisconnected, participant => {
            this.raisedHands.delete(participant.identity);
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
            this.raisedHands.clear();
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

    if (element instanceof HTMLAudioElement) {
      element.muted = this.speakerMuted();
    }

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
          micEnabled: !!microphone && !microphone.isMuted,
          handRaised: this.raisedHands.get(participant.identity) ?? false
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

  toggleSpeaker(): void {
    const muted = !this.speakerMuted();

    this.speakerMuted.set(muted);

    const audioElements =
      this.audioContainer?.nativeElement.querySelectorAll('audio');

    audioElements?.forEach(audio => {
      audio.muted = muted;
    });
  }


  openLiveAttendance(): void {
    if (!this.connected()) return;

    this.router.navigate(['/trainer/live-session-attendance', this.sessionId], {
      queryParams: {
        batchId: this.batchId
      }
    });
  }

  openSessionPolls(): void {
    if (!this.connected()) return;

    this.router.navigate(['/trainer/live-session-polls', this.sessionId], {
      queryParams: {
        batchId: this.batchId
      }
    });
  }

  endSession(): void {
    if (!this.connected() || this.endingSession()) return;

    this.endingSession.set(true);
    this.errorMessage.set('');

    this.api.endTrainerLiveRoom(this.sessionId).subscribe({
      next: async () => {
        try {
          await this.room?.disconnect();
        } catch (error) {
          console.error('LiveKit disconnect failed:', error);
        }

        this.connected.set(false);
        this.endingSession.set(false);
        this.showEndConfirmation.set(false);

        void this.router.navigate(['/trainer/live-sessions'], {
          queryParams: {
            batchId: this.batchId,
            tab: 'past'
          }
        });
      },
      error: error => {
        console.error('Failed to end session:', error);
        this.errorMessage.set(
          'تعذر إنهاء المحاضرة. حاولي مرة أخرى.'
        );
        this.endingSession.set(false);
      }
    });
  }

  async leaveSession(): Promise<void> {
    await this.room?.disconnect();

    this.connected.set(false);

    void this.router.navigate(['/trainer/live-sessions'], {
      queryParams: {
        batchId: this.batchId,
        tab: 'ongoing'
      }
    });

  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.room?.disconnect();
  }


  toggleChat(): void {
    this.showChat.update(value => !value);
  }

  async sendChatMessage(): Promise<void> {
    const text = this.chatInput.trim();

    if (!this.room || !this.connected() || !text) return;

    try {
      const encoder = new TextEncoder();

      const payload = encoder.encode(
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
          sender: 'أنتِ',
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

  openEndConfirmation(): void {
    if (!this.connected() || this.endingSession()) return;

    this.showEndConfirmation.set(true);
  }

  closeEndConfirmation(): void {
    if (this.endingSession()) return;

    this.showEndConfirmation.set(false);
  }

}
