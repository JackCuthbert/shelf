FROM node:26.8.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26.8.1-alpine AS builder
WORKDIR /app
ENV DATABASE_URL=file:/tmp/build.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build && npx tsc -p tsconfig.reset.json

FROM node:26.8.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/app.db
RUN apk add --no-cache su-exec
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=app:app /app/scripts ./scripts
COPY --from=builder --chown=app:app /app/src/generated ./src/generated
COPY --from=builder --chown=app:app /app/src/lib ./src/lib
COPY scripts/start.sh /usr/local/bin/shelf-start
RUN chmod +x /usr/local/bin/shelf-start
USER root
EXPOSE 3000
CMD ["/usr/local/bin/shelf-start"]
