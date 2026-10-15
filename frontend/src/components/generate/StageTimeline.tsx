import type { ServerStreamStage, StreamStage } from '../../types';
import { PIPELINE, stepStatus } from './pipeline';
import { CheckIcon, ExclamationTriangleIcon } from '../ui/AppIcons';

interface StageTimelineProps {
  stage: StreamStage;
  lastPipelineStage: ServerStreamStage;
}

export function StageTimeline({ stage, lastPipelineStage }: StageTimelineProps) {
  return (
    <ol className="grid grid-cols-4 gap-2 lg:block lg:space-y-1" aria-label="Generation progress">
      {PIPELINE.map((step, index) => {
        const status = stepStatus(step.stage, stage, lastPipelineStage);
        return (
          <li
            key={step.stage}
            aria-current={status === 'active' ? 'step' : undefined}
            className="relative flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3 lg:py-2"
          >
            {index < PIPELINE.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-[1.125rem] top-10 hidden h-[calc(100%-1.75rem)] w-px lg:block ${
                  status === 'done' ? 'bg-primary/40' : 'bg-stone-200'
                }`}
              />
            )}
            <span
              className={`relative flex h-1.5 w-full rounded-full lg:h-9 lg:w-9 lg:flex-shrink-0 lg:items-center lg:justify-center ${
                status === 'done'
                  ? 'bg-primary lg:text-white'
                  : status === 'active'
                    ? 'bg-primary/40 lg:bg-primary-soft lg:text-primary'
                    : status === 'failed'
                      ? 'bg-red-400 lg:bg-red-50 lg:text-red-600'
                      : 'bg-stone-200 lg:bg-stone-100 lg:text-stone-400'
              }`}
            >
              <span className="hidden lg:inline-flex">
                {status === 'done' ? (
                  <CheckIcon className="h-4 w-4" />
                ) : status === 'failed' ? (
                  <ExclamationTriangleIcon className="h-4 w-4" />
                ) : status === 'active' ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse-soft" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </span>
              {status === 'active' && (
                <span className="absolute inset-0 rounded-full bg-primary/50 animate-pulse-soft lg:hidden" />
              )}
            </span>
            <span className="min-w-0 lg:pt-1.5">
              <span
                className={`block text-[11px] font-semibold leading-tight sm:text-xs lg:text-sm ${
                  status === 'pending' ? 'text-stone-400' : 'text-stone-900'
                }`}
              >
                {step.title}
              </span>
              <span className="mt-0.5 hidden text-xs text-stone-500 lg:block">{step.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
