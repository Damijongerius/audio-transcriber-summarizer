import { Check, Loader2, Circle, Info, BrainCircuit, Mic } from "lucide-react";
import React from "react";
import { formatModelName } from "@/lib/utils";

export type Step = "idle" | "transcribing" | "summarizing" | "complete";

interface ProcessingStepsProps {
  currentStep: Step;
  whisperModel?: string | null;
  llamaModel?: string | null;
}

const steps = [
  { id: "transcribing", label: "Transcribing Audio", description: "Converting speech to text" },
  { id: "summarizing", label: "Analyzing Content", description: "Generating summary & tasks" },
  { id: "complete", label: "Complete", description: "Results ready" },
];

export function ProcessingSteps({ currentStep, whisperModel, llamaModel }: ProcessingStepsProps) {
  if (currentStep === "idle") return null;

  const getStepStatus = (stepId: string): "pending" | "active" | "complete" => {
    const stepOrder = ["transcribing", "summarizing", "complete"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (currentStep === "complete" && stepId === "complete") return "complete";
    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center justify-between gap-4 w-full">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const isActive = status === "active";
              
              return (
                <div key={step.id} className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        status === "complete"
                          ? "bg-primary text-primary-foreground"
                          : isActive
                          ? "bg-primary/20 text-primary pulse-glow"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {status === "complete" ? (
                        <Check className="w-5 h-5" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p
                          className={`text-sm font-medium whitespace-nowrap ${
                            isActive ? "text-primary glow-text" : status === "complete" ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                        {isActive && step.id === "transcribing" && whisperModel && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 shrink-0 uppercase tracking-tighter">
                            <Mic className="w-2.5 h-2.5" />
                            <span>{formatModelName(whisperModel)}</span>
                          </div>
                        )}
                        {isActive && step.id === "summarizing" && llamaModel && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-accent/70 bg-accent/5 px-1.5 py-0.5 rounded border border-accent/10 shrink-0 uppercase tracking-tighter">
                            <BrainCircuit className="w-2.5 h-2.5" />
                            <span>{formatModelName(llamaModel)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 rounded transition-all duration-500 ${
                        status === "complete" ? "bg-primary" : "bg-secondary"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {(currentStep === "transcribing" || currentStep === "summarizing") && (
        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/10 rounded-lg animate-in fade-in slide-in-from-top-2 duration-700">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {currentStep === "transcribing" ? (
              "Large audio files may take a while depending on your CPU. This processes entirely on your local machine."
            ) : (
              "Analyzing the transcription for key summaries and action items. This usually takes 10-30 seconds."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
