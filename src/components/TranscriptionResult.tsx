import { Copy, Check, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface TranscriptionResultProps {
  text: string;
  isLoading?: boolean;
}

interface TranscriptionBlock {
  start: string;
  end: string;
  content: string;
}

export function TranscriptionResult({ text, isLoading }: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false);

  const blocks = useMemo(() => {
    if (!text) return [];

    // Regular expression to find blocks like [00:00:00.000 --> 00:00:27.360] text
    const regex = /\[(\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\s+-->\s+(\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\]\s+(.*)/g;
    const result: TranscriptionBlock[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      result.push({
        start: match[1],
        end: match[2],
        content: match[3].trim()
      });
    }

    // If no blocks found, maybe it's just raw text without timestamps
    if (result.length === 0 && text.trim()) {
      return [{ start: "00:00", end: "", content: text.trim() }];
    }

    return result;
  }, [text]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary pulse-glow" />
          <h3 className="font-medium text-foreground">Transcription</h3>
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
                <div className="flex items-center gap-1.5 text-xs font-mono text-primary/60 bg-primary/5 px-2 py-1 rounded w-fit h-fit border border-primary/10 min-w-[70px] justify-center">
                  <Clock className="w-3 h-3" />
                  <span>{block.start.split('.')[0]}</span>
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
