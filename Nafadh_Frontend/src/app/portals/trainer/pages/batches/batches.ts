import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

import { TrainerApi } from '../../services/trainer-api';
import { TrainerBatchDto } from '../../../../core/models/dtos';


@Component({
  selector: 'app-trainer-batches',
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

  trainerId = 1;


  // =====================================================
  // BATCHES
  // =====================================================

  batches = signal<TrainerBatchDto[]>([]);

  selected = signal<TrainerBatchDto | null>(null);


  // =====================================================
  // ACTIVE SECTION
  // =====================================================

  activeSection = signal<string | null>(null);


  // =====================================================
  // ANNOUNCEMENT
  // =====================================================

  showAnnounce = signal(false);

  announceMsg = '';


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private api: TrainerApi,
    private router: Router
  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.api
      .getMyBatches(this.trainerId)
      .subscribe((data) => {

        this.batches.set(
          data ?? []
        );

      });

  }


  // =====================================================
  // SELECT BATCH
  // =====================================================

  select(b: TrainerBatchDto): void {

    this.selected.set(b);

    this.activeSection.set(null);

  }


  // =====================================================
  // BACK
  // =====================================================

  back(): void {

    if (this.activeSection() !== null) {

      this.activeSection.set(null);

    } else {

      this.selected.set(null);

    }

  }


  // =====================================================
  // OPEN SECTION
  // =====================================================

  openSection(sectionName: string): void {

    const batch = this.selected();

    if (!batch) {
      return;
    }


    // -----------------------------------------
    // CONTENT
    // -----------------------------------------

    if (sectionName === 'content') {

      this.router.navigate(
        ['/trainer/content'],
        {
          queryParams: {
            batchId: batch.batchId
          }
        }
      );

      return;

    }


    // -----------------------------------------
    // TASKS
    // -----------------------------------------

    if (sectionName === 'tasks') {

      this.router.navigate(
        ['/trainer/tasks'],
        {
          queryParams: {
            batchId: batch.batchId
          }
        }
      );

      return;

    }


    // -----------------------------------------
    // EVALUATIONS
    // -----------------------------------------

    if (sectionName === 'evaluations') {

      this.router.navigate(
        ['/trainer/trainees'],
        {
          queryParams: {
            batchId: batch.batchId
          }
        }
      );

      return;

    }


    // -----------------------------------------
    // TRAINEES
    // -----------------------------------------

    if (sectionName === 'trainees') {

      this.router.navigate(
        ['/trainer/trainees'],
        {
          queryParams: {
            batchId: batch.batchId
          }
        }
      );

      return;

    }

  }


  // =====================================================
  // SET SECTION
  // =====================================================

  setSection(sectionName: string | null): void {

    this.activeSection.set(sectionName);

  }


  // =====================================================
  // BATCH IMAGE
  // =====================================================

  getBatchImage(index: number): string {

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


    if (!batch) {
      return;
    }


    this.api
      .postAnnouncement({

        scopeType: 'Batch',

        scopeId:
          batch.batchId,

        message:
          this.announceMsg,

        createdByUserId:
          3

      })
      .subscribe(() => {

        this.showAnnounce.set(false);

        this.announceMsg = '';

      });

  }

}