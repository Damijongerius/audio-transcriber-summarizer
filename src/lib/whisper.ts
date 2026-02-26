// Native Whisper & Llama integration for the main application
// Using src/types/electron.d.ts for type safety

export interface TranscriptionResult {
  text: string;
}

export async function transcribeAudio(file: File): Promise<TranscriptionResult> {
  const isElectron = typeof window !== 'undefined' && !!window.nativeApi;

  if (isElectron) {
    const arrayBuffer = await file.arrayBuffer();
    // Default to auto-detected model if available in main.js
    const res = await window.nativeApi.transcribeBuffer(arrayBuffer, file.name);
    if (res.success && res.stdout) {
      return { text: res.stdout };
    }
    throw new Error(res.stderr || 'Native transcription failed');
  }

  // Fallback for development/browser testing
  console.warn("Native API not found, using placeholder transcription.");
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    text: `This is a placeholder transcription for "${file.name}".\n\nThe team discussed the new feature rollout and the need for better documentation. Sarah mentioned that the API should be ready by Tuesday. We also need to schedule a follow-up with the design team.`,
  };
}

export interface AnalysisResult {
  summary: string;
  todos: Array<{ id: string; text: string; completed: boolean }>;
}

export async function analyzeTranscription(text: string): Promise<AnalysisResult> {
  const isElectron = typeof window !== 'undefined' && !!window.nativeApi;

  if (isElectron && text) {
    const prompt = `You are a helpful assistant that summarizes recordings and extracts actionable tasks.
Please analyze the following transcript.
Respond ONLY with a JSON object in exactly this format:
Respond ONLY with a JSON object.

Transcript:
${text}

### RESPONSE:
{`;

    console.log("[Whisper.ts] Starting analysis with Llama. Prompt length:", prompt.length);
    const res = await window.nativeApi.llamaGenerate(prompt) as any;
    console.log("[Whisper.ts] Llama API Call Finished.");
    const combinedOutput = (res.stdout || "") + (res.stderr || "");
    console.log("[Whisper.ts] FULL COMBINED OUTPUT (for debugging):", combinedOutput);
    console.log("[Whisper.ts] RAW LLAMA OUTPUT LENGTH:", combinedOutput.length);

    if (combinedOutput) {
      const sentinel = "### RESPONSE:";
      const sentinelIndex = combinedOutput.indexOf(sentinel);

      const candidates = [];
      if (sentinelIndex !== -1) {
        const afterSentinel = combinedOutput.substring(sentinelIndex + sentinel.length);
        // Add version with prepended brace (in case AI didn't echo it)
        candidates.push("{" + afterSentinel);
        // Add version without prepended brace (in case AI echoed it)
        candidates.push(afterSentinel);
        console.log("[Whisper.ts] sentinel found at index:", sentinelIndex);
      }
      candidates.push(combinedOutput); // Always try the full output as backup

      for (const targetContent of candidates) {
        console.log("[Whisper.ts] Scanning candidate content (length):", targetContent.length);
        const blocks = targetContent.split(/\{/);
        for (let i = blocks.length - 1; i >= 1; i--) {
          // Handle case where AI echoes the brace or starts with a duplicate
          let potentialJson = blocks[i].trim().startsWith('{') ? blocks[i] : '{' + blocks[i];
          const lastBrace = potentialJson.lastIndexOf('}');
          if (lastBrace === -1) continue;

          const jsonStr = potentialJson.substring(0, lastBrace + 1);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed && (parsed.summary || parsed.todos)) {
              console.log("[Whisper.ts] Valid JSON isolated and parsed successfully!");
              return {
                summary: parsed.summary || "No summary generated.",
                todos: (parsed.todos || []).map((t: any, i: number) => ({
                  id: (t && t.id) || String(i + 1),
                  text: (t && (t.text || t.task || t.item)) || String(t),
                  completed: !!(t && (t.completed || t.done || t.status === 'completed'))
                }))
              };
            }
          } catch (e) {
            // Ignore and continue scanning
          }
        }
      }

      // If we reach here, we failed to get JSON.
      // Throw an error so the UI (Index.tsx) can show it in a Toast.
      console.error("[Whisper.ts] Analysis failed to find JSON result. Combined Output:", combinedOutput);
      throw new Error("AI Analysis failed to generate a valid summary. Check console for raw output.");
    } else {
      console.error("[Whisper.ts] Llama returned completely empty output.");
      throw new Error("AI Analysis failed: Llama returned empty output.");
    }
  }

  // Fallback for development or if Llama fails
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
