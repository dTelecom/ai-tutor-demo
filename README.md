# AI Tutor Demo

AI-powered language tutor built with [dTelecom](https://dtelecom.org) voice agents. Students join a real-time voice session and practice conversational skills with an AI tutor.

Built with:
- **[@dtelecom/agents-js](https://github.com/dTelecom/agents-js)** — voice agent SDK (STT + LLM + TTS pipeline)
- **Next.js 16** — app router + API routes
- **dTelecom STT** — streaming partials, authoritative finals and Smart Turn
- **OpenRouter** — LLM (`openai/gpt-6-luna` by default)
- **dTelecom Supertonic F1** — English, Spanish and Japanese speech through complete-request SSML
- Deepgram and Cartesia remain explicit alternative providers.

## Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/y2xtQc?referralCode=DaZ4Xt)

### Required environment variables

| Variable | Description |
|---|---|
| `WALLET_PRIVATE_KEY` | Wallet used to purchase dTelecom gateway sessions |
| `GATEWAY_URL` | `https://x402.dtelecom.org` |
| `OPENROUTER_API_KEY` | OpenRouter API key ([openrouter.ai](https://openrouter.ai)) |


### Optional

| Variable | Default | Description |
|---|---|---|
| `LLM_MODEL` | `openai/gpt-6-luna` | OpenRouter model ID; Luna uses explicit reasoning `none` and omits temperature |
| `STT_PROVIDER` | `dtelecom` | `deepgram` is also supported with `DEEPGRAM_API_KEY` |
| `TTS_PROVIDER` | `dtelecom` | `deepgram` or `cartesia` require their own API key |
| `API_KEY` / `API_SECRET` | unset | Optional direct WebRTC credentials; dTelecom speech still needs gateway credentials |
| `CARTESIA_VOICE_ID` | `a0e99841-...` | Cartesia voice ID |

## Deploy to a server (Docker + SSL)

Requires a VPS with Docker installed and a domain pointing to it.

```bash
# 1. Clone & configure
git clone https://github.com/dTelecom/ai-tutor-demo.git
cd ai-tutor-demo
cp .env.example .env
# Fill in your API keys in .env

# 2. Set your domain in nginx.conf
sed -i 's/YOUR_DOMAIN/yourdomain.com/g' nginx.conf

# 3. Get SSL certificate
# Temporarily comment out the HTTPS server block in nginx.conf, then:
docker compose up -d nginx
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d yourdomain.com
# Uncomment the HTTPS server block back

# 4. Start everything
docker compose up -d

# 5. Auto-renew SSL (add to crontab -e)
# 0 3 * * 1 cd /path/to/ai-tutor-demo && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
```

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

## Current speech path

Requires agents-js 0.5.0, x402-client 0.4.0 and server-sdk-node 0.2.6 (the lockfile
pins these registry releases). The TTS server must advertise `dtelecom-ssml-v1`.
The M4 release of 2026-10-22 enables this profile. No local SDK copies or npm
patches are needed after installing the published dependencies.

The LLM streams structured language segments. Each ready sentence is converted
to one escaped `<speak>` document, using Supertonic F1 across English and the
lesson language. Word detection still catches untagged foreign words. The server
handles `<lang>` pronunciation; the old automatic 200 ms switch pause is gone.
Unknown language routes are rejected, spoken XML is escaped, and lesson result
markers are not spoken. The adapter preserves sequential playback, cancellation
and socket cleanup. Student repetition still switches STT to forced-language
Whisper, then returns to automatic recognition after the student's final result.

The chat shows one temporary **You · Listening…** hypothesis. Revisions replace
that line, **Finishing…** retains it while awaiting the final, and the final
replaces it with a normal chat entry. Discard/reconfiguration removes the draft;
late revisions cannot restore a completed/discarded utterance. Partials never
create LLM turns or saved transcript entries. Logs include `STT ready`,
`STT partial` (utterance/revision) and `STT partial end`.

Existing deployments with an explicit old `LLM_MODEL` must update that variable
to `openai/gpt-6-luna` (or remove it to use the new default). Provider selections
stored in the browser remain respected. Select dTelecom STT/TTS to use this path.
