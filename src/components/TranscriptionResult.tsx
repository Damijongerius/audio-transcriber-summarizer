import { Copy, Check, Clock } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface TranscriptionResultProps {
  text: string;
  isLoading?: boolean;
  estimatedTime?: number;
  progress?: number;
}

interface TranscriptionBlock {
  start: string;
  end: string;
  content: string;
}

export function TranscriptionResult({ text, isLoading, estimatedTime = 0, progress = 0 }: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(estimatedTime);

  // Sync with incoming estimation updates
  useEffect(() => {
    setTimeLeft(estimatedTime);
  }, [estimatedTime]);

  // Real-time countdown ticker
  useEffect(() => {
    if (!isLoading || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, timeLeft]);

  const blocks = useMemo(() => {
    if (!text) return [];

    // Regular expression to find blocks like [00:00:00.000 --> 00:00:27.360] text
    const regex = /\[(\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\s+-->\s+(\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\]\s+(.*)/g;
    const rawResult: TranscriptionBlock[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      rawResult.push({
        start: match[1],
        end: match[2],
        content: match[3].trim()
      });
    }

    // If no blocks found, maybe it's just raw text without timestamps
    if (rawResult.length === 0 && text.trim()) {
      return [{ start: "00:00", end: "", content: text.trim() }];
    }

    // Merge consecutive blocks with identical content
    const mergedResult: TranscriptionBlock[] = [];
    for (const block of rawResult) {
      const lastBlock = mergedResult[mergedResult.length - 1];
      
      // If content is the same as previous, just update the end time of the previous block
      if (lastBlock && lastBlock.content === block.content) {
        lastBlock.end = block.end;
      } else {
        mergedResult.push({ ...block });
      }
    }

    return mergedResult;
  }, [text]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-primary animate-pulse" : "bg-primary"} pulse-glow`} />
          <h3 className="font-medium text-foreground">Transcription</h3>
          {isLoading && progress > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded ml-2">
              {progress}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isLoading && timeLeft > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-primary/70 animate-in fade-in duration-500">
              <Clock className="w-3 h-3" />
              <span>~{Math.ceil(timeLeft / 60)} min remaining</span>
            </div>
          )}
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
      </div>
      
      {isLoading && (
        <div className="h-1 w-full bg-primary/5 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-6">
        {isLoading && blocks.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex gap-4">
              <div className="h-4 bg-primary/10 rounded w-16" />
              <div className="h-4 bg-primary/10 rounded flex-1" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 bg-primary/10 rounded w-16" />
              <div className="h-4 bg-primary/10 rounded flex-1" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 bg-primary/10 rounded w-16" />
              <div className="h-4 bg-primary/10 rounded flex-1" />
            </div>
          </div>
        ) : blocks.length > 0 ? (
          <div className="space-y-4">
            {blocks.map((block, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-4 group">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary/60 bg-primary/5 px-2 py-1 rounded w-fit h-fit border border-primary/10 min-w-[110px] justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{block.start.split('.')[0]}</span>
                  {block.end && (
                    <>
                      <span className="opacity-40">-</span>
                      <span>{block.end.split('.')[0]}</span>
                    </>
                  )}
                </div>
                <p className="text-foreground/90 leading-relaxed flex-1">
                  {block.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground/50 text-center py-8 italic">Ready to transcribe...</p>
        )}
      </div>
    </div>
  );
}
