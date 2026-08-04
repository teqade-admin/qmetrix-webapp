import React from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Circle, Lock, PlayCircle, ArrowRight } from "lucide-react";
import { RIBA_STAGES, stageLabel, stageProgress, stageOptions, sectionsForStage } from "@/lib/projectProgress";

/**
 * The RIBA ladder as a vertical tree, one node per stage.
 *
 * Each node shows where the stage stands — passed, current, or still ahead —
 * with the progress of the work sections mapped to it.
 *
 * Only the current stage is actionable, and only forwards: a single "Move to
 * Stage N" button that appears once its work sections are done. Every other
 * stage shows its state as a tag, so the tree reads as a status view rather
 * than a set of controls.
 */
export default function StageTree({ project, onSelect, readOnly = false }) {
  const sections = project?.work_sections || [];
  const currentStage = project?.riba_stage;
  const currentIdx = RIBA_STAGES.indexOf(currentStage);
  const options = stageOptions(project);

  const nextStage = currentIdx >= 0 && currentIdx < RIBA_STAGES.length - 1
    ? RIBA_STAGES[currentIdx + 1]
    : null;
  const nextOption = nextStage ? options.find(o => o.stage === nextStage) : null;
  const canAdvance = !!nextOption && !nextOption.disabled;
  const blockedReason = nextOption?.reason || "";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative">
        {options.map(({ stage, disabled }, i) => {
          const pct = stageProgress(sections, stage);
          const stageSections = sectionsForStage(sections, stage);
          const done = stageSections.filter(s => s.status === "completed").length;
          const isCurrent = stage === currentStage;
          const isPassed = currentIdx >= 0 && i < currentIdx;

          const Icon = isPassed ? CheckCircle2 : isCurrent ? PlayCircle : disabled ? Lock : Circle;
          const iconColour = isPassed ? "text-emerald-500"
            : isCurrent ? "text-primary"
            : disabled ? "text-muted-foreground/60" : "text-muted-foreground";

          const node = (
            <div
              className={[
                "flex-1 rounded-lg border p-3",
                isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card",
                isPassed && !isCurrent ? "border-emerald-200 bg-emerald-50/40" : "",
                !isCurrent && !isPassed ? "opacity-70" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium">{stageLabel(stage)}</span>
                  {isCurrent && <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">Current</span>}
                  {isPassed && <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Passed</span>}
                </div>
                {/* Only the stage in play offers an action. Everywhere else the
                    state is a tag, so the tree reads rather than invites clicks. */}
                {isCurrent && !readOnly ? (
                  nextStage ? (
                    canAdvance ? (
                      <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => onSelect?.(nextStage)}>
                        Move to {stageLabel(nextStage)}
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 shrink-0 cursor-help">
                            {pct == null ? "no work sections" : `${pct}% — not ready`}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[240px] text-center">{blockedReason}</TooltipContent>
                      </Tooltip>
                    )
                  ) : (
                    <span className="text-[11px] text-muted-foreground shrink-0">Final stage</span>
                  )
                ) : (
                  <span className={[
                    "text-[11px] rounded px-2 py-0.5 shrink-0 border",
                    isPassed ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                             : "bg-muted text-muted-foreground border-transparent",
                  ].join(" ")}>
                    {isPassed ? "Complete" : pct == null ? "No work sections" : `${pct}%`}
                  </span>
                )}
              </div>
              <Progress value={pct ?? 0} className="h-1.5" />
              {stageSections.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {done} of {stageSections.length} work section{stageSections.length === 1 ? "" : "s"} completed
                </p>
              )}
            </div>
          );

          return (
            <div key={stage} className="flex gap-3">
              {/* Spine: a connector between nodes, so the ladder reads as one thread. */}
              <div className="flex flex-col items-center pt-3">
                <Icon className={`h-4 w-4 shrink-0 ${iconColour}`} />
                {i < options.length - 1 && (
                  <div className={`w-px flex-1 my-1 ${isPassed ? "bg-emerald-300" : "bg-border"}`} />
                )}
              </div>
              <div className="flex-1 pb-3">{node}</div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
