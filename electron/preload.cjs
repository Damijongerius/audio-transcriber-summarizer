const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Preload script is initializing (CJS)...');

contextBridge.exposeInMainWorld('nativeApi', {
  transcribeFile: async (filePath, opts) => {
    return await ipcRenderer.invoke('whisper:transcribe', filePath, opts);
  },
  transcribeBuffer: async (buffer, filename, opts) => {
    return await ipcRenderer.invoke('whisper:transcribe-buffer', buffer, filename, opts);
  },
  llamaGenerate: async (prompt, opts) => {
    return await ipcRenderer.invoke('llama:generate', prompt, opts);
  },
  onWhisperProgress: (callback) => {
    const cb = (event, data) => callback(data);
    ipcRenderer.on('whisper:progress', cb);
    return () => ipcRenderer.removeListener('whisper:progress', cb);
  },
  onWhisperProgressStderr: (callback) => {
    const cb = (event, data) => callback(data);
    ipcRenderer.on('whisper:progress:stderr', cb);
    return () => ipcRenderer.removeListener('whisper:progress:stderr', cb);
  },
  onLlamaToken: (callback) => {
    const cb = (event, data) => callback(data);
    ipcRenderer.on('llama:token', cb);
    return () => ipcRenderer.removeListener('llama:token', cb);
  },
  onLlamaTokenStderr: (callback) => {
    const cb = (event, data) => callback(data);
    ipcRenderer.on('llama:token:stderr', cb);
    return () => ipcRenderer.removeListener('llama:token:stderr', cb);
  },
  openFile: async (opts) => {
    return await ipcRenderer.invoke('dialog:openFile', opts);
  },
  getDetectedModels: async () => {
    return await ipcRenderer.invoke('native:getDetectedModels');
  },
  llamaStop: async () => {
    return await ipcRenderer.invoke('llama:stop');
  },
});
