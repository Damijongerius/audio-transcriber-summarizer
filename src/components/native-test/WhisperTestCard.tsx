import React, { useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Music, FileAudio, History, Copy, Check, Settings, Upload, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface WhisperTestCardProps {
    whisperOutput: string;
    whisperProgress: string;
    isWhisperRunning: boolean;
    whisperModelPath: string;
    detectedWhisperModel: string | null;
    selectedFile: File | null;
    onSelectModel: () => void;
    onSetSelectedFile: (file: File | null) => void;
    onTranscribe: () => void;
    onAnalyze?: (text: string) => void;
    isElectron: boolean;
}

const pathUtils = {
    basename: (p: string) => p.split(/[\\/]/).pop() || p
};

export function WhisperTestCard({
    whisperOutput,
    whisperProgress,
    isWhisperRunning,
    whisperModelPath,
    detectedWhisperModel,
    selectedFile,
    onSelectModel,
    onSetSelectedFile,
    onTranscribe,
    isElectron
}: WhisperTestCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!whisperOutput) return;
        navigator.clipboard.writeText(whisperOutput);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="border-primary/20 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden mt-6">
            <CardHeader className="border-b border-border/10 bg-muted/20">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileAudio className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg">Transcription Engine</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Whisper Native</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onSelectModel} title="Select Model" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Active Model</span>
                            <span className="text-xs font-mono truncate block">
                                {whisperModelPath ? pathUtils.basename(whisperModelPath) :
                                    detectedWhisperModel ? `${pathUtils.basename(detectedWhisperModel)}` :
                                        "Searching..."}
                            </span>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Target Audio</span>
                            <span className="text-xs truncate block">
                                {selectedFile ? selectedFile.name : "No file selected"}
                            </span>
                        </div>
                    </div>

                    <div className="relative group">
                        <ScrollArea className="h-64 w-full rounded-xl border border-border/10 bg-slate-950/50 p-4">
                            {whisperOutput ? (
                                <div className="text-sm leading-relaxed text-slate-200 animate-in fade-in duration-700">
                                    <p className="first-letter:text-2xl first-letter:font-bold first-letter:text-primary">
                                        {whisperOutput}
                                    </p>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2 py-16">
                                    {isWhisperRunning ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-sm italic animate-pulse">Transcribing: {whisperProgress || "Initializing..."}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Music className="h-8 w-8 stroke-[1px]" />
                                            <p className="text-sm italic text-center">Select a WAV file and hit Transcribe</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                        {whisperOutput && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCopy}
                                className="absolute top-2 right-2 h-8 gap-2 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm border border-white/5"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
                            </Button>
                        )}
                        {whisperOutput && onAnalyze && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAnalyze(whisperOutput)}
                                className="absolute bottom-2 right-2 h-8 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 backdrop-blur-sm"
                            >
                                <Sparkles className="h-3.5 w-3.5 fill-current" />
                                <span className="text-xs font-bold uppercase tracking-tighter">Analyze</span>
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <div className="flex w-full gap-2 bg-muted/20 p-1.5 rounded-xl border border-border/10">
                    <input
                        type="file"
                        accept=".wav"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => onSetSelectedFile(e.target.files?.[0] || null)}
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="ghost"
                        className="flex-1 justify-start gap-2 hover:bg-background/50 rounded-lg text-sm"
                        disabled={isWhisperRunning || !isElectron}
                    >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">
                            {selectedFile ? selectedFile.name : 'Select 16kHz WAV...'}
                        </span>
                    </Button>
                    <Button
                        onClick={onTranscribe}
                        disabled={isWhisperRunning || !isElectron || !selectedFile}
                        className="rounded-lg px-6 gap-2 shadow-lg shadow-primary/20"
                    >
                        {isWhisperRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4 fill-current" />
                        )}
                        Start
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
