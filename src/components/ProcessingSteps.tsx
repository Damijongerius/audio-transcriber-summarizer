import { Check, Loader2, Circle } from "lucide-react";

export type Step = "idle" | "transcribing" | "summarizing" | "complete";

interface ProcessingStepsProps {
  currentStep: Step;
}

const steps = [
  { id: "transcribing", label: "Transcribing Audio", description: "Converting speech to text" },
  { id: "summarizing", label: "Analyzing Content", description: "Generating summary & tasks" },
  { id: "complete", label: "Complete", description: "Results ready" },
];

export function ProcessingSteps({ currentStep }: ProcessingStepsProps) {
  if (currentStep === "idle") return null;

  const getStepStatus = (stepId: string): "pending" | "active" | "complete" => {
    const stepOrder = ["transcribing", "summarizing", "complete"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between gap-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          return (
            <div key={step.id} className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    status === "complete"
                      ? "bg-primary text-primary-foreground"
                      : status === "active"
                      ? "bg-primary/20 text-primary pulse-glow"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {status === "complete" ? (
                    <Check className="w-5 h-5" />
                  ) : status === "active" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <p
                    className={`text-sm font-medium ${
                      status === "active" ? "text-primary glow-text" : status === "complete" ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
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
  );
}
