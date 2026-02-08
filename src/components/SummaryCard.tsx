import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SummaryCardProps {
  summary: string;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-medium text-foreground">Summary</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
          {copied ? (
            <>
              <Check className="w-4 h-4 text-primary" />
              <span className="text-primary">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
      <div className="p-6">
        <p className="text-foreground/90 leading-relaxed">{summary}</p>
      </div>
    </div>
  );
}
