FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/qr-engine/package.json packages/qr-engine/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

FROM deps AS runtime
COPY packages/shared ./packages/shared
COPY packages/qr-engine ./packages/qr-engine
COPY apps/api ./apps/api
RUN mkdir -p /app/storage/temp/jobs && chown -R node:node /app/storage

USER node
ENV NODE_ENV=production \
    APP_PORT=3001 \
    HOST=0.0.0.0 \
    STORAGE_PATH=/app/storage \
    TEMP_PATH=/app/storage/temp
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.APP_PORT+'/api/v1/health').then(function(r){process.exit(r.ok?0:1)}).catch(function(){process.exit(1)})"

CMD ["node", "--import", "tsx", "apps/api/src/server.ts"]
