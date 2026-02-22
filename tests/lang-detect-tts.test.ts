import { describe, it, expect, beforeAll } from 'vitest';
import { LangDetectTTS } from '../agent/lang-detect-tts';

// Minimal TTSPlugin stub — we only test refineText(), not actual synthesis.
const stubTTS = {
  async *synthesize() { /* noop */ },
  defaultLanguage: 'en',
  cleanText: (t: string) => t,
} as any;

describe('LangDetectTTS.refineText', () => {
  const wrapper = new LangDetectTTS(stubTTS, ['es']);

  beforeAll(async () => {
    await wrapper.warmup();
  });

  it('detects a single Spanish word in English text', () => {
    const input = 'In Spanish, to say hello casually, you say hola Now, imagine it is morning.';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="es">hola</lang>');
    // "hello" should NOT be tagged as Spanish
    expect(result).not.toContain('<lang xml:lang="es">hello</lang>');
  });

  it('groups consecutive Spanish words', () => {
    const input = 'Can you say buenos días to me?';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="es">buenos días</lang>');
  });

  it('detects "gracias" in English text', () => {
    const input = 'Can you say gracias?';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="es">gracias</lang>');
  });

  it('preserves existing <lang> tags unchanged', () => {
    const input = 'Say <lang xml:lang="es">hola</lang> to greet someone.';
    const result = wrapper.refineText(input);
    expect(result).toBe(input);
  });

  it('does not tag common English words as Spanish', () => {
    const input = 'Now, imagine it is morning. How would you greet me then?';
    const result = wrapper.refineText(input);
    // Should have no <lang> tags — all English
    expect(result).not.toContain('<lang');
  });

  it('does not tag cognates/ambiguous words', () => {
    const input = 'The animal at the hotel was perfect.';
    const result = wrapper.refineText(input);
    expect(result).not.toContain('<lang');
  });

  it('does not tag short words like "no", "me", "a"', () => {
    const input = 'No, tell me a story.';
    const result = wrapper.refineText(input);
    expect(result).not.toContain('<lang');
  });

  it('handles text with only existing tags', () => {
    const input = '<lang xml:lang="es">buenos días</lang>';
    const result = wrapper.refineText(input);
    expect(result).toBe(input);
  });

  it('handles mixed tagged and untagged with detection', () => {
    const input = 'Good morning is <lang xml:lang="es">buenos días</lang> and goodbye is adiós';
    const result = wrapper.refineText(input);
    // Existing tag preserved, "adiós" should be detected
    expect(result).toContain('<lang xml:lang="es">buenos días</lang>');
    expect(result).toContain('<lang xml:lang="es">adiós</lang>');
  });

  it('handles empty text', () => {
    expect(wrapper.refineText('')).toBe('');
  });

  it('handles text with no foreign words', () => {
    const input = 'Hello, how are you doing today?';
    const result = wrapper.refineText(input);
    expect(result).toBe(input);
  });
});

describe('LangDetectTTS.refineText (neighbor expansion)', () => {
  const wrapper = new LangDetectTTS(stubTTS, ['es']);

  beforeAll(async () => {
    await wrapper.warmup();
  });

  it('expands "tardes" next to detected "buenas"', () => {
    // "buenas" (0.813) is detected, "tardes" (0.635) is borderline but adjacent
    const input = 'In the afternoon, we say buenas tardes for good afternoon.';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="es">buenas tardes</lang>');
  });

  it('expands "noches" next to detected "buenas"', () => {
    const input = 'At night you say buenas noches to say goodnight.';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="es">buenas noches</lang>');
  });

  it('does not expand "hello" even next to a Spanish word', () => {
    // "hello" (0.603) is below NEIGHBOR_THRESHOLD (0.62)
    const input = 'hola means hello in English.';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="es">hola</lang>');
    expect(result).not.toContain('hello</lang>');
  });

  it('does not expand unrelated English words next to Spanish', () => {
    const input = 'Try saying gracias when someone helps you.';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="es">gracias</lang>');
    // "saying" and "when" should NOT be pulled in
    expect(result).not.toContain('saying</lang>');
    expect(result).not.toContain('when</lang>');
  });

  it('expands short word "Me" next to detected "llamo"', () => {
    // "Me" (2 chars) is below MIN_WORD_LENGTH but "Me llamo" is clearly Spanish
    const input = 'Try saying Me llamo followed by your name.';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="es">Me llamo</lang>');
  });

  it('does not expand English "my" next to Spanish "amigo"', () => {
    const input = 'He is my amigo from school.';
    const result = wrapper.refineText(input);
    // "amigo" should be tagged, but "my" should NOT be included
    expect(result).toContain('<lang xml:lang="es">amigo</lang>');
    expect(result).not.toContain('my amigo</lang>');
  });
});

describe('LangDetectTTS.refineText (Japanese)', () => {
  const wrapper = new LangDetectTTS(stubTTS, ['ja']);

  beforeAll(async () => {
    await wrapper.warmup();
  });

  it('detects Japanese characters via Unicode script', () => {
    const input = 'In Japanese, hello is こんにちは which is a common greeting.';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="ja">こんにちは</lang>');
  });

  it('groups consecutive Japanese words', () => {
    const input = 'Try saying おはよう ございます in the morning.';
    const result = wrapper.refineText(input);
    expect(result).toContain('<lang xml:lang="ja">おはよう ございます</lang>');
  });
});
