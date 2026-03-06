import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatModelName(path: string | null | undefined) {
  if (!path) return "Default";
  const parts = path.split(/[\\/]/);
  const fileName = parts[parts.length - 1];
  return fileName.replace(/\.(bin|gguf)$/i, '').replace(/^ggml-/, '').replace(/-/g, ' ');
}
