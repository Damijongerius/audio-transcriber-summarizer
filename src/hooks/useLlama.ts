import { useState, useEffect } from 'react';
import { toast } from "sonner";

export function useLlama() {
    const [llamaOutput, setLlamaOutput] = useState('');
    const [isLlamaRunning, setIsLlamaRunning] = useState(false);
    const [llamaModelPath, setLlamaModelPath] = useState('');

    useEffect(() => {
        if (!window.nativeApi) return;

        const unsub = window.nativeApi.onLlamaToken((token) => {
            setLlamaOutput(prev => prev + token);
        });

        return () => unsub();
    }, []);

    const selectModel = async () => {
        if (!window.nativeApi) return;
        const path = await window.nativeApi.openFile({
            title: 'Select Llama Model (.gguf)',
            filters: [{ name: 'Llama Models', extensions: ['gguf'] }]
        });
        if (path) setLlamaModelPath(path);
    };

    const runLlama = async (prompt: string) => {
        if (!window.nativeApi || !prompt) return;
        setLlamaOutput('');
        setIsLlamaRunning(true);
        try {
            const res = await window.nativeApi.llamaGenerate(prompt, {
                modelPath: llamaModelPath || undefined,
                n_predict: 512,
                usePromptFlag: true
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
        if (!window.nativeApi) return;
        try {
            await window.nativeApi.llamaStop();
            setIsLlamaRunning(false);
            toast.info("Llama stopped.");
        } catch (err) {
            toast.error("Failed to stop Llama");
        }
    };

    const clearOutput = () => setLlamaOutput('');

    return {
        llamaOutput,
        isLlamaRunning,
        llamaModelPath,
        selectModel,
        runLlama,
        stopLlama,
        clearOutput
    };
}
