import { useState, useEffect } from "react";
import { useToast } from "./use-toast";

interface Model {
    id: string;
    name: string;
    description: string;
    exists: boolean;
    type: 'whisper' | 'llama';
    recommended?: boolean;
}

export function useModelSetup() {
    const [availableModels, setAvailableModels] = useState<{ whisper: Model[], llama: Model[] }>({ whisper: [], llama: [] });
    const [selectedWhisper, setSelectedWhisper] = useState<string>("");
    const [selectedLlama, setSelectedLlama] = useState<string>("");
    const [performanceProfile, setPerformanceProfile] = useState<'auto' | 'high' | 'balanced' | 'low'>('auto');
    const [downloading, setDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState<{ name: string, percent: string }>({ name: "", percent: "0" });
    const { toast } = useToast();

    useEffect(() => {
        const fetchModels = async () => {
            if (window.nativeApi) {
                const models = await window.nativeApi.getAvailableModels();
                setAvailableModels(models);

                // Load from localStorage or find first existing
                const savedWhisper = localStorage.getItem('preferred-whisper-model');
                const savedLlama = localStorage.getItem('preferred-llama-model');
                const savedProfile = localStorage.getItem('performance-profile') as any;

                if (savedProfile) setPerformanceProfile(savedProfile);

                if (savedWhisper && models.whisper.some((m: Model) => m.id === savedWhisper)) {
                    setSelectedWhisper(savedWhisper);
                } else {
                    const existingWhisper = models.whisper.find((m: Model) => m.exists);
                    if (existingWhisper) setSelectedWhisper(existingWhisper.id);
                    else if (models.whisper.length > 0) setSelectedWhisper(models.whisper[0].id);
                }

                if (savedLlama && models.llama.some((m: Model) => m.id === savedLlama)) {
                    setSelectedLlama(savedLlama);
                } else {
                    const existingLlama = models.llama.find((m: Model) => m.exists);
                    if (existingLlama) setSelectedLlama(existingLlama.id);
                    else if (models.llama.length > 0) setSelectedLlama(models.llama[0].id);
                }
            }
        };
        fetchModels();

        if (window.nativeApi) {
            const unsubProgress = window.nativeApi.onDownloadProgress((data: any) => {
                setProgress({ name: data.name, percent: data.percent });
            });
            return () => unsubProgress();
        }
    }, []);

    const startSetup = async (onSuccess: () => void) => {
        if (!selectedWhisper || !selectedLlama) {
            toast({ title: "Selection Required", description: "Please select both a transcription and a summarization model.", variant: "destructive" });
            return;
        }

        const whisperModel = availableModels.whisper.find(m => m.id === selectedWhisper);
        const llamaModel = availableModels.llama.find(m => m.id === selectedLlama);

        // Save preferences immediately
        localStorage.setItem('preferred-whisper-model', selectedWhisper);
        localStorage.setItem('preferred-llama-model', selectedLlama);
        localStorage.setItem('performance-profile', performanceProfile);

        // If both already exist, just go to success
        if (whisperModel?.exists && llamaModel?.exists) {
            onSuccess();
            return;
        }

        setDownloading(true);
        try {
            if (whisperModel && !whisperModel.exists) {
                await window.nativeApi.downloadModel(selectedWhisper);
            }
            if (llamaModel && !llamaModel.exists) {
                await window.nativeApi.downloadModel(selectedLlama);
            }

            toast({ title: "Setup Complete", description: "Everything is ready to go!" });
            onSuccess();
        } catch (error) {
            console.error("Setup failed:", error);
            toast({ title: "Setup Failed", description: String(error), variant: "destructive" });
        } finally {
            setDownloading(false);
        }
    };

    return {
        availableModels,
        selectedWhisper,
        setSelectedWhisper,
        selectedLlama,
        setSelectedLlama,
        performanceProfile,
        setPerformanceProfile,
        downloading,
        progress,
        startSetup
    };
}
