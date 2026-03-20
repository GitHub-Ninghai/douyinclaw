# Stage 1: Dependencies
FROM docker.1ms.run/node:20-alpine AS deps
WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json tsconfig.json tsconfig.build.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/tsconfig.build.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/web/package.json ./packages/web/

# Install pnpm
RUN corepack enable pnpm

# Install dependencies
RUN pnpm install

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build

# Stage 2: Build
FROM docker.1ms.run/node:20-alpine AS builder
WORKDIR /app

# Copy all source files
COPY . .

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/dist ./packages/shared/dist
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules

# Build
ENV NEXT_TELEMETRY_DISABLED 1
WORKDIR /app/packages/web
RUN corepack enable pnpm
RUN pnpm build

# Stage 3: Production
FROM docker.1ms.run/node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/packages/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./standalone
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./standalone/packages/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "standalone/packages/web/server.js"]
