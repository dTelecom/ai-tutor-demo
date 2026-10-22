import type { TranscriptEntry } from './types';

export interface TranscriptState {
  entries: TranscriptEntry[];
  draft: { key: string; text: string; revision: number; finalizing: boolean } | null;
  closed: string[];
}
export const initialTranscripts: TranscriptState = { entries: [], draft: null, closed: [] };

/** Replace hypotheses; only authoritative finals enter the conversation transcript. */
export function receiveTranscript(state: TranscriptState, value: unknown, now = Date.now()): TranscriptState {
  if (!value || typeof value !== 'object') return state;
  const msg = value as Record<string, unknown>;
  const correlated = typeof msg.utteranceId === 'string' && !!msg.utteranceId;
  const key = correlated ? JSON.stringify([msg.speaker ?? '', msg.utteranceId]) : 'legacy';
  const close = (id: string) => [...state.closed.filter(k => k !== id), id].slice(-256);

  if (msg.kind === 'partial_end') {
    if (!correlated) return state;
    if (msg.reason === 'finalizing') {
      return state.draft?.key === key ? { ...state, draft: { ...state.draft, finalizing: true } } : state;
    }
    if (!['discarded', 'replaced', 'reconfigured'].includes(String(msg.reason))) return state;
    return { ...state, closed: close(key), draft: state.draft?.key === key ? null : state.draft };
  }
  if (typeof msg.text !== 'string' || typeof msg.isAgent !== 'boolean') return state;
  if (correlated && state.closed.includes(key)) return state;
  if (msg.isInterim) {
    // Empty VAD activity must not erase a useful hypothesis.
    if (msg.isAgent || !msg.text.trim()) return state;
    const revision = typeof msg.revision === 'number' && Number.isInteger(msg.revision) ? msg.revision : 0;
    if (state.draft?.key === key && (state.draft.finalizing || (correlated && revision <= state.draft.revision))) return state;
    return { ...state, draft: { key, text: msg.text, revision, finalizing: false } };
  }
  const draft = !msg.isAgent && (!correlated || state.draft?.key === key) ? null : state.draft;
  const closed = !msg.isAgent && correlated ? close(key) : state.closed;
  if (!msg.text.trim()) return { ...state, draft, closed };
  const entry: TranscriptEntry = {
    id: `${key}-${now}-${state.entries.length}`,
    speaker: msg.isAgent ? 'tutor' : 'student', text: msg.text, timestamp: now,
  };
  return { entries: [...state.entries, entry], draft, closed };
}
