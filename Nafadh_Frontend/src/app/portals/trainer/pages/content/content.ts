import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrainerApi } from '../../services/trainer-api';

@Component({
  selector: 'app-trainer-content',
  imports: [CommonModule, FormsModule],
  templateUrl: './content.html',
})
export class TrainerContent {
  showModal = signal(false);
  title = '';
  programIdInput = 1;
  constructor(private api: TrainerApi) {}

  create() {
    this.api.createModule({ title: this.title, programId: this.programIdInput, orderIndex: 1 }).subscribe(() => {
      this.showModal.set(false);
      this.title = '';
    });
  }
}
