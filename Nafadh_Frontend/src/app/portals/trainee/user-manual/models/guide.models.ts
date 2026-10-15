
export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideStep {
  target: string;
  title: string;
  description: string;
  order: number;
}

export interface GuidePage {
  pageKey: string;
  title: string;
  description: string;
  faqs: GuideFaq[];
  steps: GuideStep[];
}
