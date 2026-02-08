import { FileAudio, FolderOpen, Plus, Trash2, X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { HistoryItem } from "@/components/ProcessingHistory";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onNewSession: () => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
}

export function AppSidebar({ history, onSelectHistory, onNewSession, onDeleteHistory, onClearHistory }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background/50 backdrop-blur-xl">
      <SidebarHeader className="p-3">
        <Button
          variant="glass"
          size={collapsed ? "icon" : "default"}
          onClick={onNewSession}
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>New Session</span>}
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            {!collapsed && <span>Recent Files Processed</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {history.length === 0 ? (
                <div className={`px-3 py-4 text-xs text-muted-foreground ${collapsed ? "hidden" : ""}`}>
                  No files processed yet
                </div>
              ) : (
                <>
                  {history.map((item) => (
                    <SidebarMenuItem key={item.id} className="group/item">
                      <SidebarMenuButton
                        onClick={() => onSelectHistory(item)}
                        tooltip={item.fileName}
                        className="h-auto py-2 pr-8"
                      >
                        <FileAudio className="w-4 h-4 shrink-0 text-primary" />
                        {!collapsed && (
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm truncate">{item.fileName}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(item.processedAt)}</p>
                          </div>
                        )}
                      </SidebarMenuButton>
                      {!collapsed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistory(item.id);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1 hover:bg-destructive/20 rounded transition-opacity"
                        >
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </SidebarMenuItem>
                  ))}
                  {!collapsed && history.length > 0 && (
                    <div className="px-3 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearHistory}
                        className="w-full gap-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </Button>
                    </div>
                  )}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
