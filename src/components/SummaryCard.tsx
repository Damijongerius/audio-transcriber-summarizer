import { Sparkles } from "lucide-react";

interface SummaryCardProps {
  summary: string;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-medium text-foreground">Summary</h3>
      </div>
      <div className="p-6">
        <p className="text-foreground/90 leading-relaxed">{summary}</p>
      </div>
    </div>
  );
}
