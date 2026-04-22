/**
 * 音频录制和播放服务
 * 使用 react-native-audio-api（Web Audio API 风格）
 */

import { AudioContext, AudioRecorder } from 'react-native-audio-api';

let audioContext: AudioContext | null = null;
let recorder: AudioRecorder | null = null;
let recordingStartTime = 0;
let currentSourceNode: any = null;

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/** 开始录音 */
export async function startRecording(): Promise<void> {
  const ctx = getContext();
  recorder = new AudioRecorder();
  recorder.enableFileOutput();
  const result = recorder.start();
  if (result.status === 'error') {
    throw new Error(result.message);
  }
  recordingStartTime = Date.now();
}

/** 停止录音，返回 { uri, duration } */
export async function stopRecording(): Promise<{ uri: string; duration: number }> {
  if (!recorder) {
    throw new Error('未在录音');
  }
  const result = recorder.stop();
  recorder = null;

  if (result.status === 'error') {
    throw new Error(result.message);
  }

  const fileInfo = result as any;
  const uri = fileInfo?.uri || fileInfo?.path || '';
  const duration = Math.round((Date.now() - recordingStartTime) / 1000); // 秒
  return { uri, duration };
}

/** 取消录音 */
export function cancelRecording(): void {
  if (recorder) {
    recorder.stop();
    recorder = null;
  }
}

/** 播放音频文件 */
export function playAudio(
  uri: string,
  onEnd?: () => void,
): void {
  stopPlayback();
  const ctx = getContext();

  try {
    const sourceNode = ctx.createBufferSource();
    currentSourceNode = sourceNode;
    sourceNode.onEnded = () => {
      currentSourceNode = null;
      onEnd?.();
    };
    sourceNode.connect(ctx.destination);

    // Fetch and decode audio data before starting playback
    fetch(uri)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        sourceNode.buffer = audioBuffer;
        sourceNode.start();
      })
      .catch(() => {
        currentSourceNode = null;
        onEnd?.();
      });
  } catch {
    onEnd?.();
  }
}

/** 停止播放 */
export function stopPlayback(): void {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
    } catch {
      // ignore
    }
    currentSourceNode = null;
  }
}

/** 检查是否正在播放 */
export function isPlaying(): boolean {
  return currentSourceNode !== null;
}
