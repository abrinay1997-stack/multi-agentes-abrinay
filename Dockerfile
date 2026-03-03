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

# shared-types no tiene build propio — tsc de agent-system la compila como fuente TS
# office-3d se despliega en GitHub Pages, no se necesita aquí
RUN npm run build -w apps/agent-system

# ─── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Herramientas necesarias para compilar módulos nativos (better-sqlite3 → C++ via node-gyp)
# Alpine no las incluye por defecto; sin ellas el .node binding no se genera y el server crashea
RUN apk add --no-cache python3 make g++

# Solo producción deps del backend
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/shared-types/package*.json ./packages/shared-types/
COPY --from=builder /app/apps/agent-system/package*.json ./apps/agent-system/

# Sin --ignore-scripts: permite que better-sqlite3 descargue/compile su binding nativo
RUN npm ci --omit=dev

# Artefactos de build
COPY --from=builder /app/apps/agent-system/dist ./apps/agent-system/dist
COPY --from=builder /app/packages/shared-types/src ./packages/shared-types/src

# Directorio de datos (SQLite)
RUN mkdir -p /app/apps/agent-system/data

# Puerto único: HTTP + WS comparten el mismo puerto (Railway asigna $PORT)
EXPOSE 3001

CMD ["node", "apps/agent-system/dist/index.js"]
