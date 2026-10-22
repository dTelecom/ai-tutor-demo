import { describe, it, expect, vi } from 'vitest';
import { TutorSSMLTTS, tutorSSML } from '../agent/ssml-tts';
import { tutorLLMSettings, tutorVoices } from '../agent/speech-config';

describe('Tutor server SSML', () => {
  it.each(['es', 'ja'] as const)('keeps %s routing while escaping spoken XML and removing lesson markers', (language) => {
    const xml = tutorSSML(`Say <lang xml:lang="${language}">hola & <break time="5s"/></lang> then 2 < 3. [PASS]`, language);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelectorAll('lang')).toHaveLength(1);
    expect(doc.querySelector('break')).toBeNull();
    expect(doc.documentElement.textContent).toContain('hola & <break time="5s"/>');
    expect(doc.documentElement.textContent).not.toContain('[PASS]');
    expect(tutorVoices(language)[language]).toEqual({ voice: 'F1', langCode: language });
  });
  it('rejects unexpected language routing', () => {
    expect(() => tutorSSML('<lang xml:lang="ru">Привет</lang>', 'es')).toThrow('Unsupported tutor language');
  });
  it('detects missed foreign words and forwards one intact document and abort signal', async () => {
    const documents: string[] = [];
    const signals: Array<AbortSignal | undefined> = [];
    const close = vi.fn();
    const plain = vi.fn(async function* () {});
    const inner = { sequential: true, defaultLanguage: 'en', synthesize: plain, close,
      async *synthesizeSSML(document: string, signal?: AbortSignal) { documents.push(document); signals.push(signal); yield Buffer.from('pcm'); },
    };
    const onTargetLanguage = vi.fn();
    const tts = new TutorSSMLTTS(inner, 'es', onTargetLanguage);
    await tts.warmup();
    const controller = new AbortController();
    const chunks = [];
    for await (const chunk of tts.synthesize('Please say hola.', controller.signal)) chunks.push(chunk);
    expect(documents).toHaveLength(1);
    expect(onTargetLanguage).toHaveBeenCalledOnce();
    expect(documents[0]).toContain('<lang xml:lang="es">hola</lang>');
    expect(documents[0]).not.toContain('<break');
    expect(signals).toEqual([controller.signal]);
    expect(chunks).toEqual([Buffer.from('pcm')]);
    expect(plain).not.toHaveBeenCalled();
    expect(tts.sequential).toBe(true);
    controller.abort();
    for await (const _ of tts.synthesize('cancelled', controller.signal)) { /* consume */ }
    for await (const _ of tts.synthesize('[PASS]')) { /* consume */ }
    expect(documents).toHaveLength(1);
    tts.close();expect(close).toHaveBeenCalledOnce();
  });
  it('configures Luna consistently with the agents application', () => {
    expect(tutorLLMSettings()).toMatchObject({ model: 'openai/gpt-6-luna', reasoningEffort: 'none', temperature: null, providerRouting: { requireParameters: true } });
    expect(tutorLLMSettings('custom')).not.toHaveProperty('reasoningEffort');
    expect(tutorLLMSettings('')).toEqual(tutorLLMSettings());
  });
});
