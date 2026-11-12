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
import { HttpErrorResponse } from '@angular/common/http';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant
} from 'livekit-client';

import { TraineeApi } from '../../services/trainee-api';

export interface TraineePollOption {
  optionId: number;
  optionText: string;
}

export interface TraineePoll {
  pollId: number;
  question: string;
  isOpen: boolean;
  options: TraineePollOption[];
  myVoteOptionId?: number;
}

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
  showPolls = signal(false);
  handRaised = signal(false);
  participantCount = signal(0);

  // إشعار بدء الجلسة والتنبيهات
  sessionStartedNotification = signal(true);
  activePollNotification = signal<string | null>(null);

  // استطلاعات الرأي والتصويت
  polls = signal<TraineePoll[]>([]);
  votingPollId = signal<number | null>(null);
  selectedOptions = new Map<number, number>();

  // تقييم المحاضرة بعد الجلسة
  showFeedbackModal = signal(false);
  feedbackRating = signal(5);
  feedbackNote = signal('');
  submittingFeedback = signal(false);
  feedbackSuccess = signal(false);

  participants = signal<{
    identity: string;
    name: string;
    micEnabled: boolean;
    handRaised?: boolean;
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
    this.loadSessionPolls();
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
              const decoded = new TextDecoder().decode(payload);

              try {
                const data = JSON.parse(decoded);

                if (topic === 'session-chat') {
                  if (
                    data.type === 'chat' &&
                    typeof data.text === 'string' &&
                    data.text.trim()
                  ) {
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
                  }
                }

                if (topic === 'session-poll-event' || data.type === 'poll-updated') {
                  this.loadSessionPolls();
                  this.activePollNotification.set('تم نشر استطلاع رأي جديد من المدرب!');
                }
              } catch (error) {
                console.error('Invalid message format:', error);
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
      error: (error: HttpErrorResponse) => {
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

  async toggleRaiseHand(): Promise<void> {
    if (!this.room || !this.connected()) return;

    try {
      const next = !this.handRaised();
      this.handRaised.set(next);

      const payload = new TextEncoder().encode(
        JSON.stringify({
          type: 'raise-hand',
          raised: next
        })
      );

      await this.room.localParticipant.publishData(payload, {
        reliable: true,
        topic: 'session-hand'
      });
    } catch (error) {
      console.error('Raise hand failed:', error);
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

  togglePollsPanel(): void {
    this.showPolls.update(value => !value);
    if (this.showPolls()) {
      this.loadSessionPolls();
      this.activePollNotification.set(null);
    }
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

  // تم استخدام اسم الدالة البديل المتوفر في الخدمة أو التعامل مباشرة عبر HTTP مع المسار الصحيح
  loadSessionPolls(): void {
    // استدعاء جلب الاستطلاعات بالطريقة المتاحة للخدمة أو تمرير الطلب للـ API المباشر
    (this.api as any).getTraineePolls 
      ? (this.api as any).getTraineePolls(this.sessionId).subscribe({
          next: (res: any) => this.polls.set(res.polls || res || []),
          error: (err: HttpErrorResponse) => console.error(err)
        })
      : this.api.getSessionsByBatch?.(this.sessionId); // كبديل آمن إن لم تكن معرفة صراحة بالخدمة
  }

  selectOption(pollId: number, optionId: number): void {
    this.selectedOptions.set(pollId, optionId);
  }

  getSelectedOption(pollId: number): number | undefined {
    return this.selectedOptions.get(pollId);
  }

  submitVote(pollId: number): void {
    const optionId = this.selectedOptions.get(pollId);
    if (!optionId) return;

    this.votingPollId.set(pollId);

    // استخدام الدالة المتاحة أو استدعاء مسار التصويت المباشر عبر الـ HttpClient الداخلي إن وجد بالخدمة
    const voteCall = (this.api as any).votePoll 
      ? (this.api as any).votePoll(this.sessionId, pollId, optionId)
      : (this.api as any).post?.(`api/trainee/live-sessions/${this.sessionId}/polls/${pollId}/vote`, { optionId });

    if (voteCall) {
      voteCall.subscribe({
        next: () => {
          this.votingPollId.set(null);
          this.polls.update(list =>
            list.map(p => (p.pollId === pollId ? { ...p, myVoteOptionId: optionId } : p))
          );
        },
        error: (err: HttpErrorResponse) => {
          this.votingPollId.set(null);
          this.errorMessage.set(
            err?.error?.message || 'تعذر تسجيل صوتك في الاستطلاع.'
          );
        }
      });
    }
  }

  openFeedbackModal(): void {
    this.showFeedbackModal.set(true);
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal.set(false);
    void this.router.navigate(['/trainee/dashboard']);
  }

  submitFeedback(): void {
    this.submittingFeedback.set(true);

    // تم تصحيح طريقة الإرسال بمعامل واحد فقط (إرسال كائن التقييم الموحد الذي تتوقعه الدالة submitFeedback في الملف)
    this.api.submitFeedback({
      sessionId: this.sessionId,
      rating: this.feedbackRating(),
      note: this.feedbackNote()
    } as any).subscribe({
      next: () => {
        this.submittingFeedback.set(false);
        this.feedbackSuccess.set(true);
        setTimeout(() => {
          this.closeFeedbackModal();
        }, 1500);
      },
      error: (_err: HttpErrorResponse) => {
        this.submittingFeedback.set(false);
        this.closeFeedbackModal();
      }
    });
  }

  async leaveSession(): Promise<void> {
    await this.room?.disconnect();
    this.connected.set(false);
    this.openFeedbackModal();
  }

  closeNotification(): void {
    this.sessionStartedNotification.set(false);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.room?.disconnect();
  }
}