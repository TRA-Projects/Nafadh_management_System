import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

import { TrainerApi } from '../../services/trainer-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  TrainerBatchDto,
  TrainerDto
} from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainer-batches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './batches.html'
})
export class TrainerBatches implements OnInit {

  // =====================================================
  // TRAINER
  // =====================================================

  trainer =
    signal<TrainerDto | null>(null);


  // =====================================================
  // BATCHES
  // =====================================================

  batches =
    signal<TrainerBatchDto[]>([]);

  selected =
    signal<TrainerBatchDto | null>(null);

  loading =
    signal(false);

  errorMessage =
    signal('');


  // =====================================================
  // ACTIVE SECTION
  // =====================================================

  activeSection =
    signal<string | null>(null);


  // =====================================================
  // ANNOUNCEMENT
  // =====================================================

  showAnnounce =
    signal(false);

  announceMsg = '';


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private auth: AuthService,
    private router: Router
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.loadCurrentTrainer();

  }


  // =====================================================
  // CURRENT TRAINER
  // =====================================================

  /**
   * Loads the trainer linked to the currently
   * logged-in user.
   */
  private loadCurrentTrainer(): void {

    const userId =
      this.auth.session()?.userId;


    if (!userId) {

      this.errorMessage.set(
        'تعذر تحديد المستخدم الحالي'
      );

      this.batches.set([]);

      return;
    }


    this.loading.set(true);

    this.errorMessage.set('');


    this.api
      .getTrainerByUserId(userId)
      .subscribe({

        next: (trainer) => {

          this.trainer.set(
            trainer
          );

          this.loadBatches(
            trainer.trainerId
          );

        },


        error: (error) => {

          console.error(
            'Error loading trainer:',
            error
          );

          this.loading.set(false);

          this.errorMessage.set(
            'تعذر تحميل بيانات المدرب'
          );

          this.batches.set([]);

        }

      });

  }


  // =====================================================
  // LOAD BATCHES
  // =====================================================

  /**
   * Loads only the batches assigned to the
   * current trainer and recalculates their status
   * using the real start/end dates.
   */
  private loadBatches(
    trainerId: number
  ): void {

    this.api
      .getMyBatches(trainerId)
      .subscribe({

        next: (data) => {

          const result =
            (data ?? []).map(batch => ({

              ...batch,

              status:
                this.calculateBatchStatus(batch)

            }));


          this.batches.set(
            result
          );

          this.loading.set(false);

        },


        error: (error) => {

          console.error(
            'Error loading batches:',
            error
          );

          this.loading.set(false);

          this.batches.set([]);

          this.errorMessage.set(
            'تعذر تحميل دفعات المدرب'
          );

        }

      });

  }


  // =====================================================
  // BATCH STATUS
  // =====================================================

  /**
   * Calculates the status from the actual batch dates.
   *
   * Before StartDate -> Upcoming
   * Between dates    -> Ongoing
   * After EndDate    -> Completed
   * Cancelled        -> remains Cancelled
   */
  private calculateBatchStatus(
    batch: TrainerBatchDto
  ): TrainerBatchDto['status'] {

    if (batch.status === 'Cancelled') {

      return 'Cancelled';

    }


    if (
      !batch.startDate ||
      !batch.endDate
    ) {

      return batch.status;

    }


    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    const startDate =
      new Date(batch.startDate);

    startDate.setHours(
      0,
      0,
      0,
      0
    );


    const endDate =
      new Date(batch.endDate);

    endDate.setHours(
      0,
      0,
      0,
      0
    );


    if (today < startDate) {

      return 'Upcoming';

    }


    if (today > endDate) {

      return 'Completed';

    }


    return 'Ongoing';

  }


  // =====================================================
  // STATUS LABEL
  // =====================================================

  getBatchStatusLabel(
    status: string
  ): string {

    switch (status) {

      case 'Upcoming':
        return 'قادمة';

      case 'Ongoing':
        return 'نشطة';

      case 'Completed':
        return 'مكتملة';

      case 'Cancelled':
        return 'ملغاة';

      default:
        return status;

    }

  }


  // =====================================================
  // SELECT BATCH
  // =====================================================

  select(
    batch: TrainerBatchDto
  ): void {

    this.selected.set(
      batch
    );

    this.activeSection.set(
      null
    );

  }


  // =====================================================
  // BACK
  // =====================================================

  back(): void {

    if (
      this.activeSection() !== null
    ) {

      this.activeSection.set(
        null
      );

    } else {

      this.selected.set(
        null
      );

    }

  }


  // =====================================================
  // OPEN SECTION
  // =====================================================

  openSection(
    sectionName: string
  ): void {

    const batch =
      this.selected();


    if (!batch) {
      return;
    }


    // CONTENT
    if (sectionName === 'content') {

      this.router.navigate(
        ['/trainer/content'],
        {
          queryParams: {
            batchId:
              batch.batchId
          }
        }
      );

      return;

    }


    // TASKS
    if (sectionName === 'tasks') {

      this.router.navigate(
        ['/trainer/tasks'],
        {
          queryParams: {
            batchId:
              batch.batchId
          }
        }
      );

      return;

    }


    // EVALUATIONS
    if (
      sectionName ===
      'evaluations'
    ) {

      this.router.navigate(
        ['/trainer/trainees'],
        {
          queryParams: {
            batchId:
              batch.batchId
          }
        }
      );

      return;

    }


    // TRAINEES
    if (
      sectionName ===
      'trainees'
    ) {

      this.router.navigate(
        ['/trainer/trainees'],
        {
          queryParams: {
            batchId:
              batch.batchId
          }
        }
      );

      return;

    }

  }


  // =====================================================
  // SET SECTION
  // =====================================================

  setSection(
    sectionName: string | null
  ): void {

    this.activeSection.set(
      sectionName
    );

  }


  // =====================================================
  // BATCH IMAGE
  // =====================================================

  getBatchImage(
    index: number
  ): string {

    const images = [

      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',

      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',

      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',

      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',

      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80'

    ];


    return images[
      index % images.length
    ];

  }


  // =====================================================
  // POST ANNOUNCEMENT
  // =====================================================

  postAnnouncement(): void {

    const batch =
      this.selected();

    const userId =
      this.auth.session()?.userId;


    if (
      !batch ||
      !userId ||
      !this.announceMsg.trim()
    ) {
      return;
    }


    this.api
      .postAnnouncement({

        scopeType:
          'Batch',

        scopeId:
          batch.batchId,

        message:
          this.announceMsg.trim(),

        createdByUserId:
          userId

      })
      .subscribe({

        next: () => {

          this.showAnnounce.set(
            false
          );

          this.announceMsg = '';

        },


        error: (error) => {

          console.error(
            'Error posting announcement:',
            error
          );

        }

      });

  }

}