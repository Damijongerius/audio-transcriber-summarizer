import { useNavigate } from "react-router-dom";
import { Download, BrainCircuit, Mic, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useModelSetup } from "@/hooks/useModelSetup";
import { ModelCard } from "@/components/setup/ModelCard";

export default function Setup() {
    const navigate = useNavigate();
    const {
        availableModels, selectedWhisper, setSelectedWhisper,
        selectedLlama, setSelectedLlama, downloading,
        progress, startSetup
    } = useModelSetup();

    const handleStartSetup = () => startSetup(() => navigate("/"));

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="max-w-4xl w-full relative z-10">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mb-4">AI Setup</h1>
                    <p className="text-muted-foreground text-lg">
                        {availableModels.whisper.some(m => m.exists) ? "Whisper is ready. Choose your Intelligence Engine." : "Setup your AI engines to get started."}
                    </p>
                </header>

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <Mic className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold">Transcription Engine</h2>
                        </div>
                        {availableModels.whisper.map(model => (
                            <ModelCard
                                key={model.id}
                                model={model}
                                isSelected={selectedWhisper === model.id}
                                onSelect={() => setSelectedWhisper(model.id)}
                                disabled={downloading}
                            />
                        ))}
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <BrainCircuit className="w-5 h-5 text-accent" />
                            <h2 className="text-xl font-semibold">Intelligence Engine</h2>
                        </div>
                        {availableModels.llama.map(model => (
                            <ModelCard
                                key={model.id}
                                model={model}
                                isSelected={selectedLlama === model.id}
                                onSelect={() => setSelectedLlama(model.id)}
                                disabled={downloading}
                                accentColor="accent"
                            />
                        ))}
                    </section>
                </div>

                <div className="flex flex-col items-center gap-6 glass-panel p-8">
                    {!downloading ? (
                        <Button variant="glow" size="xl" className="w-full max-w-sm gap-3" onClick={handleStartSetup}>
                            <Download className="w-5 h-5" /> 
                            {availableModels.whisper.find(m => m.id === selectedWhisper)?.exists && 
                             availableModels.llama.find(m => m.id === selectedLlama)?.exists 
                             ? "Select & Initialize" : "Download & Initialize"}
                        </Button>
                    ) : (
                        <div className="w-full space-y-6">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium animate-pulse text-primary">Downloading {progress.name}...</p>
                                    <p className="text-xs text-muted-foreground">This might take a few minutes.</p>
                                </div>
                                <span className="text-2xl font-bold font-mono text-primary">{progress.percent}%</span>
                            </div>
                            <Progress value={parseFloat(progress.percent)} className="h-3" />
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                        <Info className="w-3 h-3" />
                        <span>Models are stored persistently in your local app data folder.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
