import type { ServerStreamStage, StreamStage } from '../../types';

export const PIPELINE: Array<{ stage: ServerStreamStage; title: string; detail: string }> = [
  { stage: 'context', title: 'Reading your kitchen', detail: 'Taste profile, pantry and history' },
  { stage: 'thinking', title: 'Thinking it through', detail: 'Balancing flavour, time and effort' },
  { stage: 'drafting', title: 'Writing the recipe', detail: 'Ingredients, steps and nutrition' },
  { stage: 'saving', title: 'Saving to your vault', detail: 'Almost ready' },
];

type StepStatus = 'done' | 'active' | 'pending' | 'failed';

export function stepStatus(
  step: ServerStreamStage,
  stage: StreamStage,
  lastPipelineStage: ServerStreamStage
): StepStatus {
  const index = PIPELINE.findIndex(item => item.stage === step);
  if (stage === 'complete') return 'done';
  const reference = stage === 'error' || stage === 'idle' ? lastPipelineStage : stage;
  const currentIndex = PIPELINE.findIndex(item => item.stage === reference);
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return stage === 'error' ? 'failed' : 'active';
  return 'pending';
}

export function isPipelineStage(stage: StreamStage): stage is ServerStreamStage {
  return PIPELINE.some(item => item.stage === stage);
}

export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
