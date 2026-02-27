import { useCallback, useState } from "react";
import { Upload, Music, X, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioUploaderProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
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
  "audio/x-m4a",
  "audio/mp4",
  "audio/webm",
];

const SUPPORTED_EXTENSIONS = ".mp3, .wav, .ogg, .flac, .m4a, .webm";

export function AudioUploader({ onFileSelect, selectedFiles, onClear }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = (files: FileList): File[] => {
    const validFiles: File[] = [];
    let hasError = false;

    Array.from(files).forEach(file => {
      if (SUPPORTED_FORMATS.includes(file.type) || file.name.endsWith('.m4a')) {
        validFiles.push(file);
      } else {
        hasError = true;
      }
    });

    if (hasError && validFiles.length === 0) {
      setError(`Some files are unsupported. Use: ${SUPPORTED_EXTENSIONS}`);
      return [];
    }

    setError(null);
    return validFiles;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) {
        onFileSelect(files);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? validateFiles(e.target.files) : [];
      if (files.length > 0) {
        onFileSelect(files);
      }
    },
    [onFileSelect]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (selectedFiles.length > 0) {
    return (
      <div className="glass-panel p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-primary" />
              <h3 className="font-medium">{selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onClear} className="h-8 gap-2 hover:bg-destructive/10 hover:text-destructive">
              <X className="w-4 h-4" />
              Clear All
            </Button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
            {selectedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 group">
                <div className="p-2 rounded bg-primary/10">
                  <Music className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ))}
          </div>
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
      className={`glass-panel-hover p-10 text-center cursor-pointer transition-all duration-300 ${isDragging ? "border-primary/50 bg-primary/5" : ""
        }`}
    >
      <input
        type="file"
        multiple
        accept={SUPPORTED_FORMATS.join(",")}
        onChange={handleFileInput}
        className="hidden"
        id="audio-upload"
      />
      <label htmlFor="audio-upload" className="cursor-pointer block">
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center transition-all duration-300 ${isDragging ? "scale-110 bg-primary/20" : ""
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
              {isDragging ? "Drop your files" : "Upload Audio Files"}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to browse (Multiple allowed)
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
