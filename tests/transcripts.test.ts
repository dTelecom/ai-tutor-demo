import { describe, it, expect } from 'vitest';
import { initialTranscripts, receiveTranscript } from '../lib/transcripts';
const partial = (id: string, revision: number, text: string) => ({ text, isAgent: false, isInterim: true, utteranceId: id, revision, speaker: 'student' });
const end = (id: string, reason: string) => ({ kind: 'partial_end', utteranceId: id, reason, speaker: 'student' });
const final = (id: string, text: string) => ({ text, isAgent: false, utteranceId: id, speaker: 'student' });

describe('Replaceable provisional transcripts', () => {
  it('replaces revisions without creating chat entries and commits only the final', () => {
    let state = receiveTranscript(initialTranscripts, partial('a', 1, 'Hel'));
    state = receiveTranscript(state, partial('a', 2, 'Hello there'));
    expect(state.entries).toHaveLength(0);expect(state.draft?.text).toBe('Hello there');
    state = receiveTranscript(state, partial('a', 1, 'old'));
    state = receiveTranscript(state, { text: '', isInterim: true, isAgent: false });
    expect(state.draft?.text).toBe('Hello there');
    state = receiveTranscript(state, end('a', 'finalizing'));
    expect(state.draft?.finalizing).toBe(true);
    state = receiveTranscript(state, final('a', 'Hello!'));
    expect(state.draft).toBeNull();expect(state.entries.map(e => e.text)).toEqual(['Hello!']);
    expect(receiveTranscript(state, partial('a', 3, 'late'))).toBe(state);
    expect(receiveTranscript(state, final('a', 'duplicate'))).toBe(state);
  });
  it.each(['discarded', 'reconfigured', 'replaced'])('clears %s drafts and prevents their return', reason => {
    let state = receiveTranscript(initialTranscripts, partial('a', 1, 'noise'));
    state = receiveTranscript(state, end('a', reason));
    expect(state.draft).toBeNull();expect(state.entries).toHaveLength(0);
    expect(receiveTranscript(state, partial('a', 2, 'late'))).toBe(state);
  });
  it('does not clear a newer utterance when an older one ends or finalizes', () => {
    let state = receiveTranscript(initialTranscripts, partial('b', 1, 'New speech'));
    state = receiveTranscript(state, end('a', 'discarded'));
    state = receiveTranscript(state, final('c', 'Earlier speech'));
    expect(state.draft?.text).toBe('New speech');
  });
  it('supports existing provider interims without correlation IDs', () => {
    let state = receiveTranscript(initialTranscripts, { text: 'Good', isAgent: false, isInterim: true });
    state = receiveTranscript(state, { text: 'Good morning', isAgent: false, isInterim: true });
    state = receiveTranscript(state, { text: 'Good morning.', isAgent: false });
    expect(state.draft).toBeNull();expect(state.entries).toHaveLength(1);
  });
  it('ignores malformed payloads', () => {
    expect(receiveTranscript(initialTranscripts, null)).toBe(initialTranscripts);
    expect(receiveTranscript(initialTranscripts, { text: 2, isAgent: true })).toBe(initialTranscripts);
  });
});
