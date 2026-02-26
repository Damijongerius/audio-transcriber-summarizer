import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { StringDecoder } from 'node:string_decoder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track running child processes to allow forced termination
const runningProcesses = new Map();

function findBinary(nativeSubpath) {
  const devRoot = path.join(process.cwd());
  const packagedRoot = process.resourcesPath;

  const whisperNames = ['whisper-cli.exe', 'whisper.exe', 'main.exe', 'whisper-cli', 'whisper'];
  const llamaNames = ['llama-cli.exe', 'llama-simple.exe', 'llama-cli', 'llama-simple', 'main.exe', 'main'];

  const candidates = [];
  candidates.push(path.join(devRoot, 'native', nativeSubpath, 'build', 'bin', 'Release'));
  candidates.push(path.join(devRoot, 'native', nativeSubpath, 'build', 'bin'));
  candidates.push(path.join(devRoot, 'native', nativeSubpath));
  candidates.push(path.join(packagedRoot, 'native', nativeSubpath, 'build', 'bin', 'Release'));
  candidates.push(path.join(packagedRoot, 'native', nativeSubpath, 'build', 'bin'));
  candidates.push(path.join(packagedRoot, 'native', nativeSubpath));

  const tryNames = nativeSubpath.toLowerCase().includes('whisper') ? whisperNames : nativeSubpath.toLowerCase().includes('llama') ? llamaNames : ['main.exe', 'main'];

  for (const base of candidates) {
    for (const name of tryNames) {
      const p = path.join(base, name);
      try {
        if (fs.existsSync(p)) return p;
      } catch (e) { }
    }
  }

  const fallback1 = path.join(devRoot, 'native', nativeSubpath, 'main.exe');
  const fallback2 = path.join(devRoot, 'native', nativeSubpath, 'main');
  if (fs.existsSync(fallback1)) return fallback1;
  if (fs.existsSync(fallback2)) return fallback2;

  return path.join(devRoot, 'native', nativeSubpath);
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  console.log('[Main] Target Preload Path:', preloadPath);
  console.log('[Main] Preload File Exists:', fs.existsSync(preloadPath));

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
  });

  // Diagnostic: Check if window has nativeApi after loading
  win.webContents.on('did-finish-load', async () => {
    const hasApi = await win.webContents.executeJavaScript('!!window.nativeApi');
    console.log(`[Main] Diagnostic - Window has nativeApi: ${hasApi}`);
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;

  if (devUrl) {
    win.loadURL(devUrl).catch((e) => {
      console.error('Failed to load dev url, falling back to local files', e);
      loadLocalFile(win);
    });
  } else {
    loadLocalFile(win);
  }
}

function loadLocalFile(win) {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath).catch((e) => console.error('Failed to load index.html', e));
  } else {
    win.loadURL(`data:text/html,<h1>No Build Found</h1><p>Please run <code>npm run build</code> first to use Electron without a dev server.</p>`);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Helper to run a native binary and capture output, optionally streaming stdout chunks to the renderer
function runBinary(binaryPath, args = [], inputBuffer, ev, streamEvent, processId) {
  return new Promise((resolve) => {
    console.log(`[Main] Running: ${binaryPath} ${args.join(' ')}`);
    const cp = spawn(binaryPath, args, { windowsHide: true });

    if (processId) {
      runningProcesses.set(processId, cp);
    }

    const stdoutDecoder = new StringDecoder('utf8');
    const stderrDecoder = new StringDecoder('utf8');

    let stdout = '';
    let stderr = '';

    cp.stdout?.on('data', (chunk) => {
      const s = stdoutDecoder.write(chunk);
      stdout += s;
      try {
        if (ev && ev.sender && streamEvent) {
          ev.sender.send(streamEvent, s);
        }
      } catch (e) { }
    });

    cp.stderr?.on('data', (chunk) => {
      const s = stderrDecoder.write(chunk);
      stderr += s;
      try {
        if (ev && ev.sender && streamEvent) {
          ev.sender.send(`${streamEvent}:stderr`, s);
        }
      } catch (e) { }
    });

    let resolved = false;
    const finish = (code, signal, error) => {
      if (resolved) return;
      resolved = true;

      if (processId) {
        runningProcesses.delete(processId);
      }

      stdout += stdoutDecoder.end();
      stderr += stderrDecoder.end();

      const status = error ? 'error' : (code === 0 || code === 130 ? 'success' : 'failed');
      console.log(`[Main] Binary ${processId || 'unknown'} finished (${status}). Code: ${code}, Signal: ${signal}`);

      if (error) {
        console.error(`[Main] Binary ${processId || 'unknown'} process error:`, error);
        stderr += `\nProcess Error: ${String(error)}`;
      }

      if (stdout.length < 500 && stdout.length > 0) {
        console.log(`[Main] Small stdout output detected: "${stdout}"`);
      }

      resolve({ code: code ?? 0, stdout: stdout.trim(), stderr: stderr.trim() });
    };

    cp.on('close', (code, signal) => finish(code, signal));
    cp.on('exit', (code, signal) => finish(code, signal));
    cp.on('error', (err) => finish(1, null, err));

    if (cp.stdin) {
      if (inputBuffer) {
        cp.stdin.write(inputBuffer);
      }
      cp.stdin.end();
    }
  });
}

ipcMain.handle('whisper:transcribe', async (ev, audioPath, opts = {}) => {
  const binary = findBinary('whisper');
  const args = [];

  // Try to find the local ggml model if none provided
  let modelPath = opts.model;
  if (!modelPath) {
    const defaultModel = path.join(process.cwd(), 'native', 'whisper', 'models', 'ggml-base.en.bin');
    if (fs.existsSync(defaultModel)) {
      modelPath = defaultModel;
    }
  }

  if (modelPath) args.push('-m', modelPath);
  if (opts.threads) args.push('-t', String(opts.threads));
  args.push(audioPath);

  const res = await runBinary(binary, args, null, ev, 'whisper:progress', 'whisper');
  return { success: res.code === 0, stdout: res.stdout, stderr: res.stderr };
});

ipcMain.handle('whisper:transcribe-buffer', async (ev, buffer, filename = 'audio.wav', opts = {}) => {
  try {
    const tmpDir = app.getPath('temp');
    const tmpPath = path.join(tmpDir, `electron-whisper-${Date.now()}-${filename}`);
    await fs.promises.writeFile(tmpPath, Buffer.from(buffer));

    const binary = findBinary('whisper');
    const args = [];

    let modelPath = opts.model;
    if (!modelPath) {
      const defaultModel = path.join(process.cwd(), 'native', 'whisper', 'models', 'ggml-base.en.bin');
      if (fs.existsSync(defaultModel)) {
        modelPath = defaultModel;
      }
    }

    if (modelPath) args.push('-m', modelPath);
    if (opts.threads) args.push('-t', String(opts.threads));
    args.push(tmpPath);

    const res = await runBinary(binary, args, null, ev, 'whisper:progress', 'whisper');

    try {
      await fs.promises.unlink(tmpPath);
    } catch (e) { }

    return { success: res.code === 0, stdout: res.stdout, stderr: res.stderr };
  } catch (err) {
    return { success: false, stderr: String(err) };
  }
});

ipcMain.handle('llama:generate', async (ev, prompt, opts = {}) => {
  const binary = findBinary('llama');
  const args = [];

  // Model detection logic
  let modelPath = opts.modelPath;
  if (!modelPath) {
    const modelsDir = path.join(process.cwd(), 'native', 'llama', 'models');
    if (fs.existsSync(modelsDir)) {
      const files = fs.readdirSync(modelsDir);
      const priorityModels = ['llama-3.2', 'qwen2', 'gemma-2', 'phi-3'];
      let modelFile = null;
      for (const modelName of priorityModels) {
        modelFile = files.find(f => f.toLowerCase().includes(modelName) && f.endsWith('.gguf') && !f.toLowerCase().includes('vocab'));
        if (modelFile) break;
      }
      if (!modelFile) {
        modelFile = files.find(f => f.endsWith('.gguf') && !f.toLowerCase().includes('vocab'));
      }
      modelPath = modelFile ? path.join(modelsDir, modelFile) : null;
    }
  }

  if (modelPath) args.push('-m', modelPath);

  // Stable flags
  args.push('--temp', '0');
  args.push('--repeat-penalty', '1.1');
  args.push('--color', 'off');
  args.push('--no-display-prompt');
  args.push('-c', '4096');

  if (opts.hfRepo && !modelPath) args.push('-hf', opts.hfRepo);
  const nPredict = opts.n_predict || 1024;
  args.push('-n', String(nPredict));

  const finalPrompt = prompt + "\n\n### RESPONSE:\n";
  console.log(`[Main] Starting Llama with prompt length: ${finalPrompt.length}`);

  let res;
  if (opts.usePromptFlag === false) {
    res = await runBinary(binary, args, finalPrompt, ev, 'llama:token', 'llama');
  } else {
    args.push('-p', finalPrompt);
    res = await runBinary(binary, args, null, ev, 'llama:token', 'llama');
  }

  // Treat exit code 130 (SIGINT) as success if it likely finished naturally or was softly interrupted
  const success = res.code === 0 || res.code === 130;
  console.log(`[Main] Llama finished. Success (Resilient): ${success}, Code: ${res.code}`);

  return { success, stdout: res.stdout, stderr: res.stderr };
});

ipcMain.handle('native:getDetectedModels', async () => {
  const whisperModel = path.join(process.cwd(), 'native', 'whisper', 'models', 'ggml-base.en.bin');
  const whisperExists = fs.existsSync(whisperModel);

  let llamaModel = null;
  const llamaDir = path.join(process.cwd(), 'native', 'llama', 'models');
  if (fs.existsSync(llamaDir)) {
    const files = fs.readdirSync(llamaDir);
    const priorityModels = ['llama-3.2', 'qwen2', 'gemma-2', 'phi-3'];
    let model = null;
    for (const modelName of priorityModels) {
      model = files.find(f => f.toLowerCase().includes(modelName) && f.endsWith('.gguf') && !f.toLowerCase().includes('vocab'));
      if (model) break;
    }
    if (!model) {
      model = files.find(f => f.endsWith('.gguf') && !f.toLowerCase().includes('vocab'));
    }
    if (model) llamaModel = path.join(llamaDir, model);
  }

  return {
    whisper: whisperExists ? whisperModel : null,
    llama: llamaModel
  };
});

ipcMain.handle('llama:stop', async () => {
  const cp = runningProcesses.get('llama');
  if (cp) {
    cp.kill('SIGKILL');
    runningProcesses.delete('llama');
    return true;
  }
  return false;
});
