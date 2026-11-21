import { AudioTelemetry, DSPParams, StemInfo } from '../types/aether';

const SIDECAR_URL = 'http://127.0.0.1:8999';

export async function fetchTelemetry(): Promise<AudioTelemetry | null> {
  try {
    const res = await fetch(`${SIDECAR_URL}/api/telemetry`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchDSPState(): Promise<DSPParams | null> {
  try {
    const res = await fetch(`${SIDECAR_URL}/api/state`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchHistory(): Promise<any> {
  try {
    const res = await fetch(`${SIDECAR_URL}/api/history`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function sendAICoProducerPrompt(prompt: string, bpm: number, telemetry?: AudioTelemetry, currentParams?: DSPParams) {
  const res = await fetch(`${SIDECAR_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_prompt: prompt,
      bpm,
      telemetry,
      current_params: currentParams
    })
  });
  return await res.json();
}

export async function setParameter(id: string, value: number) {
  try {
    await fetch(`${SIDECAR_URL}/api/param`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, value })
    });
  } catch (e) {
    console.error('Failed to update parameter', e);
  }
}

export async function undoState() {
  const res = await fetch(`${SIDECAR_URL}/api/undo`, { method: 'POST' });
  return await res.json();
}

export async function redoState() {
  const res = await fetch(`${SIDECAR_URL}/api/redo`, { method: 'POST' });
  return await res.json();
}

export async function toggleAB() {
  const res = await fetch(`${SIDECAR_URL}/api/toggle-ab`, { method: 'POST' });
  return await res.json();
}

export async function generateStem(prompt: string, bpm: number, barLength: number, key: string): Promise<StemInfo> {
  const res = await fetch(`${SIDECAR_URL}/api/generate-stem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      bpm,
      bar_length: barLength,
      key
    })
  });
  return await res.json();
}
