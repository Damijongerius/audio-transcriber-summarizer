import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { InfoIcon, AlertCircle, FileAudio, FileJson, Play, History, Square, Eraser, ExternalLink } from 'lucide-react';
import { toast } from "sonner";

// Utility for UI display
const pathUtils = {
    basename: (p: string) => p.split(/[\\/]/).pop() || p
};

export function NativeTest() {
    const [prompt, setPrompt] = useState('How do I say "Testing local AI is cool" in Dutch?');
    const [llamaOutput, setLlamaOutput] = useState('');
    const [whisperOutput, setWhisperOutput] = useState('');
    const [whisperProgress, setWhisperProgress] = useState('');
    const [isLlamaRunning, setIsLlamaRunning] = useState(false);
    const [isWhisperRunning, setIsWhisperRunning] = useState(false);
    const [isElectron, setIsElectron] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [whisperModelPath, setWhisperModelPath] = useState('');
    const [llamaModelPath, setLlamaModelPath] = useState('');
    const [detectedModels, setDetectedModels] = useState<{ whisper: string | null; llama: string | null }>({ whisper: null, llama: null });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        console.log('NativeTest mount, window.nativeApi:', window.nativeApi);
        const checkElectron = typeof window !== 'undefined' && !!window.nativeApi;
        setIsElectron(checkElectron);

        if (!checkElectron) return;

        // Fetch detected models
        window.nativeApi.getDetectedModels().then(setDetectedModels);

        // Subscriptions
        const unsubLlama = window.nativeApi.onLlamaToken((token) => {
            setLlamaOutput(prev => prev + token);
        });

        const unsubWhisper = window.nativeApi.onWhisperProgress((data) => {
            setWhisperProgress(data);
        });

        return () => {
            unsubLlama();
            unsubWhisper();
        };
    }, []);

    const handleSelectWhisperModel = async () => {
        if (!isElectron) return;
        const path = await window.nativeApi.openFile({
            title: 'Select Whisper Model (.bin)',
            filters: [{ name: 'Whisper Models', extensions: ['bin'] }]
        });
        if (path) setWhisperModelPath(path);
    };

    const handleSelectLlamaModel = async () => {
        if (!isElectron) return;
        const path = await window.nativeApi.openFile({
            title: 'Select Llama Model (.gguf)',
            filters: [{ name: 'Llama Models', extensions: ['gguf'] }]
        });
        if (path) setLlamaModelPath(path);
    };

    const runLlamaLocal = async () => {
        if (!isElectron) return;
        if (!prompt) return;
        setLlamaOutput('');
        setIsLlamaRunning(true);
        try {
            const res = await window.nativeApi.llamaGenerate(prompt, {
                modelPath: llamaModelPath || undefined,
                n_predict: 512
            });
            if (!res.success && res.stderr) {
                toast.error("Llama failed: " + res.stderr);
            }
        } catch (err) {
            toast.error("Error: " + String(err));
        } finally {
            setIsLlamaRunning(false);
        }
    };

    const stopLlama = async () => {
        if (!isElectron) return;
        try {
            await window.nativeApi.llamaStop();
            setIsLlamaRunning(false);
            toast.info("Llama stopped.");
        } catch (err) {
            toast.error("Failed to stop Llama");
        }
    };

    const clearLlamaOutput = () => {
        setLlamaOutput('');
    };

    const transcribeLocal = async () => {
        if (!isElectron) return;
        if (!selectedFile) {
            toast.error("Please select a WAV file first.");
            return;
        }
        setIsWhisperRunning(true);
        setWhisperProgress("Starting...");
        setWhisperOutput('');
        try {
            const buffer = await selectedFile.arrayBuffer();
            const res = await window.nativeApi.transcribeBuffer(buffer, selectedFile.name, {
                model: whisperModelPath || undefined
            });
            if (res.success) {
                setWhisperOutput(res.stdout);
                toast.success("Transcription complete!");
            } else {
                toast.error("Transcription failed: " + res.stderr);
            }
        } catch (err) {
            toast.error("Error: " + String(err));
        } finally {
            setIsWhisperRunning(false);
        }
    };

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
            {!isElectron && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4" />
                    <AlertTitle>Environment Warning</AlertTitle>
                    <AlertDescription>
                        Native API is not available. Please make sure you are running this page inside the <strong>Electron app</strong>, not a regular browser.
                    </AlertDescription>
                </Alert>
            )}

            {isElectron && (
                <Alert className="bg-green-50 border-green-200">
                    <InfoIcon className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Electron Detected</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Native APIs are connected and ready to test.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileJson className="h-5 w-5 text-primary" />
                            Llama 3.2 Native Test
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={clearLlamaOutput} title="Clear Output">
                                <Eraser className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                                Active Model: {llamaModelPath ? pathUtils.basename(llamaModelPath) :
                                    detectedModels.llama ? `${pathUtils.basename(detectedModels.llama)} (Default)` :
                                        "Searching..."}
                            </span>
                            <Button variant="outline" size="sm" onClick={handleSelectLlamaModel}>Change Model</Button>
                        </div>
                        {!llamaModelPath && !detectedModels.llama && (
                            <Alert className="py-2 mt-1 border-amber-500/50 bg-amber-500/5">
                                <InfoIcon className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-xs text-amber-700">
                                    No Llama 3.2 model found in <code>native/llama/models/</code>.
                                    <a href="https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
                                        className="text-primary font-bold ml-1 flex items-center inline-flex" target="_blank" rel="noopener noreferrer">
                                        Download Llama 3.2 3B (Dutch Support) <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </AlertDescription>
                            </Alert>
                        )}
                        {detectedModels.llama && (
                            <p className="text-[10px] text-green-600 font-mono italic">
                                Ready to use: {pathUtils.basename(detectedModels.llama)}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !isLlamaRunning) runLlamaLocal(); }}
                            placeholder="Type in Dutch or English..."
                            className="flex-1"
                        />
                        {isLlamaRunning ? (
                            <Button onClick={stopLlama} variant="destructive">
                                <Square className="h-4 w-4 mr-2" />
                                Stop
                            </Button>
                        ) : (
                            <Button onClick={runLlamaLocal} disabled={!isElectron}>
                                <Play className="h-4 w-4 mr-2" />
                                Run Llama
                            </Button>
                        )}
                    </div>
                    <ScrollArea className="h-64 w-full border rounded-md p-4 bg-slate-950 text-slate-50 font-mono text-xs leading-relaxed">
                        <div className="whitespace-pre-wrap">
                            {llamaOutput || <span className="text-slate-500 italic">Response will appear here...</span>}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileAudio className="h-5 w-5 text-primary" />
                        Whisper Native Test
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                                Model: {whisperModelPath ? pathUtils.basename(whisperModelPath) :
                                    detectedModels.whisper ? `${pathUtils.basename(detectedModels.whisper)} (Auto)` :
                                        "Checking models..."}
                            </span>
                            <Button variant="outline" size="sm" onClick={handleSelectWhisperModel}>Select .bin</Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                accept=".wav"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="outline"
                                className="flex-1"
                                disabled={isWhisperRunning || !isElectron}
                            >
                                {selectedFile ? `File: ${selectedFile.name}` : 'Choose WAV File (16kHz)'}
                            </Button>
                            <Button
                                onClick={transcribeLocal}
                                disabled={isWhisperRunning || !isElectron || !selectedFile}
                                className="w-32"
                            >
                                <History className="h-4 w-4 mr-2" />
                                Transcribe
                            </Button>
                        </div>
                        {whisperProgress && (
                            <div className="text-xs text-blue-600 font-medium animate-pulse">
                                Status: {whisperProgress}
                            </div>
                        )}
                    </div>
                    <ScrollArea className="h-48 w-full border rounded-md p-4 bg-slate-950 text-slate-50 font-mono text-xs leading-relaxed text-blue-200">
                        {whisperOutput || <span className="text-slate-500 italic">Transcription will appear here...</span>}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
