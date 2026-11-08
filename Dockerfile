# Lean Single-Stage Production Dockerfile for DoseLog (ZimaBoard / CasaOS / Debian)
# Avoids duplicating node_modules across multiple stages to save ZimaBoard eMMC disk space
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies (cached unless package.json changes)
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund && npm cache clean --force

# Copy application code and build frontend
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

# Expose app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/status', (r) => {if (r.statusCode !== 200) process.exit(1);});"

CMD ["npx", "tsx", "server.ts"]
