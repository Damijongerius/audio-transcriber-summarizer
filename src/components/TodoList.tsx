import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ListTodo, Copy, Check, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  items: TodoItem[];
  isLoading?: boolean;
  onRegenerate?: () => void;
}

export function TodoList({ items: initialItems, isLoading, onRegenerate }: TodoListProps) {
  const [items, setItems] = useState(initialItems);
  const [copied, setCopied] = useState(false);

  // Sync internal state with props when they change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleCopy = async () => {
    const text = items.map((item) => `${item.completed ? "✓" : "○"} ${item.text}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-primary" />
          <h3 className="font-medium text-foreground">Action Items</h3>
          <span className="text-xs text-muted-foreground font-mono">
            {items.filter((i) => i.completed).length}/{items.length}
          </span>
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
      <div className="p-4 space-y-2">
        {isLoading && items.length === 0 ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 bg-primary/5 rounded-lg w-full" />
            <div className="h-10 bg-primary/5 rounded-lg w-full" />
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 text-left ${item.completed
                ? "bg-primary/5 text-muted-foreground"
                : "bg-secondary/50 hover:bg-secondary text-foreground"
                }`}
            >
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <span
                className={`leading-relaxed ${item.completed ? "line-through" : ""
                  }`}
              >
                {item.text}
              </span>
            </button>
          ))
        )}
      </div>
      {(items.length > 0 || initialItems.length > 0) && !isLoading && onRegenerate && (
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
