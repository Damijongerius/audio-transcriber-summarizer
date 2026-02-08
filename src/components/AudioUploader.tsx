import { useCallback, useState } from "react";
import { Upload, Music, X, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

const SUPPORTED_FORMATS = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/webm",
];

const SUPPORTED_EXTENSIONS = ".mp3, .wav, .ogg, .flac, .m4a, .webm";

export function AudioUploader({ onFileSelect, selectedFile, onClear }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setError(`Unsupported format. Please use: ${SUPPORTED_EXTENSIONS}`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (selectedFile) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center pulse-glow">
            <FileAudio className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground font-mono">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClear}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`glass-panel-hover p-10 text-center cursor-pointer transition-all duration-300 ${
        isDragging ? "border-primary/50 bg-primary/5" : ""
      }`}
    >
      <input
        type="file"
        accept={SUPPORTED_FORMATS.join(",")}
        onChange={handleFileInput}
        className="hidden"
        id="audio-upload"
      />
      <label htmlFor="audio-upload" className="cursor-pointer block">
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center transition-all duration-300 ${
              isDragging ? "scale-110 bg-primary/20" : ""
            }`}
          >
            {isDragging ? (
              <Music className="w-10 h-10 text-primary float" />
            ) : (
              <Upload className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-lg font-medium text-foreground mb-1">
              {isDragging ? "Drop your audio file" : "Upload Audio File"}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to browse
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2 font-mono">
              {SUPPORTED_EXTENSIONS}
            </p>
          </div>
        </div>
      </label>
      {error && (
        <p className="text-destructive text-sm mt-4">{error}</p>
      )}
    </div>
  );
}
