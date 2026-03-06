import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const WHISPER_MODELS = [
    {
        id: 'whisper-tiny-en',
        name: 'Whisper Tiny (English)',
        description: 'The fastest model. Excellent for quick transcriptions on lower-end hardware.',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
        relativeDest: path.join('native', 'whisper', 'models', 'ggml-tiny.en.bin'),
        type: 'whisper'
    },
    {
        id: 'whisper-base-en',
        name: 'Whisper Base (English)',
        description: 'Default transcription model. Efficient and accurate for English.',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
        relativeDest: path.join('native', 'whisper', 'models', 'ggml-base.en.bin'),
        type: 'whisper'
    },
    {
        id: 'whisper-base-multi',
        name: 'Whisper Base (Multilingual)',
        description: 'Fast and supports Dutch. Great balance of speed and multilingual accuracy.',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
        relativeDest: path.join('native', 'whisper', 'models', 'ggml-base.bin'),
        type: 'whisper'
    },
    {
        id: 'whisper-large-v3-turbo',
        name: 'Whisper Large-v3-Turbo',
        description: 'The best model for Dutch. Highly accurate, fast on GPUs, and very stable.',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
        relativeDest: path.join('native', 'whisper', 'models', 'ggml-large-v3-turbo.bin'),
        type: 'whisper'
    },
    {
        id: 'whisper-medium',
        name: 'Whisper Medium (Multilingual)',
        description: 'Excellent accuracy for Dutch and other languages. Much larger (~1.5GB).',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
        relativeDest: path.join('native', 'whisper', 'models', 'ggml-medium.bin'),
        type: 'whisper'
    }
];

const LLAMA_MODELS = [
    {
        id: 'llama-3.2-1b',
        name: 'Llama 3.2 1B',
        description: 'Blazing fast, ideal for simple summarization tasks. Tiny download (~1.1GB).',
        url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
        relativeDest: path.join('native', 'llama', 'models', 'Llama-3.2-1B-Instruct-Q4_K_M.gguf'),
        type: 'llama'
    },
    {
        id: 'llama-3.2-3b',
        name: 'Llama 3.2 3B',
        description: 'Much smarter and more accurate at summarization. Larger download (~2.2GB).',
        url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
        relativeDest: path.join('native', 'llama', 'models', 'Llama-3.2-3B-Instruct-Q4_K_M.gguf'),
        type: 'llama',
        recommended: true
    }
];


export function getAvailableModels() {
    return {
        whisper: WHISPER_MODELS.map(m => {
            const absolutePath = getModelPath(m.relativeDest);
            return { ...m, exists: !!absolutePath, path: absolutePath };
        }),
        llama: LLAMA_MODELS.map(m => {
            const absolutePath = getModelPath(m.relativeDest);
            return { ...m, exists: !!absolutePath, path: absolutePath };
        })
    };
}

export function getModelPath(relativeDest) {
    // Check developer path
    const devPath = path.join(process.cwd(), relativeDest);
    if (fs.existsSync(devPath)) return devPath;

    // Check packaged resources path
    if (app.isPackaged) {
        const packagedPath = path.join(process.resourcesPath, relativeDest);
        if (fs.existsSync(packagedPath)) return packagedPath;
    }

    // Check user data path (where we download at runtime)
    const userDataPath = path.join(app.getPath('userData'), relativeDest);
    if (fs.existsSync(userDataPath)) return userDataPath;

    // Check portable/executable path
    const portableRoot = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
    const portablePath = path.join(portableRoot, relativeDest);
    if (fs.existsSync(portablePath)) return portablePath;

    return null;
}

/**
 * Scans a directory for any file matching a suffix (like .gguf or .bin)
 * This allows the app to detect models even if the filename is slightly different.
 */
export function scanForModel(subDir, extension) {
    const searchPaths = [
        path.join(process.cwd(), 'native', subDir, 'models'),
        path.join(process.resourcesPath, 'native', subDir, 'models'),
        path.join(app.getPath('userData'), 'native', subDir, 'models'),
        path.join(process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath), 'native', subDir, 'models')
    ];

    for (const dir of searchPaths) {
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                const match = files.find(f => f.endsWith(extension));
                if (match) return path.join(dir, match);
            }
        } catch (e) { }
    }
    return null;
}


async function downloadFile(url, dest, name, win) {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download ${name}: ${response.statusText}`);

        const fileStream = fs.createWriteStream(dest);
        const reader = response.body.getReader();

        let downloadedBytes = 0;
        const totalBytes = parseInt(response.headers.get('content-length'), 10);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            fileStream.write(Buffer.from(value));
            downloadedBytes += value.length;

            if (win && !win.isDestroyed()) {
                const percent = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(2) : 0;
                win.webContents.send('models:download-progress', {
                    name,
                    percent,
                    downloadedBytes,
                    totalBytes
                });
            }
        }

        fileStream.end();
    } catch (error) {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        throw error;
    }
}

export async function downloadModel(modelId, win) {
    const model = [...WHISPER_MODELS, ...LLAMA_MODELS].find(m => m.id === modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    const dest = path.join(app.getPath('userData'), model.relativeDest);
    await downloadFile(model.url, dest, model.name, win);
    return dest;
}

export async function checkModelsPresence() {
    const hasWhisper = WHISPER_MODELS.some(m => !!getModelPath(m.relativeDest));
    const hasLlama = LLAMA_MODELS.some(m => !!getModelPath(m.relativeDest));
    return { hasWhisper, hasLlama };
}
