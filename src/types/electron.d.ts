export interface NativeApiResponse {
    success: boolean;
    stdout?: string;
    stderr?: string;
}

export interface NativeApi {
    transcribeFile: (filePath: string, opts?: any) => Promise<NativeApiResponse>;
    transcribeBuffer: (buffer: ArrayBuffer | Uint8Array, filename?: string, opts?: any) => Promise<NativeApiResponse>;
    llamaGenerate: (prompt: string, opts?: any) => Promise<NativeApiResponse>;

    // Streaming subscriptions
    onWhisperProgress: (callback: (data: string) => void) => () => void;
    onWhisperProgressStderr: (callback: (data: string) => void) => () => void;
    onLlamaToken: (callback: (data: string) => void) => () => void;
    onLlamaTokenStderr: (callback: (data: string) => void) => () => void;
    openFile: (opts?: any) => Promise<string | null>;
    getDetectedModels: () => Promise<{ whisper: string | null; llama: string | null }>;
    llamaStop: () => Promise<boolean>;

    // New model management
    getAvailableModels: () => Promise<{ whisper: any[]; llama: any[] }>;
    checkModelsPresence: () => Promise<{ hasWhisper: boolean; hasLlama: boolean }>;
    checkInternalStructure: () => Promise<string>;
    downloadModel: (modelId: string) => Promise<string>;
    onDownloadProgress: (callback: (data: { name: string; percent: string; downloadedBytes: number; totalBytes: number }) => void) => () => void;
    onAllModelsReady: (callback: () => void) => () => void;
}


declare global {
    interface Window {
        nativeApi?: NativeApi;
    }
}
