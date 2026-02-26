# Audio Transcriber & Summarizer

A desktop application built with Electron, React, and Vite that allows you to transcribe audio files and generate summaries using Whisper and Llama models locally.

## Features

- **Local Processing**: Transcribe and summarize audio without uploading data to the cloud.
- **Whisper Integration**: High-accuracy speech-to-text conversion.
- **Llama Summarization**: Intelligent summarization of transcriptions.
- **Auto-Updates**: Automatically stay up-to-date with the latest releases from GitHub.

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- npm or bun

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Damijongerius/audio-transcriber-summarizer
   ```

2. Navigate to the project directory:
   ```sh
   cd audio-transcriber-summarizer
   ```

3. Install dependencies:
   ```sh
   npm install
   ```

### Development

Start the development server with auto-reloading:
```sh
npm run dev:all
```

### Building

Build and package the Electron app:
```sh
npm run electron:build
```

## Technologies Used

- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [Llama.cpp](https://github.com/ggerganov/llama.cpp)
