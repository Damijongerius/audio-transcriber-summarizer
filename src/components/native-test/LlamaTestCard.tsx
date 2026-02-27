import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { BrainCircuit, Settings2, Trash2, Square, Play } from 'lucide-react';
import { extractAnalysisJson, AnalysisResult } from '@/lib/jsonUtils';

interface LlamaTestCardProps {
    llamaOutput: string;
    isLlamaRunning: boolean;
    llamaModelPath: string;
    detectedLlamaModel: string | null;
    onSelectModel: () => void;
    onRunLlama: (prompt: string) => void;
    onStopLlama: () => void;
    onClearOutput: () => void;
    isElectron: boolean;
    onLog?: (msg: string) => void;
}

const pathUtils = {
    basename: (p: string) => p.split(/[\\/]/).pop() || p
};

const DEFAULT_PROMPT = `
Return ONLY valid JSON.
Do NOT include explanations or extra text.

Output format:
{
  "summary": "",
  "todos": []
}

Rules:
- "summary" must be one sentence.
- "todos" must be a list of action items.
- Use only the two keys shown above.

Text:
The team discussed the Q3 project. Sarah needs to finish the API docs by Friday. Mike will handle the server deployment next week. We should also check the budget by end of month.
`

export function LlamaTestCard({
    llamaOutput,
    isLlamaRunning,
    llamaModelPath,
    detectedLlamaModel,
    onSelectModel,
    onRunLlama,
    onStopLlama,
    onClearOutput,
    isElectron,
    onLog
}: LlamaTestCardProps) {
    const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
    const [parsedData, setParsedData] = useState<AnalysisResult | null>(null);
    const lastStatus = React.useRef<string>("");

    const logStatus = React.useCallback((msg: string) => {
        if (onLog && lastStatus.current !== msg) {
            onLog(`\n[Llama Engine] ${msg}\n`);
            lastStatus.current = msg;
        }
    }, [onLog]);

    // Effect to handle the end of generation logging
    React.useEffect(() => {
        if (!isLlamaRunning && lastStatus.current.includes("Generating")) {
            if (parsedData) {
                logStatus("✨ Generation finished. Final results applied to fields.");
            } else {
                logStatus("🏁 Generation finished but no valid data was found to apply.");
            }
        }
    }, [isLlamaRunning, parsedData, logStatus]);

    // Effect to parse JSON from the raw output whenever it changes or finishes
    React.useEffect(() => {
        if (!llamaOutput) {
            setParsedData(null);
            lastStatus.current = "";
            return;
        }

        if (isLlamaRunning && !parsedData) {
            logStatus("⏳ Model is generating content... waiting for JSON markers { }");
        }

        const parsed = extractAnalysisJson(llamaOutput);
        if (parsed) {
            setParsedData(parsed);
            if (isLlamaRunning) {
                logStatus("🔄 Partial valid JSON detected. Updating fields in real-time...");
            } else {
                logStatus("✅ Valid JSON verified and fully applied.");
            }
        } else if (!isLlamaRunning && llamaOutput.trim().length > 0) {
            logStatus("❌ Error: The final output did not contain a valid JSON object.");
        }
    }, [llamaOutput, isLlamaRunning, parsedData, logStatus]);

    const handleRun = () => {
        setParsedData(null);
        lastStatus.current = "";
        if (onLog) onLog(`\n[Action] 🚀 Starting Llama generation...\n`);
        onRunLlama(prompt);
    };

    return (
        <Card className="border-primary/20 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-border/10 bg-muted/20">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <BrainCircuit className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-lg">Intelligence Engine</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={onSelectModel} title="Change Model" className="h-8 w-8">
                            <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClearOutput} title="Clear Output" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="bg-muted/30 rounded-xl p-3 border border-border/10 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Active Engine</span>
                        <span className="text-xs font-mono truncate max-w-[300px]">
                            {llamaModelPath ? pathUtils.basename(llamaModelPath) :
                                detectedLlamaModel ? `${pathUtils.basename(detectedLlamaModel)}` :
                                    "No model loaded"}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={onSelectModel} className="h-8 text-xs">
                        Change Model
                    </Button>
                </div>

                <div className="space-y-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-primary">Raw Output</span>
                    <ScrollArea className="h-[200px] w-full rounded-xl border border-border/10 bg-slate-950/50 p-4 font-mono text-[10px] text-slate-400">
                        {llamaOutput || <span className="text-muted-foreground/50 italic">Waiting for generation...</span>}
                        {isLlamaRunning && <span className="inline-block w-2 h-3 ml-1 bg-primary animate-pulse" />}
                    </ScrollArea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Summary Card */}
                    <Card className="bg-primary/5 border-primary/10 shadow-sm">
                        <CardHeader className="py-2 px-4 border-b border-primary/5">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 min-h-[120px]">
                            {parsedData?.summary ? (
                                <p className="text-sm leading-relaxed animate-in fade-in duration-500">
                                    {parsedData.summary}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground/60 italic">
                                    {isLlamaRunning ? "Generating summary..." : "No summary available."}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tasks Card */}
                    <Card className="bg-accent/5 border-accent/10 shadow-sm">
                        <CardHeader className="py-2 px-4 border-b border-accent/5">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 min-h-[120px]">
                            {parsedData?.todos && parsedData.todos.length > 0 ? (
                                <ul className="space-y-2 animate-in slide-in-from-right-2 duration-500">
                                    {parsedData.todos.map((todo, i: number) => (
                                        <li key={i} className="text-sm flex gap-2">
                                            <span className="text-accent">•</span>
                                            {todo.text}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-muted-foreground/60 italic">
                                    {isLlamaRunning ? "Extracting tasks..." : "No tasks identified."}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <div className="flex w-full gap-2 bg-muted/20 p-1.5 rounded-xl border border-border/10">
                    <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isLlamaRunning) onRunLlama(prompt); }}
                        placeholder="Ask anything..."
                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                    />
                    {isLlamaRunning ? (
                        <Button onClick={onStopLlama} variant="destructive" size="sm" className="rounded-lg px-4 gap-2">
                            <Square className="h-3.5 w-3.5 fill-current" />
                            Stop
                        </Button>
                    ) : (
                        <Button
                            onClick={handleRun}
                            disabled={!isElectron}
                            size="sm"
                            className="rounded-lg px-4 gap-2 shadow-lg shadow-primary/20"
                        >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Run
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
