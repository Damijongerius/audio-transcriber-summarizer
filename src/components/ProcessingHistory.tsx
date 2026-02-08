import { Clock, FileAudio, ChevronRight } from "lucide-react";

export interface HistoryItem {
  id: string;
  fileName: string;
  processedAt: Date;
  transcription: string;
  summary: string;
  todos: { id: string; text: string; completed: boolean }[];
}

interface ProcessingHistoryProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

export function ProcessingHistory({ items, onSelect }: ProcessingHistoryProps) {
  if (items.length === 0) return null;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="font-medium text-foreground">Recent Sessions</h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{items.length}</span>
      </div>
      <div className="divide-y divide-border/30">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <FileAudio className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatTime(item.processedAt)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
