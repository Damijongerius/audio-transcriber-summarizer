import { useState } from "react";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  items: TodoItem[];
}

export function TodoList({ items: initialItems }: TodoListProps) {
  const [items, setItems] = useState(initialItems);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <ListTodo className="w-5 h-5 text-primary" />
        <h3 className="font-medium text-foreground">Action Items</h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {items.filter((i) => i.completed).length}/{items.length}
        </span>
      </div>
      <div className="p-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 text-left ${
              item.completed
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
              className={`leading-relaxed ${
                item.completed ? "line-through" : ""
              }`}
            >
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
