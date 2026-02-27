import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const models = [
    {
        name: 'Whisper Base English',
        url: 'https://huggingface.co/distil-whisper/distil-small.en/resolve/main/ggml-base.en.bin', // Using a reliable GGML source
        dest: path.join(projectRoot, 'native', 'whisper', 'models', 'ggml-base.en.bin')
    },
    {
        name: 'Llama 3.2 1B Instruct',
        url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
        dest: path.join(projectRoot, 'native', 'llama', 'models', 'Llama-3.2-1B-Instruct-Q4_K_M.gguf')
    }
];

// Note: Using the actual Whisper repo link might be better if the above fails
// Whisper GGML models repo: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin

async function downloadFile(url, dest, name) {
    if (fs.existsSync(dest)) {
        console.log(`[Models] ${name} already exists at ${dest}. Skipping download.`);
        return;
    }

    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`[Models] Downloading ${name}...`);
    console.log(`[Models] Source: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download ${name}: ${response.statusText}`);
        }

        const fileStream = fs.createWriteStream(dest);
        const reader = response.body.getReader();

        let downloadedBytes = 0;
        const totalBytes = parseInt(response.headers.get('content-length'), 10);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            fileStream.write(Buffer.from(value));
            downloadedBytes += value.length;

            if (totalBytes) {
                const percent = ((downloadedBytes / totalBytes) * 100).toFixed(2);
                process.stdout.write(`\r[Models] Progress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB / ${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
            } else {
                process.stdout.write(`\r[Models] Progress: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
            }
        }

        fileStream.end();
        console.log(`\n[Models] Successfully downloaded ${name} to ${dest}`);
    } catch (error) {
        console.error(`\n[Models] Error downloading ${name}:`, error.message);
        if (fs.existsSync(dest)) {
            fs.unlinkSync(dest); // Clean up partial file
        }
        process.exit(1);
    }
}

async function main() {
    console.log('[Models] Checking for required AI models...');
    for (const model of models) {
        await downloadFile(model.url, model.dest, model.name);
    }
    console.log('[Models] All models are ready.');
}

main().catch(err => {
    console.error('[Models] Unexpected error:', err);
    process.exit(1);
});
