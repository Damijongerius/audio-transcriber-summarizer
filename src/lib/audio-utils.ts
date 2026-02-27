/**
 * Utility to convert various audio formats to 16kHz mono WAV in the browser.
 * This ensures compatibility with the Whisper native binary.
 */

export async function convertToWav(file: File): Promise<Blob> {
    const isElectron = typeof window !== 'undefined' && !!window.nativeApi;
    if (!isElectron) {
        console.warn("Native API not found, skipping audio conversion.");
        return new Blob([], { type: 'audio/wav' });
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass({
        sampleRate: 16000,
    });

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // For Whisper, we need 16kHz mono
    const numberOfChannels = 1;
    const length = audioBuffer.length * (16000 / audioBuffer.sampleRate);
    const sampleRate = 16000;

    // Create an offline context to process the conversion
    const offlineContext = new OfflineAudioContext(
        numberOfChannels,
        audioBuffer.duration * sampleRate,
        sampleRate
    );

    // Create a buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    // Render the audio
    const renderedBuffer = await offlineContext.startRendering();

    // Convert AudioBuffer to WAV format
    const wavBlob = audioBufferToWav(renderedBuffer);

    await audioContext.close();
    return wavBlob;
}

/**
 * Gets the duration of an audio file in seconds using AudioContext for better reliability.
 */
export async function getAudioDuration(file: File): Promise<number> {
    try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration;
        await audioContext.close();
        return duration;
    } catch (e) {
        console.error("Error getting audio duration:", e);
        return 0;
    }
}

/**
 * Encodes AudioBuffer into a WAV file Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const result = buffer.getChannelData(0); // We only need channel 0 for mono

    const bufferLength = result.length * 2;
    const headerLength = 44;
    const outBuffer = new ArrayBuffer(headerLength + bufferLength);
    const view = new DataView(outBuffer);

    // RIFF identifier 'RIFF'
    writeString(view, 0, 'RIFF');
    // file length minus RIFF identifier length and file description length
    view.setUint32(4, 36 + bufferLength, true);
    // RIFF type 'WAVE'
    writeString(view, 8, 'WAVE');
    // format chunk identifier 'fmt '
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, format, true);
    // channel count
    view.setUint16(22, numberOfChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numberOfChannels * 2, true);
    // bits per sample
    view.setUint16(34, bitDepth, true);
    // data chunk identifier 'data'
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, bufferLength, true);

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < result.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, result[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
