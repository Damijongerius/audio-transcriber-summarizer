import { useState, useEffect } from "react";
import { Mic, Zap, RefreshCw, Terminal } from "lucide-react";
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
import { convertToWav } from "@/lib/audio-utils";

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
  const { toast } = useToast();

  const isElectron = typeof window !== 'undefined' && !!window.nativeApi;

  // Real-time log subscriptions
  useEffect(() => {
    if (!isElectron) return;

    const unsubWhisper = window.nativeApi.onWhisperProgress((data) => {
      setLogs(prev => prev + data);
    });

    const unsubLlama = window.nativeApi.onLlamaToken((data) => {
      setLogs(prev => prev + data);
    });

    const unsubLlamaStderr = window.nativeApi.onLlamaTokenStderr((data) => {
      setLogs(prev => prev + data);
    });

    return () => {
      unsubWhisper();
      unsubLlama();
      unsubLlamaStderr();
    };
  }, [isElectron]);

  // Load history from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(HISTORY_KEY);
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

  // Save history to sessionStorage when it changes
  useEffect(() => {
    if (history.length > 0) {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }, [history]);

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;
    setLogs("");

    // Process files one by one
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (processedFiles.has(file.name)) continue;

      setCurrentFileIndex(i);
      setTranscription("");
      setAnalysis(null);

      try {
        // Step 0: Convert to WAV if needed
        console.log(`[Index] Processing file ${i + 1}/${selectedFiles.length}: ${file.name}`);

        // Step 1: Transcribe
        setCurrentStep("transcribing");

        let fileToProcess: File = file;
        if (!file.name.endsWith('.wav')) {
          console.log("[Index] Converting to 16kHz WAV...");
          const blob = await convertToWav(file);
          fileToProcess = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".wav", { type: "audio/wav" });
        }

        const result = await transcribeAudio(fileToProcess as File);
        console.log(`[Index] Transcription finished for ${file.name}. Result length: ${result.text.length}`);
        setTranscription(result.text);

        // Step 2: Analyze
        console.log(`[Index] Moving to analysis step for ${file.name}...`);
        setCurrentStep("summarizing");
        const analysisResult = await analyzeTranscription(result.text);
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
      setCurrentStep("summarizing");
      const analysisResult = await analyzeTranscription(transcription);
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
    setAnalysis(null);
    setLogs("");
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setTranscription(item.transcription);
    setAnalysis({ summary: item.summary, todos: item.todos });
    setCurrentStep("complete");
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (updated.length === 0) {
        sessionStorage.removeItem(HISTORY_KEY);
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    sessionStorage.removeItem(HISTORY_KEY);
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          history={history}
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
                        Start Batch Processing
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
                      <ProcessingSteps currentStep={currentStep} />
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
                  />

                  {/* Summary & Todos - Show while summarizing or when complete */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <SummaryCard
                      summary={analysis?.summary || ""}
                      isLoading={currentStep === "summarizing" || (currentStep === "transcribing" && !analysis)}
                    />
                    <TodoList
                      items={analysis?.todos || []}
                      isLoading={currentStep === "summarizing" || (currentStep === "transcribing" && !analysis)}
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
