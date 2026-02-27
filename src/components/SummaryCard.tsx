import { useState } from "react";
import { Sparkles, Copy, Check, ThumbsDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SummaryCardProps {
  summary: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

export function SummaryCard({ summary, isLoading, onRegenerate }: SummaryCardProps) {
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
        {isLoading && !summary ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-primary/10 rounded w-full" />
            <div className="h-4 bg-primary/10 rounded w-4/6" />
          </div>
        ) : (
          <p className="text-foreground/90 leading-relaxed">{summary || "Waiting for transcript..."}</p>
        )}
      </div>
      {summary && !isLoading && onRegenerate && (
        <div className="px-6 py-3 border-t border-border/10 bg-black/10 flex justify-end">
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={onRegenerate}
            className="text-[10px] uppercase tracking-tighter text-muted-foreground hover:text-primary gap-1.5 h-6"
          >
            <ThumbsDown className="w-3 h-3" />
            Not accurate? Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}
