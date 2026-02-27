import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import { createRequire } from 'module';

// Set AppUserModelId for Windows taskbar icon consistency
// This MUST happen as early as possible for the taskbar to pick it up correctly
if (process.platform === 'win32') {
  app.setAppUserModelId('com.damijongerius.audio-transcriber-summarizer');
}

const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { StringDecoder } from 'node:string_decoder';
import { getAvailableModels, getModelPath, downloadModel, checkModelsPresence, scanForModel } from './modelManager.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set AppUserModelId for Windows taskbar icon consistency
if (process.platform === 'win32') {
  app.setAppUserModelId('com.damijongerius.audio-transcriber-summarizer');
}

// Track running child processes to allow forced termination
const runningProcesses = new Map();

// Global GPU detection state
let hasGpu = false;

async function detectGpu() {
  try {
    const gpuInfo = await app.getGPUInfo('basic');
    // Check if there is any discrete or integrated hardware accelerator
    const hasHardwareGpu = gpuInfo.gpuDevice?.some(d => 
      d.vendorId !== 0 && d.deviceId !== 0 && !d.deviceName?.toLowerCase().includes('microsoft basic render')
    );
    hasGpu = !!hasHardwareGpu;
    console.log(`[Main] 🖥️  GPU Detection: ${hasGpu ? 'Hardware GPU Found' : 'No Hardware GPU detected (Defaulting to CPU)'}`);
  } catch (e) {
    console.log('[Main] ⚠️ GPU Detection failed, defaulting to CPU');
    hasGpu = false;
  }
}

function findBinary(nativeSubpath) {
  const devRoot = path.join(process.cwd());
  const packagedRoot = process.resourcesPath;
  const portableRoot = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);

  const whisperNames = ['whisper-cli.exe', 'whisper.exe', 'main.exe', 'whisper-cli', 'whisper'];
  const llamaNames = ['llama-cli.exe', 'llama-simple.exe', 'llama-cli', 'llama-simple', 'main.exe', 'main'];

  const candidates = [];
  // Dev paths
  candidates.push(path.join(devRoot, 'native', nativeSubpath, 'build', 'bin', 'Release'));
  candidates.push(path.join(devRoot, 'native', nativeSubpath, 'build', 'bin'));
  candidates.push(path.join(devRoot, 'native', nativeSubpath));

  // Packaged paths (inside the internal app structure)
  candidates.push(path.join(packagedRoot, 'native', nativeSubpath, 'build', 'bin', 'Release'));
  candidates.push(path.join(packagedRoot, 'native', nativeSubpath, 'build', 'bin'));
  candidates.push(path.join(packagedRoot, 'native', nativeSubpath));

  // External paths (next to the .exe for side-loading large models)
  candidates.push(path.join(portableRoot, 'native', nativeSubpath));
  candidates.push(path.join(portableRoot, 'native', nativeSubpath, 'models'));

  const tryNames = nativeSubpath.toLowerCase().includes('whisper') ? whisperNames : nativeSubpath.toLowerCase().includes('llama') ? llamaNames : ['main.exe', 'main'];

  for (const base of candidates) {
    for (const name of tryNames) {
      const p = path.join(base, name);
      try {
        if (fs.existsSync(p)) return p;
      } catch (e) { }
    }
  }

  return path.join(devRoot, 'native', nativeSubpath);
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  
  // Try both possible locations for the icon (dev vs packaged)
  let iconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, '..', 'dist', 'favicon.ico');
  }

  // Windows handles .ico files best when given the raw path string
  const browserIcon = process.platform === 'win32' && iconPath.endsWith('.ico') 
    ? iconPath 
    : (fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined);
  
  console.log('[Main] 🛠️  Initializing Window...');
  console.log('[Main] 🛠️  Target Preload Path:', preloadPath);
  console.log('[Main] 🛠️  Icon Path:', iconPath, 'Exists:', fs.existsSync(iconPath));

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: browserIcon,
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
    console.log(`[Main] ✅ Window finished loading. nativeApi detected: ${hasApi}`);
  });

  const devUrl = "http://127.0.0.1:8080";
  console.log('[Main] 🌐 Load Target:', devUrl);

  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }

  if (devUrl) {
    win.loadURL(devUrl).catch((e) => {
      console.error('[Main] ❌ Failed to load dev url, falling back to local files', e);
      loadLocalFile(win);
    });
  } else {
    loadLocalFile(win);
  }
}

function loadLocalFile(win) {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  console.log('[Main] 📁 Loading Local Build:', indexPath);
  if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath).catch((e) => console.error('[Main] ❌ Failed to load index.html', e));
  } else {
    console.error('[Main] ⚠️ dist/index.html NOT FOUND!');
    win.loadURL(`data:text/html,<h1>No Build Found</h1><p>Please run <code>npm run build</code> first to use Electron without a dev server.</p>`);
  }
}

app.whenReady().then(async () => {
  console.log('[Main] 🚀 App is ready.');
  await detectGpu();
  createWindow();


  // Initialize auto-updates
  autoUpdater.checkForUpdatesAndNotify();


  autoUpdater.on('update-available', () => {
    console.log('[Main] Update available.');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[Main] Update downloaded; will install in 5 seconds');
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 5000);
  });

  autoUpdater.on('error', (err) => {
    console.error('[Main] Error in auto-updater: ', err);
  });

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
    console.log(`[Main] 🏃 Executing Binary: ${path.basename(binaryPath)}`);
    console.log(`[Main] 📌 Args: ${args.join(' ')}`);
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
      console.log(`[Main] 🏁 Process "${processId || 'unknown'}" exited with status: ${status} (Code: ${code})`);

      if (error) {
        console.error(`[Main] ❌ Process Error:`, error);
        stderr += `\nProcess Error: ${String(error)}`;
      }

      resolve({ code: code ?? 0, stdout: stdout.trim(), stderr: stderr.trim() });
    };

    cp.on('close', (code, signal) => finish(code, signal));
    cp.on('exit', (code, signal) => finish(code, signal));
    cp.on('error', (err) => finish(1, null, err));

    if (cp.stdin) {
      if (inputBuffer) {
        console.log(`[Main] 📥 Writing ${inputBuffer.length} bytes to stdin`);
        cp.stdin.write(inputBuffer);
      }
      cp.stdin.end();
    }
  });
}

ipcMain.handle('whisper:transcribe', async (ev, audioPath, opts = {}) => {
  console.log(`[Main] 🎙️ Request: Transcribe File -> ${audioPath}`);
  const binary = findBinary('whisper');
  const args = [];

  // Try to find the local ggml model if none provided
  let modelPath = opts.model;
  if (!modelPath) {
    modelPath = getModelPath(path.join('native', 'whisper', 'models', 'ggml-base.en.bin'));
  } else if (!path.isAbsolute(modelPath)) {
    // If it's a relative path, resolve it through getModelPath
    modelPath = getModelPath(modelPath);
  }

  console.log(`[Main] 🧩 Using Model: ${modelPath || 'None (Default)'}`);
  if (modelPath) args.push('-m', modelPath);
  
  // Advanced Speed optimizations
  const totalCores = os.cpus().length;
  // Use a single processor with max threads to avoid model loading overhead
  const processors = 1;
  const threads = totalCores;

  args.push('-t', String(threads));
  args.push('-p', String(processors));
  args.push('-bs', '1');
  args.push('-bo', '1');
  args.push('-fa');  // Flash Attention
  args.push('-pp');  // Print progress
  args.push('-l', 'nl'); // Force Dutch language
  args.push('--no-fallback'); // Prevent looping
  if (hasGpu) {
    args.push('-oved', 'GPU'); 
    args.push('--device', '0'); // Explicitly target first GPU
  }
  
  args.push(audioPath);

  const res = await runBinary(binary, args, null, ev, 'whisper:progress', 'whisper');
  
  // Clean up whisper output: remove technical logs but keep segments with timestamps
  const cleanedStdout = (res.stdout || '')
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('whisper_')) return false;
      if (trimmed.startsWith('main:')) return false;
      if (trimmed.startsWith('system_info:')) return false;
      if (trimmed.startsWith('audio_')) return false;
      return true;
    })
    .join('\n')
    .trim();

  console.log(`[Main] ✨ Transcription finished. Length: ${cleanedStdout.length} chars`);
  return { success: res.code === 0, stdout: cleanedStdout, stderr: res.stderr };
});

ipcMain.handle('whisper:transcribe-buffer', async (ev, buffer, filename = 'audio.wav', opts = {}) => {
  console.log(`[Main] 🎙️ Request: Transcribe Buffer -> ${filename} (${buffer.byteLength} bytes)`);
  try {
    const tmpDir = app.getPath('temp');
    const tmpPath = path.join(tmpDir, `electron-whisper-${Date.now()}-${filename}`);
    await fs.promises.writeFile(tmpPath, Buffer.from(buffer));
    console.log(`[Main] 📁 Created temp file: ${tmpPath}`);

    const binary = findBinary('whisper');
    const args = [];

    let modelPath = opts.model;
    if (!modelPath) {
      modelPath = getModelPath(path.join('native', 'whisper', 'models', 'ggml-base.en.bin'));
    } else if (!path.isAbsolute(modelPath)) {
      modelPath = getModelPath(modelPath);
    }

    if (modelPath) args.push('-m', modelPath);
    
    // Advanced Speed optimizations
    const totalCores = os.cpus().length;
    // Use a single processor with max threads to avoid model loading overhead
    const processors = 1;
    const threads = totalCores;

    args.push('-t', String(threads));
    args.push('-p', String(processors));
    args.push('-bs', '1');
    args.push('-bo', '1');
    args.push('-fa');
    args.push('-pp');
    args.push('-l', 'nl');
    args.push('--no-fallback');
    if (hasGpu) {
      args.push('-oved', 'GPU');
      args.push('--device', '0');
    }

    args.push(tmpPath);

    const res = await runBinary(binary, args, null, ev, 'whisper:progress', 'whisper');

    try {
      await fs.promises.unlink(tmpPath);
      console.log(`[Main] 🗑️ Deleted temp file`);
    } catch (e) { }

    // Clean up whisper output: remove technical logs but keep segments with timestamps
    const cleanedStdout = (res.stdout || '')
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (trimmed.startsWith('whisper_')) return false;
        if (trimmed.startsWith('main:')) return false;
        if (trimmed.startsWith('system_info:')) return false;
        if (trimmed.startsWith('audio_')) return false;
        return true;
      })
      .join('\n')
      .trim();

    console.log(`[Main] ✨ Transcription finished. Length: ${cleanedStdout.length} chars`);
    return { success: res.code === 0, stdout: cleanedStdout, stderr: res.stderr };
  } catch (err) {
    console.error(`[Main] ❌ Buffer Transcription Error:`, err);
    return { success: false, stderr: String(err) };
  }
});

ipcMain.handle('llama:generate', async (ev, prompt, opts = {}) => {
  console.log(`[Main] 🧠 Request: Llama Generate -> Prompt Length: ${prompt.length}`);
  const binary = findBinary('llama');
  const args = [];

  // Model detection logic
  let modelPath = opts.modelPath;
  if (!modelPath) {
    modelPath = getModelPath(path.join('native', 'llama', 'models', 'Llama-3.2-1B-Instruct-Q4_K_M.gguf'));
  } else if (!path.isAbsolute(modelPath)) {
    modelPath = getModelPath(modelPath);
  }

  console.log(`[Main] 🧩 Using Model: ${modelPath || 'None (Default)'}`);
  if (modelPath) args.push('-m', modelPath);

  // CPU Optimization
  const threads = opts.threads || os.cpus().length;
  args.push('-t', String(threads));
  args.push('-tb', String(threads)); // threads for batch processing

  // GPU & Memory Optimization
  args.push('-ngl', 'auto'); // Auto-detect and offload layers to GPU if available
  args.push('-fa', 'auto');  // Enable Flash Attention if supported
  
  // Stable flags
  args.push('--temp', '0.2');
  args.push('--repeat-penalty', '1.1');
  args.push('--color', 'off');
  args.push('--no-display-prompt');
  args.push('-c', '4096');

  if (opts.hfRepo && !modelPath) args.push('-hf', opts.hfRepo);
  const nPredict = opts.n_predict || 1024;
  args.push('-n', String(nPredict));

  const finalPrompt = prompt;
  console.log(`[Main] 🏃 Starting Llama...`);

  let res;
  // Default to stdin for safety with long prompts, unless usePromptFlag is explicitly true
  if (opts.usePromptFlag === true) {
    args.push('-p', finalPrompt);
    res = await runBinary(binary, args, null, ev, 'llama:token', 'llama');
  } else {
    // Add explicitly -p - to read from stdin
    args.push('-p', '-');
    res = await runBinary(binary, args, finalPrompt, ev, 'llama:token', 'llama');
  }


  // Treat exit code 130 (SIGINT) as success if it likely finished naturally or was softly interrupted
  const success = res.code === 0 || res.code === 130;
  console.log(`[Main] ✨ Llama finished. Success: ${success}`);

  return { success, stdout: res.stdout, stderr: res.stderr };
});

ipcMain.handle('native:getDetectedModels', async () => {
  console.log(`[Main] 🧩 Request: Detect Models (Auto-Scan)`);
  // Try hardcoded paths first
  let whisperModel = getModelPath(path.join('native', 'whisper', 'models', 'ggml-base.en.bin'));
  let llamaModel = getModelPath(path.join('native', 'llama', 'models', 'Llama-3.2-1B-Instruct-Q4_K_M.gguf'));

  // If not found, scan the directory for ANY .bin or .gguf
  if (!whisperModel) {
    whisperModel = scanForModel('whisper', '.bin');
  }
  if (!llamaModel) {
    llamaModel = scanForModel('llama', '.gguf');
  }

  console.log(`[Main] 🧩 Detected Whisper: ${whisperModel || 'None'}`);
  console.log(`[Main] 🧩 Detected Llama: ${llamaModel || 'None'}`);

  return {
    whisper: whisperModel || null,
    llama: llamaModel || null
  };
});

ipcMain.handle('llama:stop', async () => {
  console.log(`[Main] 🛑 Request: Stop Llama`);
  const cp = runningProcesses.get('llama');
  if (cp) {
    cp.kill('SIGKILL');
    runningProcesses.delete('llama');
    return true;
  }
  return false;
});

// New model management handles
ipcMain.handle('models:getAvailable', async () => {
  return getAvailableModels();
});

ipcMain.handle('models:download', async (ev, modelId) => {
  console.log(`[Main] 📥 Request: Download Model -> ${modelId}`);
  const win = BrowserWindow.fromWebContents(ev.sender);
  return await downloadModel(modelId, win);
});

ipcMain.handle('models:checkPresence', async () => {
  return await checkModelsPresence();
});

ipcMain.handle('dialog:openFile', async (ev, opts = {}) => {
  console.log(`[Main] 📂 Request: Open File Dialog -> ${opts.title || 'Untitled'}`);
  const win = BrowserWindow.fromWebContents(ev.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    ...opts
  });
  if (result.canceled || result.filePaths.length === 0) {
    console.log(`[Main] 📂 Dialog Canceled`);
    return null;
  }
  console.log(`[Main] 📂 Selected: ${result.filePaths[0]}`);
  return result.filePaths[0];
});
