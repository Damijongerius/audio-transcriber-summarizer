export interface GenerationResult {
  text: string;
}

export async function generateText(prompt: string, opts?: { modelPath?: string; n_predict?: number }): Promise<GenerationResult> {
  if (typeof window !== 'undefined' && window.nativeApi?.llamaGenerate) {
    const res = await window.nativeApi.llamaGenerate(prompt, opts || { modelPath: opts?.modelPath, n_predict: opts?.n_predict });
    if (res.success && res.stdout) return { text: res.stdout };
    throw new Error(res.stderr || 'Native generation failed');
  }

  throw new Error('generateText is only available in the Electron app with nativeApi');
}

