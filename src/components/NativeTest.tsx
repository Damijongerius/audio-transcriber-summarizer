import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { InfoIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import { useLlama } from '../hooks/useLlama';
import { useWhisper } from '../hooks/useWhisper';
import { LlamaTestCard } from './native-test/LlamaTestCard';
import { WhisperTestCard } from './native-test/WhisperTestCard';
import { ConsoleLogs } from './ConsoleLogs';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

export function NativeTest() {
    const {
        llamaOutput, analysis, isLlamaRunning, llamaModelPath,
        selectModel: selectLlamaModel, runLlama, stopLlama, clearOutput: clearLlama
    } = useLlama();

    const {
        whisperOutput, whisperProgress, isWhisperRunning, whisperModelPath,
        selectedFile, setSelectedFile, selectModel: selectWhisperModel, transcribe
    } = useWhisper();

    const [isElectron, setIsElectron] = useState(false);
    const [detectedModels, setDetectedModels] = useState<{ whisper: string | null; llama: string | null }>({ whisper: null, llama: null });
    const [logs, setLogs] = useState<string>("");

    useEffect(() => {
        const checkElectron = typeof window !== 'undefined' && !!window.nativeApi;
        setIsElectron(checkElectron);

        if (checkElectron) {
            window.nativeApi.getDetectedModels().then(setDetectedModels);

            // Subscribe to real-time logs
            const unsubWhisper = window.nativeApi.onWhisperProgress((data) => setLogs(prev => prev + data));
            const unsubLlama = window.nativeApi.onLlamaToken((data) => setLogs(prev => prev + data));
            const unsubLlamaStderr = window.nativeApi.onLlamaTokenStderr((data) => setLogs(prev => prev + data));

            return () => {
                unsubWhisper();
                unsubLlama();
                unsubLlamaStderr();
            };
        }
    }, []);

    const handleAnalyzeTranscription = (text: string) => {
        const prompt = `
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
${text}
`;
        runLlama(prompt);
    };

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20 relative">
            <div className="flex items-center gap-4 mb-2">
                <Link to="/">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Native Engine Testbed</h1>
            </div>

            {isElectron && (
                <div className="absolute top-4 right-4 z-20">
                    <ConsoleLogs logs={logs} />
                </div>
            )}
            
            {!isElectron && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4" />
                    <AlertTitle>Environment Warning</AlertTitle>
                    <AlertDescription>
                        Native API is not available. Please run inside <strong>Electron</strong>.
                    </AlertDescription>
                </Alert>
            )}

            {isElectron && (
                <Alert className="bg-green-50 border-green-200">
                    <InfoIcon className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Electron Detected</AlertTitle>
                    <AlertDescription className="text-green-700">Native APIs are connected.</AlertDescription>
                </Alert>
            )}

            <LlamaTestCard
                llamaOutput={llamaOutput}
                isLlamaRunning={isLlamaRunning}
                llamaModelPath={llamaModelPath}
                detectedLlamaModel={detectedModels.llama}
                onSelectModel={selectLlamaModel}
                onRunLlama={runLlama}
                onStopLlama={stopLlama}
                onClearOutput={clearLlama}
                isElectron={isElectron}
                onLog={(msg) => setLogs(prev => prev + msg)}
            />

            <WhisperTestCard
                whisperOutput={whisperOutput}
                whisperProgress={whisperProgress}
                isWhisperRunning={isWhisperRunning}
                whisperModelPath={whisperModelPath}
                detectedWhisperModel={detectedModels.whisper}
                selectedFile={selectedFile}
                onSelectModel={selectWhisperModel}
                onSetSelectedFile={setSelectedFile}
                onTranscribe={transcribe}
                onAnalyze={handleAnalyzeTranscription}
                isElectron={isElectron}
            />
        </div>
    );
}
