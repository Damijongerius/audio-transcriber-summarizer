import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Zap, RefreshCw, Terminal, Settings2 } from "lucide-react";

import { AudioUploader } from "@/components/AudioUploader";
import { ProcessingSteps, Step } from "@/components/ProcessingSteps";
import { TranscriptionResult } from "@/components/TranscriptionResult";
import { SummaryCard } from "@/components/SummaryCard";
import { TodoList } from "@/components/TodoList";
import { AppSidebar } from "@/components/AppSidebar";
import { HistoryItem } from "@/components/ProcessingHistory";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { transcribeAudio, analyzeTranscription, AnalysisResult } from "@/lib/whisper";
import { Link } from "react-router-dom";
import { ConsoleLogs } from "@/components/ConsoleLogs";
import { convertToWav, getAudioDuration } from "@/lib/audio-utils";
import { extractAnalysisJson } from "@/lib/jsonUtils";

const HISTORY_KEY = "audio-processing-history";

export default function Index() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(-1);
  const [currentStep, setCurrentStep] = useState<Step>("idle");
  const [transcription, setTranscription] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [logs, setLogs] = useState<string>("");
  const [processedFiles, setProcessedFiles] = useState<Set<string>>(new Set());
  const [detectedModels, setDetectedModels] = useState<{ whisper: string | null; llama: string | null }>({ whisper: null, llama: null });
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [regenerationCount, setRegenerationCount] = useState<number>(0);
  const [transcriptionQueue, setTranscriptionQueue] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();


  const isElectron = typeof window !== 'undefined' && !!window.nativeApi;

  // Check for models presence on mount
  useEffect(() => {
    if (!isElectron) return;

    const checkModels = async () => {
      const presence = await window.nativeApi.checkModelsPresence();
      if (!presence.hasWhisper || !presence.hasLlama) {
        navigate("/setup");
      } else {
        // Fetch paths and prioritize user selection
        const models = await window.nativeApi.getDetectedModels();
        const available = await window.nativeApi.getAvailableModels();
        
        const prefWhisper = localStorage.getItem('preferred-whisper-model');
        const prefLlama = localStorage.getItem('preferred-llama-model');
        
        const finalModels = { ...models };
        
        if (prefWhisper) {
          const w = available.whisper.find((m: any) => m.id === prefWhisper);
          if (w && w.exists) finalModels.whisper = await window.nativeApi.getModelPath(w.relativeDest);
        }
        
        if (prefLlama) {
          const l = available.llama.find((m: any) => m.id === prefLlama);
          if (l && l.exists) finalModels.llama = await window.nativeApi.getModelPath(l.relativeDest);
        }

        setDetectedModels(finalModels);
      }
    };
    checkModels();
  }, [isElectron, navigate]);

  // Real-time log subscriptions

  useEffect(() => {
    if (!isElectron) return;

    const unsubWhisper = window.nativeApi.onWhisperProgress((data) => {
      setLogs(prev => prev + data);
    });

    return () => {
      unsubWhisper();
    };
  }, [isElectron]);

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHistory(parsed.map((item: HistoryItem) => ({
          ...item,
          processedAt: new Date(item.processedAt)
        })));
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  // Ticker to slowly reveal transcription segments
  useEffect(() => {
    if (transcriptionQueue.length === 0) return;

    const interval = setInterval(() => {
      setTranscriptionQueue(prev => {
        if (prev.length === 0) return prev;
        const [next, ...rest] = prev;
        setTranscription(t => t + (t ? "" : "") + next);
        return rest;
      });
    }, 150); // Reveal one segment every 150ms

    return () => clearInterval(interval);
  }, [transcriptionQueue]);

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;
    setLogs("");

    // Process files one by one
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (processedFiles.has(file.name)) continue;

      setCurrentFileIndex(i);
      setTranscription("");
      setTranscriptionQueue([]);
      setAnalysis(null);
      setRegenerationCount(0);

      try {
        // Step 0: Convert to WAV if needed
        console.log(`[Index] Processing file ${i + 1}/${selectedFiles.length}: ${file.name}`);
        
        // Calculate estimate
        const duration = await getAudioDuration(file);
        let factor = 5; // Base model default
        if (detectedModels.whisper?.includes('tiny')) factor = 10;
        else if (detectedModels.whisper?.includes('medium')) factor = 2;
        else if (detectedModels.whisper?.includes('large')) factor = 1.5;
        
        const estimate = Math.ceil(duration / factor);
        setEstimatedTime(estimate);

        // Step 1: Transcribe
        setCurrentStep("transcribing");

        let fileToProcess: File = file;
        if (!file.name.endsWith('.wav')) {
          console.log("[Index] Converting to 16kHz WAV...");
          const blob = await convertToWav(file);
          fileToProcess = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".wav", { type: "audio/wav" });
        }

        const startTime = Date.now();
        const result = await transcribeAudio(
          fileToProcess as File, 
          detectedModels.whisper || undefined,
          (segment) => {
            setTranscriptionQueue(prev => [...prev, segment]);
          },
          (percent) => {
            setTranscriptionProgress(percent);
            // Dynamic ETA calculation: (timeElapsed / percent) * (100 - percent) + 60s buffer
            if (percent > 0) {
              const elapsed = (Date.now() - startTime) / 1000;
              const remaining = Math.ceil((elapsed / percent) * (100 - percent)) + 60;
              setEstimatedTime(remaining);
            }
          }
        );
        console.log(`[Index] Transcription finished for ${file.name}. Result length: ${result.text.length}`);
        
        // Final sync: if there are remaining items in queue, clear queue and use the full result
        setTranscriptionQueue([]);
        setTranscription(result.text);

        // Step 2: Analyze
        console.log(`[Index] Moving to analysis step for ${file.name}...`);
        setCurrentStep("summarizing");
        setEstimatedTime(20); // Llama usually takes 10-30s
        const analysisResult = await analyzeTranscription(
          result.text,
          (msg) => {
            setLogs(prev => prev + `\n[Analysis] ${msg}\n`);
          },
          (fullOutput) => {
            const partial = extractAnalysisJson(fullOutput);
            if (partial) setAnalysis(partial);
          },
          detectedModels.llama || undefined,
          0 // Start with default variant
        );
        setAnalysis(analysisResult);

        // Complete for this file
        setProcessedFiles(prev => new Set(prev).add(file.name));

        // Add to history
        const historyItem: HistoryItem = {
          id: crypto.randomUUID(),
          fileName: file.name,
          processedAt: new Date(),
          transcription: result.text,
          summary: analysisResult.summary,
          todos: analysisResult.todos,
        };
        setHistory((prev) => [historyItem, ...prev].slice(0, 10));
        setActiveHistoryId(historyItem.id);

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        toast({
          title: `❌ Failed: ${file.name}`,
          description: String(error),
          variant: "destructive"
        });
      }
    }

    setCurrentStep("complete");
    setCurrentFileIndex(-1);
    toast({
      title: "✨ Batch Processing Complete",
      description: `All ${selectedFiles.length} files have been processed.`,
    });
  };

  const handleStop = async () => {
    if (isElectron && window.nativeApi?.llamaStop) {
      await window.nativeApi.llamaStop();
      setCurrentStep("idle");
      toast({ title: "⏹️ Stopped", description: "Processing was cancelled." });
    }
  };

        const handleRegenerate = async () => {
          if (!transcription) return;
      
          try {
            setAnalysis(null); // Clear old results to show loading state
            setCurrentStep("summarizing");
            setEstimatedTime(20); // Llama usually takes 10-30s
                const nextVariant = regenerationCount + 1;
          setRegenerationCount(nextVariant);
    
          const analysisResult = await analyzeTranscription(
            transcription, 
            (msg) => {
              setLogs(prev => prev + `\n[Analysis] ${msg}\n`);
            },
            (fullOutput) => {
              const partial = extractAnalysisJson(fullOutput);
              if (partial) setAnalysis(partial);
            },
            detectedModels.llama || undefined,
            nextVariant
          );
          setAnalysis(analysisResult);
    
      setCurrentStep("complete");

      toast({
        title: "🔄 Regeneration Complete",
        description: "Summary and action items have been regenerated.",
      });
    } catch (error) {
      console.error("Regeneration error:", error);
      setCurrentStep("complete");
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setCurrentFileIndex(-1);
    setProcessedFiles(new Set());
    setCurrentStep("idle");
    setTranscription("");
    setTranscriptionQueue([]);
    setAnalysis(null);
    setLogs("");
    setActiveHistoryId(null);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setTranscription(item.transcription);
    setAnalysis({ summary: item.summary, todos: item.todos });
    setActiveHistoryId(item.id);
    setCurrentStep("complete");
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (updated.length === 0) {
        localStorage.removeItem(HISTORY_KEY);
      }
      return updated;
    });
    if (activeHistoryId === id) setActiveHistoryId(null);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setActiveHistoryId(null);
    localStorage.removeItem(HISTORY_KEY);
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          history={history}
          activeHistoryId={activeHistoryId}
          onSelectHistory={handleHistorySelect}
          onNewSession={handleReset}
          onDeleteHistory={handleDeleteHistory}
          onClearHistory={handleClearHistory}
        />

        <div className="flex-1 relative">
          {/* Background effects */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
          </div>

          {/* Sidebar trigger */}
          <div className="absolute top-4 left-4 z-20">
            <SidebarTrigger className="glass-panel p-2 hover:bg-primary/10" />
          </div>

          {/* Console Logs trigger in top right */}
          {isElectron && (
            <div className="absolute top-4 right-4 z-20">
              <ConsoleLogs logs={logs} />
            </div>
          )}

          <div className="relative max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <header className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Mic className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">Audio Intelligence</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                <span className="gradient-text">Transcribe</span>
                <span className="text-foreground"> & Analyze</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Upload your audio file and get instant transcription, summaries, and action items.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link to="/setup">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="w-4 h-4" />
                    Change Models
                  </Button>
                </Link>
                <Link to="/test">
                  <Button variant="outline" size="sm">Explore Native Features</Button>
                </Link>
              </div>
            </header>

            {/* Main content */}
            <div className="space-y-6">
              {/* Upload section */}
              {currentStep === "idle" && (
                <>
                  <AudioUploader
                    onFileSelect={setSelectedFiles}
                    selectedFiles={selectedFiles}
                    onClear={() => setSelectedFiles([])}
                  />

                  {selectedFiles.length > 0 && (
                    <div className="flex justify-center">
                      <Button variant="glow" size="xl" onClick={handleProcess} className="gap-3">
                        <Zap className="w-5 h-5" />
                        Start Processing files
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Merged View (Processing + Results) */}
              {currentStep !== "idle" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                  {/* Progress Indicator at the top of results */}
                  {currentStep !== "complete" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <p className="text-sm font-medium text-primary">
                          Processing: {selectedFiles[currentFileIndex]?.name || 'Initializing...'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {currentFileIndex + 1} / {selectedFiles.length}
                        </p>
                      </div>
                      <ProcessingSteps currentStep={currentStep} estimatedTime={estimatedTime} />
                      <div className="flex justify-center">
                        <Button variant="outline" size="sm" onClick={handleStop} className="text-destructive border-destructive/20 hover:bg-destructive/10 h-8">
                          Cancel Batch
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Transcription Card - Ready after step 1 */}
                  <TranscriptionResult
                    text={transcription}
                    isLoading={currentStep === "transcribing"}
                    estimatedTime={estimatedTime}
                    progress={transcriptionProgress}
                  />

                  {/* Summary & Todos - Show while summarizing or when complete */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <SummaryCard
                      summary={analysis?.summary || ""}
                      isLoading={currentStep === "summarizing" || (currentStep === "transcribing" && !analysis)}
                      onRegenerate={handleRegenerate}
                    />
                    <TodoList
                      items={analysis?.todos || []}
                      isLoading={currentStep === "summarizing" || (currentStep === "transcribing" && !analysis)}
                      onRegenerate={handleRegenerate}
                    />
                  </div>

                  {currentStep === "complete" && (
                    <div className="flex justify-center">
                      <Button variant="glass" size="lg" onClick={handleRegenerate} className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Regenerate Output
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="mt-20 text-center">
              <p className="text-xs text-muted-foreground/50 font-mono">
                Powered by Whisper AI • Built with precision
              </p>
            </footer>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
