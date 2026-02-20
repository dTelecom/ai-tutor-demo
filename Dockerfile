FROM node:22-slim AS base

# Install dependencies needed for native modules (better-sqlite3 etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install dependencies ─────────────────────────────────────────────────────
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Copy source + build Next.js ──────────────────────────────────────────────
COPY . .
RUN npm run build

# ── Production image ─────────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Create data directory for SQLite persistence (mount volume here)
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

# Copy everything needed at runtime
COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/agent ./agent
COPY --from=base /app/lessons ./lessons
COPY --from=base /app/lib ./lib
COPY --from=base /app/app ./app
COPY --from=base /app/components ./components
COPY --from=base /app/next.config.ts ./
COPY --from=base /app/tsconfig.json ./
COPY --from=base /app/postcss.config.mjs ./

EXPOSE 3000

CMD ["sh", "-c", "npx next start -p ${PORT:-3000}"]
