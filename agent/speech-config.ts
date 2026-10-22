export const DEFAULT_LLM_MODEL = 'openai/gpt-6-luna';

export function tutorLLMSettings(model = DEFAULT_LLM_MODEL) {
  model = model.trim() || DEFAULT_LLM_MODEL;
  return {
    model,
    maxTokens: 1024,
    providerRouting: { sort: 'latency', requireParameters: true },
    ...(model === DEFAULT_LLM_MODEL ? { reasoningEffort: 'none' as const, temperature: null } : {}),
  };
}

export function tutorVoices(language: 'es' | 'ja') {
  // Supertonic F1 supports all three tutor languages with the same voice identity.
  return { en: { voice: 'F1', langCode: 'en' }, [language]: { voice: 'F1', langCode: language } };
}
