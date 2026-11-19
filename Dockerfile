# =========================================================================
# KIRŞEHİR TAKSİ (kirsehirtaksi.net) - DOKPLOY DOCKERFILE
# Production-ready Bun runtime container
# =========================================================================

FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Copy all project files
COPY . .

# Ensure data directory exists
RUN mkdir -p /app/data

EXPOSE 3000
EXPOSE 80

# Native Bun Healthcheck (Zero external dependency, explicit IPv4 loopback)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "server/index.ts"]
