import { FileAudio, Clock, Plus } from "lucide-react";
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
}

export function AppSidebar({ history, onSelectHistory, onNewSession }: AppSidebarProps) {
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
            <Clock className="w-4 h-4" />
            {!collapsed && <span>Recent Sessions</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {history.length === 0 ? (
                <div className={`px-3 py-4 text-xs text-muted-foreground ${collapsed ? "hidden" : ""}`}>
                  No sessions yet
                </div>
              ) : (
                history.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectHistory(item)}
                      tooltip={item.fileName}
                      className="h-auto py-2"
                    >
                      <FileAudio className="w-4 h-4 shrink-0 text-primary" />
                      {!collapsed && (
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm truncate">{item.fileName}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(item.processedAt)}</p>
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
