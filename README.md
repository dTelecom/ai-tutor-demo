# AI Tutor Demo

AI-powered language tutor built with [dTelecom](https://dtelecom.org) voice agents. Students join a real-time voice session and practice conversational skills with an AI tutor.

Built with:
- **[@dtelecom/agents-js](https://github.com/dTelecom/agents-js)** — voice agent SDK (STT + LLM + TTS pipeline)
- **Next.js 16** — app router + API routes
- **Deepgram** — speech-to-text
- **OpenRouter** — LLM (GPT-4.1 Mini by default)
- **Cartesia** — text-to-speech

## Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/y2xtQc?referralCode=DaZ4Xt)

### Required environment variables

| Variable | Description |
|---|---|
| `API_KEY` | dTelecom API key ([cloud.dtelecom.org](https://cloud.dtelecom.org)) |
| `API_SECRET` | dTelecom API secret |
| `DEEPGRAM_API_KEY` | Deepgram API key ([deepgram.com](https://deepgram.com)) |
| `OPENROUTER_API_KEY` | OpenRouter API key ([openrouter.ai](https://openrouter.ai)) |
| `CARTESIA_API_KEY` | Cartesia API key ([cartesia.ai](https://cartesia.ai)) |

### Optional

| Variable | Default | Description |
|---|---|---|
| `LLM_MODEL` | `openai/gpt-4.1-mini` | OpenRouter model ID |
| `CARTESIA_VOICE_ID` | `a0e99841-...` | Cartesia voice ID |

## Run locally

```bash
# 1. Clone
git clone https://github.com/dTelecom/ai-tutor-demo.git
cd ai-tutor-demo

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Fill in your API keys in .env

# 4. Run
npm run dev
```

Open [http://localhost:3001](http://localhost:3001), pick a lesson, and start talking.

## License

Apache-2.0
