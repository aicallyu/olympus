import { useState, useRef, useCallback } from 'react';

function getSupportedMimeType(): string {
  const types = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ''; // let browser choose default
}

function getExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType || 'audio/webm';

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setIsRecording(true);
      setDuration(0);

      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      throw new Error('Microphone access denied. Please allow microphone access and try again.');
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        reject(new Error('No active recording'));
        return;
      }

      recorder.onstop = () => {
        const mimeType = mimeTypeRef.current;
        const ext = getExtension(mimeType);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        // Attach extension info for the caller
        (blob as any)._ext = ext;
        resolve(blob);
      };

      recorder.onerror = () => {
        setIsRecording(false);
        reject(new Error('Recording failed'));
      };

      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      mediaRecorderRef.current = null;
    });
  }, []);

  return { isRecording, duration, startRecording, stopRecording };
}
