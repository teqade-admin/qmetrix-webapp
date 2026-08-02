import React, { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Lock } from "lucide-react";
import { RIBA_STAGES, stageLabel, stageProgress, stageOptions } from "@/lib/projectProgress";

/**
 * The RIBA stage ladder for a project.
 *
 * Each stage shows the progress of the work sections mapped to it. Stages the
 * project may not move to yet are greyed out; hovering or clicking one explains
 * why (usually: finish the current stage's work sections first).
 *
 * @param {object[]} sections     - the project's work_sections.
 * @param {string} currentStage   - the project's riba_stage.
 * @param {(stage: string) => void} onSelect - called for permitted stages only.
 * @param {boolean} readOnly      - render without allowing a stage change.
 */
export default function StageStepper({ sections = [], currentStage, onSelect, readOnly = false }) {
  // Which locked stage the user last clicked — clicking should explain itself,
  // not just silently do nothing.
  const [explainingStage, setExplainingStage] = useState(null);

  const options = stageOptions(sections, currentStage);
  const currentIdx = RIBA_STAGES.indexOf(currentStage);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {options.map(({ stage, disabled, reason }, i) => {
          const pct = stageProgress(sections, stage);
          const isCurrent = stage === currentStage;
          const isPassed = currentIdx >= 0 && i < currentIdx;
          const locked = disabled || readOnly;

          const tile = (
            <div
              role={locked ? undefined : "button"}
              tabIndex={0}
              aria-disabled={locked}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => {
                if (locked) return setExplainingStage(disabled ? stage : null);
                setExplainingStage(null);
                onSelect?.(stage);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                if (locked) return setExplainingStage(disabled ? stage : null);
                onSelect?.(stage);
              }}
              className={[
                "rounded-lg border p-2 space-y-1.5 transition-colors select-none w-full text-left",
                isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card",
                isPassed && !isCurrent ? "border-emerald-200 bg-emerald-50/40" : "",
                disabled
                  ? "opacity-50 grayscale cursor-not-allowed"
                  : readOnly
                    ? ""
                    : "cursor-pointer hover:border-primary/50 hover:bg-muted/30",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-medium ${isCurrent ? "text-primary" : ""}`}>
                  {stageLabel(stage)}
                </span>
                {disabled
                  ? <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                  : isPassed
                    ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    : null}
              </div>
              <Progress value={pct ?? 0} className="h-1" />
              <span className="text-[10px] text-muted-foreground block">
                {pct == null ? "no sections" : `${pct}%`}
              </span>
            </div>
          );

          if (!disabled) return <div key={stage}>{tile}</div>;

          return (
            <Tooltip
              key={stage}
              open={explainingStage === stage ? true : undefined}
              onOpenChange={(o) => { if (!o) setExplainingStage(null); }}
            >
              <TooltipTrigger asChild>{tile}</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-center">
                {reason}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
