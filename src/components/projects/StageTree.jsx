import React, { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Circle, Lock, PlayCircle } from "lucide-react";
import { RIBA_STAGES, stageLabel, stageProgress, stageOptions, sectionsForStage } from "@/lib/projectProgress";

/**
 * The RIBA ladder as a vertical tree, one node per stage.
 *
 * Each node shows where the stage stands — passed, current, or still ahead —
 * with the progress of the work sections mapped to it. Stages the project
 * cannot move to yet are greyed and explain why on hover or click.
 */
export default function StageTree({ project, onSelect, readOnly = false }) {
  const [explaining, setExplaining] = useState(null);
  const sections = project?.work_sections || [];
  const currentStage = project?.riba_stage;
  const currentIdx = RIBA_STAGES.indexOf(currentStage);
  const options = stageOptions(project);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative">
        {options.map(({ stage, disabled, reason }, i) => {
          const pct = stageProgress(sections, stage);
          const stageSections = sectionsForStage(sections, stage);
          const done = stageSections.filter(s => s.status === "completed").length;
          const isCurrent = stage === currentStage;
          const isPassed = currentIdx >= 0 && i < currentIdx;
          const locked = disabled || readOnly;

          const Icon = isPassed ? CheckCircle2 : isCurrent ? PlayCircle : disabled ? Lock : Circle;
          const iconColour = isPassed ? "text-emerald-500"
            : isCurrent ? "text-primary"
            : disabled ? "text-muted-foreground/60" : "text-muted-foreground";

          const node = (
            <div
              role={locked ? undefined : "button"}
              tabIndex={0}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => {
                if (locked) return setExplaining(disabled ? stage : null);
                setExplaining(null);
                onSelect?.(stage);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                if (locked) return setExplaining(disabled ? stage : null);
                onSelect?.(stage);
              }}
              className={[
                "flex-1 rounded-lg border p-3 transition-colors select-none",
                isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card",
                isPassed && !isCurrent ? "border-emerald-200 bg-emerald-50/40" : "",
                disabled ? "opacity-55 cursor-not-allowed"
                  : readOnly ? "" : "cursor-pointer hover:border-primary/50 hover:bg-muted/30",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium">{stageLabel(stage)}</span>
                  {isCurrent && <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">Current</span>}
                  {isPassed && <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Passed</span>}
                  {disabled && !isPassed && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Locked</span>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {pct == null ? "no work sections" : `${pct}%`}
                </span>
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
              <div className="flex-1 pb-3">
                {disabled ? (
                  <Tooltip
                    open={explaining === stage ? true : undefined}
                    onOpenChange={(o) => { if (!o) setExplaining(null); }}
                  >
                    <TooltipTrigger asChild>{node}</TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[240px] text-center">{reason}</TooltipContent>
                  </Tooltip>
                ) : node}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
