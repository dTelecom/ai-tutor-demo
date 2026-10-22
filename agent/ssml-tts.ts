import type { TTSPlugin } from '@dtelecom/agents-js';
import { LangDetectTTS } from './lang-detect-tts';

const escapeXML = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Interpret only the SDK's language markers. All spoken text remains literal XML text. */
export function tutorSSML(text: string, targetLanguage: 'es' | 'ja'): string {
  const source = text.replace(/\[(?:PASS|FAIL)\]/gi, '');
  const tags = /<lang\s+xml:lang="([^"]+)">([\s\S]*?)<\/lang>/g;
  let end = 0;
  let body = '';
  for (const match of source.matchAll(tags)) {
    if (match[1] !== 'en' && match[1] !== targetLanguage) throw new Error(`Unsupported tutor language: ${match[1]}`);
    body += escapeXML(source.slice(end, match.index));
    body += `<lang xml:lang="${match[1]}">${escapeXML(match[2])}</lang>`;
    end = match.index! + match[0].length;
  }
  body += escapeXML(source.slice(end));
  return `<speak xml:lang="en">${body}</speak>`;
}

/** One complete document per ready sentence, keeping language detection and cancellation. */
export class TutorSSMLTTS extends LangDetectTTS {
  constructor(private readonly provider: TTSPlugin, private readonly targetLanguage: 'es' | 'ja', private readonly onTargetLanguage?: () => void) {
    super(provider, [targetLanguage], 'en');
    if (!provider.synthesizeSSML) throw new Error('Tutor requires an SSML-capable TTS provider');
  }

  async *synthesize(text: string, signal?: AbortSignal): AsyncGenerator<Buffer> {
    if (signal?.aborted) return;
    const refined = this.refineText(text);
    if (!this.cleanText(refined).replace(/\[(?:PASS|FAIL)\]/gi, '').trim()) return;
    if (refined.includes(`<lang xml:lang="${this.targetLanguage}">`)) this.onTargetLanguage?.();
    yield* this.provider.synthesizeSSML!(tutorSSML(refined, this.targetLanguage), signal);
  }
}
