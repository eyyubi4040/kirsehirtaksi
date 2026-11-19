# =========================================================================
# KIRŞEHİR TAKSİ (kirsehirtaksi.net) - DOKPLOY DOCKERFILE
# Ultra-lightweight Bun runtime container
# =========================================================================

FROM oven/bun:alpine AS runner

WORKDIR /app

# Copy project files
COPY package.json ./
COPY server ./server
COPY data ./data
COPY assets ./assets
COPY index.html ./
COPY fiyat-hesapla.html ./
COPY duraklar.html ./
COPY hizmetler.html ./
COPY iletisim.html ./
COPY 404.html ./
COPY sitemap.xml ./
COPY robots.txt ./
COPY favicon.ico ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "start"]
