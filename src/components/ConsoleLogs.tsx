import { Terminal, X, Copy, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "./ui/sheet";

interface ConsoleLogsProps {
    logs: string;
}

export function ConsoleLogs({ logs }: ConsoleLogsProps) {
    const [copied, setCopied] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(logs);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Auto-scroll to bottom as logs come in
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [logs]);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="glass-panel p-2 hover:bg-primary/10 transition-colors" title="View Console Logs">
                    <Terminal className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] border-l border-border/50 bg-slate-950 p-0 text-slate-50">
                <SheetHeader className="p-6 border-b border-border/10">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-slate-100 flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-primary" />
                            Native Console
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Displays real-time logs from the native Whisper and Llama engines.
                        </SheetDescription>
                        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 gap-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900">
                            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                            <span>{copied ? "Copied" : "Copy All"}</span>
                        </Button>
                    </div>
                </SheetHeader>
                <div className="flex-1 overflow-hidden h-full">
                    <ScrollArea ref={scrollRef} className="h-[calc(100vh-100px)] p-6 font-mono text-[11px] leading-relaxed selection:bg-primary/30">
                        <pre className="whitespace-pre-wrap break-all opacity-90">
                            {logs || "// No events recorded yet..."}
                        </pre>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
}
