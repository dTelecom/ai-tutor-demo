/**
 * LangDetectTTS — TTSPlugin wrapper that detects foreign words in untagged
 * text and wraps them with SSML <lang> tags before forwarding to the inner
 * TTS provider.
 *
 * The LLM already outputs structured language segments (~90% correct), but
 * sometimes puts foreign words inside default-language segments. This wrapper
 * catches those cases by running word-level language detection.
 *
 * Uses `eld` (Efficient Language Detector) for n-gram based detection and
 * `Intl.Segmenter` for Unicode-aware word splitting.
 */

import type { TTSPlugin } from '@dtelecom/agents-js';

// Score threshold: word must score above this for the target language.
// Tuned so that "hola" (0.679) passes but "hello" (0.603) doesn't.
const SCORE_THRESHOLD = 0.65;

// Lower threshold for neighbor expansion: borderline words adjacent to
// already-detected foreign words are included if they score above this.
// Catches "tardes" (0.635) next to "buenas" (0.813) while excluding "hello" (0.603).
const NEIGHBOR_THRESHOLD = 0.62;

// If both target and default language score, require this minimum gap.
const MIN_GAP = 0.3;

// Relaxed gap for neighbor expansion — positional context provides evidence.
const NEIGHBOR_MIN_GAP = 0.1;

// Minimum word length for detection (1-2 char words are too ambiguous).
const MIN_WORD_LENGTH = 3;

// Gap required when expanding short words via combined-phrase detection.
// "Me llamo" gap=0.235 passes, "my amigo" gap=0.118 fails.
const SHORT_WORD_GAP = 0.15;

// Unicode ranges for Japanese scripts (Hiragana, Katakana, CJK Unified).
const JAPANESE_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/;

// Matches existing <lang ...>...</lang> tags (non-greedy).
const LANG_TAG_RE = /<lang\s+xml:lang="([^"]+)">([\s\S]*?)<\/lang>/g;

const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });

// eld instance — loaded lazily via dynamic import() because eld is ESM-only
// and tsx resolves subpath exports through CJS which can't find 'eld/large'.
let _eld: any = null;

async function loadEld(): Promise<any> {
  if (!_eld) {
    const mod = await import('eld/large');
    _eld = mod.eld;
  }
  return _eld;
}

export class LangDetectTTS implements TTSPlugin {
  private inner: TTSPlugin;
  private targetLangs: string[];
  private defaultLang: string;
  private langSubset: string[];
  private eld: any = null;

  constructor(inner: TTSPlugin, targetLangs: string[], defaultLang = 'en') {
    this.inner = inner;
    this.targetLangs = targetLangs;
    this.defaultLang = defaultLang;
    this.langSubset = [defaultLang, ...targetLangs];
  }

  get defaultLanguage(): string | undefined {
    return this.inner.defaultLanguage;
  }

  cleanText(text: string): string {
    return this.inner.cleanText ? this.inner.cleanText(text) : text;
  }

  async warmup(): Promise<void> {
    // Load eld lazily via dynamic import (ESM-only package).
    this.eld = await loadEld();
    this.eld.setLanguageSubset(this.langSubset);
    if (this.inner.warmup) await this.inner.warmup();
  }

  async *synthesize(text: string, signal?: AbortSignal): AsyncGenerator<Buffer> {
    const refined = this.refineText(text);
    yield* this.inner.synthesize(refined, signal);
  }

  /**
   * Detect foreign words in untagged portions of text and wrap them
   * with <lang> SSML tags. Already-tagged portions pass through unchanged.
   * If eld hasn't been loaded yet (warmup not called), returns text unchanged.
   */
  refineText(text: string): string {
    if (!this.eld) return text;

    // Split text into tagged and untagged portions.
    const parts: Array<{ type: 'tagged' | 'untagged'; text: string }> = [];
    let lastIndex = 0;

    // Reset the regex state (it has the global flag).
    LANG_TAG_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = LANG_TAG_RE.exec(text)) !== null) {
      // Untagged text before this match.
      if (match.index > lastIndex) {
        parts.push({ type: 'untagged', text: text.slice(lastIndex, match.index) });
      }
      // The matched <lang> tag passes through.
      parts.push({ type: 'tagged', text: match[0] });
      lastIndex = match.index + match[0].length;
    }

    // Remaining untagged text after the last tag.
    if (lastIndex < text.length) {
      parts.push({ type: 'untagged', text: text.slice(lastIndex) });
    }

    // Process untagged portions.
    return parts
      .map((p) => (p.type === 'tagged' ? p.text : this.processUntagged(p.text)))
      .join('');
  }

  /**
   * Process untagged text: split into words, detect language per word,
   * group consecutive foreign words, wrap in <lang> tags.
   */
  private processUntagged(text: string): string {
    // Split into word segments using Intl.Segmenter.
    const segments = Array.from(segmenter.segment(text));

    // Classify each segment.
    const classified: Array<{ text: string; lang: string | null; isWord: boolean }> = [];

    for (const seg of segments) {
      if (!seg.isWordLike) {
        // Punctuation, whitespace — keep as-is.
        classified.push({ text: seg.segment, lang: null, isWord: false });
      } else {
        const detected = this.detectWord(seg.segment);
        classified.push({ text: seg.segment, lang: detected, isWord: true });
      }
    }

    // Neighbor expansion: borderline words adjacent to detected foreign words
    // are re-tested at a lower threshold. Catches "buenas tardes" where "tardes"
    // (0.635) alone is below SCORE_THRESHOLD but is clearly part of the phrase.
    this.expandNeighbors(classified);

    // Group consecutive foreign words (same language) and wrap with <lang> tags.
    let result = '';
    let foreignBuf: string[] = [];
    let foreignLang: string | null = null;

    const flushForeign = () => {
      if (foreignBuf.length > 0 && foreignLang) {
        result += `<lang xml:lang="${foreignLang}">${foreignBuf.join('')}</lang>`;
        foreignBuf = [];
        foreignLang = null;
      }
    };

    for (const item of classified) {
      if (!item.isWord) {
        // Non-word (space/punctuation): if we're in a foreign group, include it.
        if (foreignLang !== null) {
          foreignBuf.push(item.text);
        } else {
          result += item.text;
        }
        continue;
      }

      if (item.lang && this.targetLangs.includes(item.lang)) {
        // Foreign word.
        if (foreignLang && foreignLang !== item.lang) {
          // Different foreign language — flush previous group.
          flushForeign();
        }
        foreignLang = item.lang;
        foreignBuf.push(item.text);
      } else {
        // Default language or undetected — flush any pending foreign group.
        if (foreignLang !== null) {
          // Don't include trailing whitespace in the foreign tag.
          const trailing: string[] = [];
          while (foreignBuf.length > 0 && !/[\w\p{L}]/u.test(foreignBuf[foreignBuf.length - 1])) {
            trailing.unshift(foreignBuf.pop()!);
          }
          flushForeign();
          result += trailing.join('');
        }
        result += item.text;
      }
    }

    // Flush remaining foreign buffer.
    if (foreignLang !== null) {
      const trailing: string[] = [];
      while (foreignBuf.length > 0 && !/[\w\p{L}]/u.test(foreignBuf[foreignBuf.length - 1])) {
        trailing.unshift(foreignBuf.pop()!);
      }
      flushForeign();
      result += trailing.join('');
    }

    return result;
  }

  /**
   * Neighbor expansion: for each undetected word adjacent to a detected
   * foreign word, re-test at a lower threshold. This catches phrases like
   * "buenas tardes" where "tardes" alone scores below SCORE_THRESHOLD.
   */
  private expandNeighbors(
    classified: Array<{ text: string; lang: string | null; isWord: boolean }>,
  ): void {
    let changed = true;
    // Iterate until no more expansions (handles chains like A-B-C where
    // A is detected, B is borderline, C is borderline).
    while (changed) {
      changed = false;
      for (let i = 0; i < classified.length; i++) {
        const item = classified[i];
        if (!item.isWord || item.lang !== null) continue;

        // Find nearest foreign word neighbor (skip spaces/punctuation).
        const neighbor = this.findNeighbor(classified, i);
        if (!neighbor) continue;

        if (item.text.length >= MIN_WORD_LENGTH) {
          // Normal-length word: re-test at lower threshold with relaxed gap.
          const detected = this.detectWordAt(item.text, NEIGHBOR_THRESHOLD, NEIGHBOR_MIN_GAP);
          if (detected && detected === neighbor.lang) {
            item.lang = detected;
            changed = true;
          }
        } else {
          // Short word (< 3 chars): test combined phrase with the neighbor.
          // "Me" alone is too short for eld, but "Me llamo" is clearly Spanish.
          // Skip for Japanese neighbors — different script, no mixing with Latin short words.
          if (JAPANESE_RE.test(neighbor.text)) continue;
          const combined = this.buildCombinedPhrase(item.text, neighbor.text, i, neighbor.index);
          if (this.detectCombinedPhrase(combined, neighbor.lang!)) {
            item.lang = neighbor.lang;
            changed = true;
          }
        }
      }
    }
  }

  /** Find the nearest foreign word neighbor, returning its index and details. */
  private findNeighbor(
    classified: Array<{ text: string; lang: string | null; isWord: boolean }>,
    index: number,
  ): { lang: string; text: string; index: number } | null {
    // Look backward.
    for (let j = index - 1; j >= 0; j--) {
      if (classified[j].isWord) {
        if (classified[j].lang && this.targetLangs.includes(classified[j].lang!)) {
          return { lang: classified[j].lang!, text: classified[j].text, index: j };
        }
        break;
      }
    }
    // Look forward.
    for (let j = index + 1; j < classified.length; j++) {
      if (classified[j].isWord) {
        if (classified[j].lang && this.targetLangs.includes(classified[j].lang!)) {
          return { lang: classified[j].lang!, text: classified[j].text, index: j };
        }
        break;
      }
    }
    return null;
  }

  /** Build combined phrase preserving word order. */
  private buildCombinedPhrase(word: string, neighborWord: string, wordIdx: number, neighborIdx: number): string {
    return wordIdx < neighborIdx ? `${word} ${neighborWord}` : `${neighborWord} ${word}`;
  }

  /**
   * Detect if a combined phrase (short word + neighbor) belongs to a target language.
   * Uses a stricter gap (SHORT_WORD_GAP) to avoid false positives like "my amigo".
   */
  private detectCombinedPhrase(phrase: string, expectedLang: string): boolean {
    this.eld.setLanguageSubset(this.langSubset);
    const result = this.eld.detect(phrase);
    if (result.language !== expectedLang) return false;

    const scores: Record<string, number> = result.getScores();
    const targetScore = scores[expectedLang] || 0;
    const defaultScore = scores[this.defaultLang] || 0;

    if (targetScore < NEIGHBOR_THRESHOLD) return false;
    if (defaultScore > 0 && targetScore - defaultScore < SHORT_WORD_GAP) return false;

    return true;
  }

  /**
   * Detect if a single word belongs to a target language.
   * Returns the language code (e.g. 'es', 'ja') or null if default/unknown.
   */
  private detectWord(word: string): string | null {
    return this.detectWordAt(word, SCORE_THRESHOLD, MIN_GAP);
  }

  /** Core detection with configurable threshold and gap. */
  private detectWordAt(word: string, threshold: number, minGap = MIN_GAP): string | null {
    // Japanese: detect by Unicode script (most reliable, no need for eld).
    if (this.targetLangs.includes('ja') && JAPANESE_RE.test(word)) {
      return 'ja';
    }

    // Skip very short words — too ambiguous for n-gram detection.
    if (word.length < MIN_WORD_LENGTH) return null;

    // eld is a module singleton — set the language subset before each detection
    // to ensure correct results when multiple LangDetectTTS instances exist.
    this.eld.setLanguageSubset(this.langSubset);

    const result = this.eld.detect(word);
    const scores: Record<string, number> = result.getScores();

    // Find the best-scoring target language.
    let bestLang: string | null = null;
    let bestScore = 0;
    for (const lang of this.targetLangs) {
      const score = scores[lang] || 0;
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }

    if (!bestLang || bestScore < threshold) return null;

    // If default language also scores, require a clear gap.
    const defaultScore = scores[this.defaultLang] || 0;
    if (defaultScore > 0 && bestScore - defaultScore < minGap) return null;

    return bestLang;
  }
}
