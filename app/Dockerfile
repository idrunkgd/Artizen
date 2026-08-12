# syntax=docker/dockerfile:1
# Build et runtime Artizen pour Coolify (compatible Scaleway).
# Multi-stage : deps -> builder -> runner (image finale reduite).
# Gestionnaire de paquets : pnpm (lockfile v9, node-linker=hoisted).

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@10
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# --- deps : installe toutes les dependances (dev incluses) ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# --- builder : genere le client Prisma puis build Next.js ---
FROM base AS builder
WORKDIR /app
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# --- runner : image finale, output standalone Next.js ---
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl wget
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN mkdir -p /data/photos && chown -R nextjs:nodejs /data
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_STORAGE_PATH=/data/photos

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --chown=nextjs:nodejs prisma ./prisma

USER nextjs
EXPOSE 3000
CMD sh -c "node node_modules/prisma/build/index.js migrate deploy && node server.js"
