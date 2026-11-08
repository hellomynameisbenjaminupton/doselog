# Production Multi-Stage Dockerfile for DoseLog (ZimaBoard / CasaOS / Debian)
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application code and build client
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built frontend assets and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Expose app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/status', (r) => {if (r.statusCode !== 200) process.exit(1);});"

CMD ["npx", "tsx", "server.ts"]
