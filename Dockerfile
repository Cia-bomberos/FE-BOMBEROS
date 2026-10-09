# ---- deps: instala dependencias ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compila la app ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# El .env ya debe estar copiado en el contexto (ver Jenkinsfile) para que
# Next.js pueda inyectar las variables NEXT_PUBLIC_* en build time.
RUN npm run build

# ---- runner: imagen final ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Usuario no-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]