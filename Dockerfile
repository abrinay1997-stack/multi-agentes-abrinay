# ─── Stage 1: build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias primero (mejor cache de capas)
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/agent-system/package*.json ./apps/agent-system/
COPY apps/office-3d/package*.json ./apps/office-3d/

RUN npm ci --ignore-scripts

# Copiar fuentes
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Build: shared-types → agent-system → office-3d
RUN npm run build -w packages/shared-types
RUN npm run build -w apps/agent-system
RUN npm run build -w apps/office-3d

# ─── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Solo producción deps del backend
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/shared-types/package*.json ./packages/shared-types/
COPY --from=builder /app/apps/agent-system/package*.json ./apps/agent-system/

RUN npm ci --omit=dev --ignore-scripts

# Artefactos de build
COPY --from=builder /app/apps/agent-system/dist ./apps/agent-system/dist
COPY --from=builder /app/apps/office-3d/dist ./apps/office-3d/dist
COPY --from=builder /app/packages/shared-types/src ./packages/shared-types/src

# Directorio de datos (SQLite)
RUN mkdir -p /app/apps/agent-system/data

# El backend sirve también el frontend estático en producción
EXPOSE 3001
EXPOSE 8080

CMD ["node", "apps/agent-system/dist/index.js"]
