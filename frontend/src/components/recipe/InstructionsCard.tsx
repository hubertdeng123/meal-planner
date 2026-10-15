import { useState } from 'react';
import { CheckIcon, ClipboardDocumentListIcon } from '../ui/AppIcons';
import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface Instruction {
  step: number;
  content: string;
}

interface InstructionsCardProps {
  instructions: Instruction[];
  loading?: boolean;
  predictedCount?: number;
  interactive?: boolean;
}

export function InstructionsCard({
  instructions,
  loading = true,
  predictedCount = 7,
  interactive = false,
}: InstructionsCardProps) {
  const showSkeletons = loading && instructions.length === 0;
  const skeletonCount = predictedCount;
  const [cookMode, setCookMode] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState<number>(1);

  const toggleStep = (stepNumber: number) => {
    if (!interactive) return;
    setActiveStep(stepNumber);
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="icon-container-premium icon-container-sm icon-container-orange">
            <ClipboardDocumentListIcon className="h-4 w-4 text-[#C84B31]" />
          </div>
          <div>
            <h3 className="section-title">Steps</h3>
            {interactive && instructions.length > 0 && (
              <p className="text-xs font-medium text-[#78716C] tabular-nums">
                Step {Math.min(activeStep, instructions.length)} of {instructions.length}
                {completedSteps.size > 0 && ` · ${completedSteps.size} completed`}
              </p>
            )}
          </div>
        </div>

        {interactive && instructions.length > 0 && (
          <button
            type="button"
            onClick={() => setCookMode(prev => !prev)}
            aria-pressed={cookMode}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
              cookMode
                ? 'border-[#C84B31] bg-[#F9F1EA] text-[#9A3412]'
                : 'border-[#D6CEC2] bg-white text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${cookMode ? 'bg-[#C84B31]' : 'bg-[#78716C]'}`}
            />
            Cook Mode
          </button>
        )}
      </div>

      <div className="space-y-4">
        {showSkeletons
          ? Array.from({ length: skeletonCount }).map((_, idx) => (
              <div key={idx} className="flex gap-4">
                <SkeletonShimmer width="w-9" height="h-9" rounded="full" />
                <SkeletonShimmer width="w-full" height="h-16" />
              </div>
            ))
          : instructions.map(inst => {
              const isCompleted = completedSteps.has(inst.step);
              const isCurrent = interactive && activeStep === inst.step;

              return (
                <div
                  key={inst.step}
                  onClick={() => toggleStep(inst.step)}
                  className={`flex gap-4 rounded-2xl border p-4 transition-all duration-200 animate-slide-in-up ${
                    interactive ? 'cursor-pointer' : ''
                  } ${
                    isCompleted
                      ? 'border-[#3F624D]/25 bg-[#ECF5F0]/50'
                      : isCurrent && cookMode
                        ? 'border-[#C84B31]/40 bg-[#F9F1EA]/60 shadow-xs'
                        : 'border-[#E7E0D6] bg-[#FAF7F2]/60 hover:border-[#D6CEC2] hover:bg-[#FAF7F2]'
                  }`}
                  style={{ animationDelay: `${inst.step * 60}ms` }}
                >
                  <div className="flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm tabular-nums transition-colors ${
                        isCompleted
                          ? 'bg-[#2F6F4E] text-white'
                          : isCurrent && cookMode
                            ? 'bg-[#C84B31] text-white'
                            : 'border border-[#D6CEC2] bg-white text-[#9A3412]'
                      }`}
                    >
                      {isCompleted ? <CheckIcon className="h-4 w-4 text-white" /> : inst.step}
                    </div>
                  </div>
                  <p
                    className={`flex-1 pt-1 transition-all ${
                      cookMode ? 'text-lg leading-relaxed' : 'text-base leading-relaxed'
                    } ${isCompleted ? 'line-through text-[#78716C]' : 'text-[#1C1917]'}`}
                  >
                    {inst.content}
                  </p>
                </div>
              );
            })}
      </div>
    </div>
  );
}
