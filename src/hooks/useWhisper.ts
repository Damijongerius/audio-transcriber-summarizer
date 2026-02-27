import { useState, useEffect } from 'react';
import { toast } from "sonner";

export function useWhisper() {
    const [whisperOutput, setWhisperOutput] = useState('');
    const [whisperProgress, setWhisperProgress] = useState('');
    const [isWhisperRunning, setIsWhisperRunning] = useState(false);
    const [whisperModelPath, setWhisperModelPath] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (!window.nativeApi) return;

        // Auto-detect existing model on mount
        window.nativeApi.getDetectedModels().then(models => {
            if (models.whisper) {
                console.log("[useWhisper] 🕵️ Auto-detected model:", models.whisper);
                setWhisperModelPath(models.whisper);
            }
        });

        const unsub = window.nativeApi.onWhisperProgress((data) => {
            setWhisperProgress(data);
        });

        return () => unsub();
    }, []);

    const selectModel = async () => {
        if (!window.nativeApi) return;
        console.log("[useWhisper] 📂 Opening model selection dialog...");
        const path = await window.nativeApi.openFile({
            title: 'Select Whisper Model (.bin)',
            filters: [{ name: 'Whisper Models', extensions: ['bin'] }]
        });
        if (path) {
            console.log("[useWhisper] 🧩 Selected model:", path);
            setWhisperModelPath(path);
        }
    };

    const transcribe = async () => {
        if (!window.nativeApi) return;
        if (!selectedFile) {
            console.warn("[useWhisper] ⚠️ Attempted transcription without a file.");
            toast.error("Please select a WAV file first.");
            return;
        }
        console.log("[useWhisper] 🚀 Starting transcription for:", selectedFile.name);
        setIsWhisperRunning(true);
        setWhisperProgress("Starting...");
        setWhisperOutput('');
        try {
            const buffer = await selectedFile.arrayBuffer();
            console.log("[useWhisper] 📥 Buffer ready. Sending to main process...");
            const res = await window.nativeApi.transcribeBuffer(buffer, selectedFile.name, {
                model: whisperModelPath || undefined
            });
            console.log("[useWhisper] 🏁 Transcription finished. Success:", res.success);
            if (res.success) {
                setWhisperOutput(res.stdout);
                toast.success("Transcription complete!");
            } else {
                console.error("[useWhisper] ❌ Error:", res.stderr);
                toast.error("Transcription failed: " + res.stderr);
            }
        } catch (err) {
            console.error("[useWhisper] ❌ Hook Error:", err);
            toast.error("Error: " + String(err));
        } finally {
            setIsWhisperRunning(false);
            setWhisperProgress("");
        }
    };

    return {
        whisperOutput,
        whisperProgress,
        isWhisperRunning,
        whisperModelPath,
        selectedFile,
        setSelectedFile,
        selectModel,
        transcribe
    };
}
