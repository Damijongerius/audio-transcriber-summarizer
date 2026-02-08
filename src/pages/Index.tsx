import { useState } from "react";
import { Mic, Zap, RotateCcw } from "lucide-react";
import { AudioUploader } from "@/components/AudioUploader";
import { ProcessingSteps, Step } from "@/components/ProcessingSteps";
import { TranscriptionResult } from "@/components/TranscriptionResult";
import { SummaryCard } from "@/components/SummaryCard";
import { TodoList } from "@/components/TodoList";
import { Button } from "@/components/ui/button";
import { transcribeAudio, analyzeTranscription, AnalysisResult } from "@/lib/whisper";

export default function Index() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("idle");
  const [transcription, setTranscription] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleProcess = async () => {
    if (!selectedFile) return;

    try {
      // Step 1: Transcribe
      setCurrentStep("transcribing");
      const result = await transcribeAudio(selectedFile);
      setTranscription(result.text);

      // Step 2: Analyze
      setCurrentStep("summarizing");
      const analysisResult = await analyzeTranscription(result.text);
      setAnalysis(analysisResult);

      // Complete
      setCurrentStep("complete");
    } catch (error) {
      console.error("Processing error:", error);
      setCurrentStep("idle");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setCurrentStep("idle");
    setTranscription("");
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

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
        </header>

        {/* Main content */}
        <div className="space-y-6">
          {/* Upload section */}
          {currentStep === "idle" && (
            <>
              <AudioUploader
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                onClear={() => setSelectedFile(null)}
              />

              {selectedFile && (
                <div className="flex justify-center">
                  <Button variant="glow" size="xl" onClick={handleProcess} className="gap-3">
                    <Zap className="w-5 h-5" />
                    Start Processing
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Processing steps */}
          <ProcessingSteps currentStep={currentStep} />

          {/* Results */}
          {currentStep === "complete" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TranscriptionResult text={transcription} />

              <div className="grid md:grid-cols-2 gap-6">
                {analysis && (
                  <>
                    <SummaryCard summary={analysis.summary} />
                    <TodoList items={analysis.todos} />
                  </>
                )}
              </div>

              <div className="flex justify-center pt-4">
                <Button variant="glass" size="lg" onClick={handleReset} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Process Another File
                </Button>
              </div>
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
  );
}
