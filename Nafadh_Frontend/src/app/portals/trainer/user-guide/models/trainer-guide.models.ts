
export interface TrainerGuideFaq {
  question: string;
  answer: string;
}

export interface TrainerGuideStep {
  target: string;
  title: string;
  description: string;
  order: number;
  steps?: string[];
}

export interface TrainerGuidePage {
  pageKey: string;
  title: string;
  description: string;
  faqs: TrainerGuideFaq[];
  steps: TrainerGuideStep[];
}

export type TrainerGuideProgressStatus =
  | 'NotStarted'
  | 'Completed'
  | 'Skipped';

export interface TrainerGuideProgress {
  progressId?: number;
  trainerId?: number | null;
  guideKey: string;
  status: TrainerGuideProgressStatus;
  updatedAt?: string;
}
