This document describes how to test the integrated native `whisper` and `llama` builds inside the Electron app and how to run a small LLaMA smoke-download/generation using the `-hf` option (Hugging Face repo).

Quick summary
- `electron/main.js` now supports running the local `whisper` and `llama` CLIs and exposes IPC channels:
  - `whisper:transcribe` (file path)
  - `whisper:transcribe-buffer` (ArrayBuffer)
  - `llama:generate` (prompt; supports `-m`, `-hf`, and `-n` via opts)
- `electron/preload.js` exposes `window.nativeApi` with invoke + streaming subscription helpers.

Preparing to test LLaMA (recommended small test model)
- The `llama-cli` tool supports `-hf <user/model>` to automatically download a model from Hugging Face (if available).
- Example small-ish model to try (may still be hundreds of MBs to a few GBs depending on the model):
  - `ggml-org/gemma-3-1b-it-GGUF` (the llama README uses this as an example)

Windows: quick manual test (cmd.exe)
1) Open a cmd.exe in the repository root.
2) Run the following command (this will download the model if needed and then run a short generation):

```cmd
"%CD%\\native\\llama\\build\\bin\\Release\\llama-cli.exe" -hf ggml-org/gemma-3-1b-it-GGUF -p "Write a two-sentence summary of why testing local LLMs is useful." -n 64
```

Notes:
- Replace the path to `llama-cli.exe` above if your build is located elsewhere or if `findBinary` in `electron/main.js` finds it automatically.
- The `-hf` flag downloads the Hugging Face model into the llama cache and then runs it locally. Download size depends on the model.

Testing LLaMA via the Electron renderer UI (uses the new IPC)
- In the renderer you can call `window.nativeApi.llamaGenerate(prompt, { hfRepo: 'ggml-org/gemma-3-1b-it-GGUF', n_predict: 128 })`.
- Use `window.nativeApi.onLlamaToken(callback)` to subscribe to streaming stdout tokens.

Example (renderer-side JS snippet):

```js
// request generation
const res = await window.nativeApi.llamaGenerate('Write a short poem about coding.', { hfRepo: 'ggml-org/gemma-3-1b-it-GGUF', n_predict: 128 });
console.log('final stdout', res.stdout);

// streaming subscription
const unsubscribe = window.nativeApi.onLlamaToken((chunk) => {
  // chunk are stdout chunks from the CLI; append to UI
  console.log('partial token chunk:', chunk);
});
// later: unsubscribe();
```

Testing Whisper via command line (quick example)
- We tested `whisper-cli` earlier with the built `models/ggml-base.en.bin` and `samples/jfk.wav`:

```cmd
"%CD%\\native\\whisper\\build\\bin\\Release\\whisper-cli.exe" -m "%CD%\\native\\whisper\\models\\ggml-base.en.bin" "%CD%\\native\\whisper\\samples\\jfk.wav"
```

Launching Electron in dev with native integration
1) Start the Vite dev server:

```cmd
npm run dev
```

2) Launch Electron so it connects to the dev server:

```cmd
set VITE_DEV_SERVER_URL=http://localhost:5173 && npm run electron:dev
```

Packaging (short note)
- Make sure to include `native/**` in your packaged app's files so `findBinary()` can locate the compiled binaries under `process.resourcesPath`.

Safety and performance tips
- Model downloads can be large. Prefer a machine with sufficient disk space and RAM.
- Limit concurrency: run one heavyweight job at a time or implement a job queue to avoid OOM.
- For more deterministic output, pass sampling options in the `opts` object for `llama:generate` (e.g., `--temp`, `--top-k`, `--top-p` via `args` in `electron/main.js`).

If you want, I can:
- Add a small convenience script `scripts/llama-smoke.cmd` that runs the single-line example above.
- Download a small public GGUF model into `native/llama/models/` and run a smoke generation end-to-end and paste the resulting output here (this will use network bandwidth). Let me know if you want me to perform the download and run the smoke test now.

