/**
 * Utilities for extracting and parsing JSON from AI model responses.
 */

export interface AnalysisResult {
    summary: string;
    todos: Array<{ id: string; text: string; completed: boolean }>;
}

interface RawTodo {
    id?: string;
    text?: string;
    action?: string;
    task?: string;
    item?: string;
    todo?: string;
    completed?: boolean;
    done?: boolean;
    status?: string;
}

/**
 * Attempts to extract and parse a JSON object from a potentially noisy string.
 * Scans for JSON-like blocks and validates them against the expected schema.
 */
export function extractAnalysisJson(input: string): AnalysisResult | null {
    if (!input) return null;

    let finalSummary = "";
    let finalTodos: RawTodo[] = [];

    // Helper to extract relevant data from a parsed object
    const collectData = (obj: Record<string, unknown>) => {
        if (!obj || typeof obj !== 'object') return;
        
        if (obj.summary && typeof obj.summary === 'string') {
            finalSummary = obj.summary;
        }
        
        const possibleTodos = obj.todos || obj.action_list || obj.tasks || obj.items;
        if (Array.isArray(possibleTodos)) {
            finalTodos = [...finalTodos, ...possibleTodos];
        }
    };

    // Strategy 1: Find all valid { ... } blocks in the entire string
    // This is most robust for models that might put multiple blocks or repeat parts
    let searchStart = 0;
    while (true) {
        const braceStart = input.indexOf('{', searchStart);
        if (braceStart === -1) break;
        
        // Find the last possible matching brace (greedy approach)
        const braceEnd = input.lastIndexOf('}');
        if (braceEnd === -1 || braceEnd <= braceStart) break;

        // Try to find the *correct* matching brace for this specific object
        // by iterating backwards from the end
        for (let i = braceEnd; i > braceStart; i--) {
            if (input[i] === '}') {
                const candidate = input.substring(braceStart, i + 1);
                try {
                    const parsed = JSON.parse(candidate);
                    collectData(parsed);
                    // If we found a block that has everything we need, we can stop
                    if (finalSummary && finalTodos.length > 0) break;
                } catch (e) {
                    // Try next candidate
                }
            }
        }
        
        searchStart = braceStart + 1;
        if (finalSummary && finalTodos.length > 0) break;
    }

    // If strategy 1 didn't find everything, try Strategy 2: Look for individual objects
    // split by any non-JSON characters
    if (!finalSummary || finalTodos.length === 0) {
        const objects = input.match(/\{[\s\S]*?\}/g) || [];
        for (const objStr of objects) {
            try {
                const parsed = JSON.parse(objStr);
                collectData(parsed);
            } catch (e) { 
                // Skip invalid JSON chunks
            }
        }
    }

    // Finally, format the results
    if (finalSummary || finalTodos.length > 0) {
        return {
            summary: finalSummary || "Summary extraction partial or failed.",
            todos: finalTodos.map((t, idx: number) => {
                let text = "";
                if (typeof t === 'string') text = t;
                else if (t && typeof t === 'object') {
                    const rt = t as RawTodo;
                    text = rt.text || rt.action || rt.task || rt.item || rt.todo || String(rt);
                }
                
                const todo = t as RawTodo;
                return {
                    id: (todo && todo.id) || String(idx + 1),
                    text: text,
                    completed: !!(todo && (todo.completed || todo.done || todo.status === 'completed'))
                };
            })
        };
    }

    return null;
}
