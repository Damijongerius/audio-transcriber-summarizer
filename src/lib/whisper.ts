import { extractAnalysisJson, AnalysisResult } from './jsonUtils';

export type { AnalysisResult };

export interface TranscriptionResult {
  text: string;
}

export async function transcribeAudio(
  file: File, 
  modelPath?: string,
  onSegment?: (segment: string) => void,
  onProgress?: (percent: number) => void
): Promise<TranscriptionResult> {
  const isElectron = typeof window !== 'undefined' && !!window.nativeApi;

  if (isElectron) {
    const arrayBuffer = await file.arrayBuffer();
    const performanceProfile = localStorage.getItem('performance-profile') || 'auto';
    
    const unsub = window.nativeApi.onWhisperProgress((data) => {
      if (data.trim()) {
        const lines = data.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Check for progress indicator: "progress = 10%"
          if (trimmed.includes('progress =')) {
            const match = trimmed.match(/progress\s*=\s*(\d+)%/);
            if (match && onProgress) {
              onProgress(parseInt(match[1], 10));
            }
            continue;
          }

          if (trimmed.startsWith('whisper_')) continue;
          if (trimmed.startsWith('main:')) continue;
          if (trimmed.startsWith('system_info:')) continue;
          if (trimmed.startsWith('audio_')) continue;
          
          if (onSegment) onSegment(line + '\n');
        }
      }
    });

    try {
      const res = await window.nativeApi.transcribeBuffer(arrayBuffer, file.name, {
        model: modelPath,
        performanceProfile: performanceProfile
      });
      if (res.success && res.stdout) {
        return { text: res.stdout };
      }
      throw new Error(res.stderr || 'Native transcription failed');
    } finally {
      unsub();
    }
  }

  console.warn("Native API not found, using placeholder transcription.");
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    text: `This is a placeholder transcription for "${file.name}".\n\nThe team discussed the new feature rollout and the need for better documentation. Sarah mentioned that the API should be ready by Tuesday. We also need to schedule a follow-up with the design team.`,
  };
}

export async function analyzeTranscription(
  text: string, 
  onStatus?: (msg: string) => void,
  onToken?: (fullOutput: string) => void,
  modelPath?: string,
  variantIndex: number = 0
): Promise<AnalysisResult> {
  const isElectron = typeof window !== 'undefined' && !!window.nativeApi;

  if (isElectron && text) {
    const variants = [
      "concise one-sentence summary and a standard list of action items",
      "detailed professional summary focusing on key decisions and a structured to-do list",
      "ultra-brief high-level overview and only the most critical 3 tasks",
      "comprehensive summary of all discussion points and a detailed checklist of next steps",
      "outcome-oriented summary focusing on goals and a list of specific assigned tasks",
      "technical summary of specific requirements and an engineering-focused task list",
      "executive summary for leadership and a list of strategic operational items",
      "chronological summary of events and a time-sensitive sequence of to-dos",
      "person-focused summary of who said what and a list of responsibilities by name",
      "bulleted summary of core themes and a comprehensive list of every mentioned action"
    ];

    const variant = variants[variantIndex % variants.length];

    const prompt = `
Return ONLY a valid JSON object. No other text. No preambles.

{
  "summary": "",
  "todos": []
}

Rules:
- Output MUST be valid JSON.
- "summary" must be EXACTLY one sentence long.
- "todos" must be a list of action items.
- Respond in the SAME LANGUAGE as the text below.
- Ignore timestamps during analysis.

Text to analyze:
${text}
`;

    if (onStatus) onStatus("🚀 Starting Llama analysis...");
    console.log("[Whisper.ts] Starting analysis with Llama (Native Test Mode).");
    
    let fullOutput = "";
    const unsub = window.nativeApi.onLlamaToken((token) => {
      fullOutput += token;
      if (onToken) onToken(fullOutput);
    });
    const unsubStderr = window.nativeApi.onLlamaTokenStderr((token) => {
      fullOutput += token;
      if (onToken) onToken(fullOutput);
    });

    try {
      const res = await window.nativeApi.llamaGenerate(prompt, { 
        usePromptFlag: true,
        n_predict: 2048,
        modelPath: modelPath
      });
      
      const combinedOutput = (res.stdout || "") + (res.stderr || "");
      const parsed = extractAnalysisJson(combinedOutput || fullOutput);
      
      if (parsed) {
        if (onStatus) onStatus("✅ Analysis successful. Applying results.");
        return parsed;
      }

      if (onStatus) onStatus("❌ Analysis failed to extract valid JSON.");
      console.error("[Whisper.ts] Analysis failed to find JSON result. Combined Output:", combinedOutput);
      throw new Error("AI Analysis failed to generate a valid summary. Check console for raw output.");
    } finally {
      unsub();
      unsubStderr();
    }
  }

  if (onStatus) onStatus("ℹ️ Native API not found, using placeholder analysis.");
  console.warn("Using placeholder analysis.");
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    summary: "Discussion about feature rollout and documentation requirements. Sarah confirmed API readiness for Tuesday.",
    todos: [
      { id: "1", text: "Update API documentation", completed: false },
      { id: "2", text: "Schedule design team follow-up", completed: false },
      { id: "3", text: "Verify API deployment on Tuesday", completed: false },
    ],
  };
}
