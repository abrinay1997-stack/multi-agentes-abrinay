# CLAUDE.md — Sistema Multi-Agente Omnicanal Abrinay
> Iniciado: 26 de febrero de 2026 | Última actualización: 26 de febrero de 2026
> Versión del plan: 2.0 — Post-auditoría de 44 gaps

---

## QUÉ ES ESTE PROYECTO

Sistema integrado de dos aplicaciones en un monorepo:
1. **Pipeline de 12 agentes IA** → corre cada 3 días, genera estrategia de contenido para el artista Abrinay (TikTok, Instagram, YouTube) y la envía por email a abrinay1997@gmail.com
2. **Oficina 3D isométrica** → React Three Fiber, los 11 agentes son personajes animados en tiempo real vía WebSocket

---

## REFERENCIA: TWIN.SO → TYPESCRIPT

Este sistema funcionó en producción en Twin.so. Esa implementación es la fuente de verdad
para la LÓGICA DE NEGOCIO. Ahora se construye en TypeScript con control total.

### Traducciones de Twin.so a nuestro stack

| Twin.so (plataforma) | Nuestro stack (TypeScript) |
|---|---|
| `web_search("query")` | `tavilyClient.search({ query, maxResults: 5 })` |
| `send_email` con `to_other` + `template_acknowledged: true` | `resend.emails.send({ to, from, subject, html })` |
| Cron `0 0 7 */3 * * *` (7 campos, con segundos) | node-cron `0 7 */3 * *` (5 campos estándar) |
| Agentes como "nodos" visuales en la UI | Clases TypeScript extendiendo `BaseAgent` |
| DB interna de Twin.so | SQLite `better-sqlite3` en `apps/agent-system/data/abrinay.db` |
| Variables de entorno en la UI de Twin.so | `.env` local + Zod validation |

### Lo que NO cambia (idéntico entre Twin.so y TypeScript)
- Nombres de agentes: Scout, Kira, Cleo, Orion, Nova, Zane, Milo, Leo, Vera, Stella, Atlas, Dimitri
- Personalidades y tono de cada agente
- Schemas de las 3 tablas SQLite
- Queries de búsqueda de Tavily por agente
- Lógica de QA (scores, umbrales, feedback loop)
- Template HTML del email de Dimitri (colores bloqueados)
- Correo destinatario: abrinay1997@gmail.com (INAMOVIBLE)
- Todas las reglas absolutas del sistema

---

## ESTADO ACTUAL

### ✅ Completado
- Plan técnico v2.0 completo (post-auditoría)
- `CLAUDE.md` creado
- `.claude/launch.json` configurado

### 🚧 Construcción pendiente — seguir este orden de fases
- [x] FASE 1: Monorepo + infra base + DB + servicios mock ✅ 2026-02-27
- [x] FASE 2: Pipeline completo de 12 pasos ✅ 2026-02-27
- [x] FASE 3: Oficina 3D — escena + mobiliario ✅ 2026-02-27
- [x] FASE 4: Personajes + animaciones + WebSocket 3D ✅ 2026-02-27
- [x] FASE 5: Dashboard UI + efectos visuales ✅ 2026-02-27
- [x] FASE 6: Polish + cloud-ready + Docker ✅ 2026-02-27

### ⏳ API keys pendientes
- `ANTHROPIC_API_KEY` → console.anthropic.com (distinto de Claude Pro)
- `TAVILY_API_KEY` → tavily.com (free tier disponible)
- `RESEND_API_KEY` → resend.com (3000 emails/mes gratis)

> **MODO ACTUAL: MOCK** — construir con servicios simulados.
> Si `.env` existe con las keys → modo real automático.
> Los mocks incluyen delays de 2-5s simulados para que la UI 3D pueda probarse.

---

## ESTRUCTURA DEL PROYECTO (DEFINITIVA)

```
/MULTI AGENTES de ABRINAY/
├── package.json                    ← workspace root (npm workspaces)
├── tsconfig.base.json              ← strict: true, target: ES2022
├── .env                            ← API keys (NO versionar)
├── .env.example
├── .gitignore
│
├── packages/
│   └── shared-types/               ← tipos compartidos entre apps
│       ├── package.json            ← name: "@abrinay/shared-types"
│       └── src/
│           ├── events.ts           ← AgentEvent (WS events)
│           ├── agents.ts           ← AgentName, AgentOutput schemas
│           ├── pipeline.ts         ← PipelineRun, RunStatus FSM states
│           └── index.ts
│
├── apps/
│   ├── agent-system/               ← Node.js + TypeScript
│   │   ├── package.json
│   │   ├── tsconfig.json           ← extends ../../tsconfig.base.json
│   │   ├── data/
│   │   │   └── abrinay.db          ← SQLite (auto-creado)
│   │   └── src/
│   │       ├── index.ts            ← entry point: Express + WS + Cron
│   │       ├── config.ts           ← Zod env validation
│   │       ├── api.ts              ← Express routes (ver Endpoints HTTP)
│   │       │
│   │       ├── types/              ← re-exporta @abrinay/shared-types
│   │       │
│   │       ├── db/
│   │       │   ├── client.ts       ← instancia better-sqlite3 (singleton)
│   │       │   ├── schema.ts       ← CREATE TABLE IF NOT EXISTS (3 tablas)
│   │       │   ├── lock.ts         ← run lock (evitar runs concurrentes)
│   │       │   └── queries.ts      ← queries tipadas
│   │       │
│   │       ├── services/
│   │       │   ├── claude.ts       ← wrapper Anthropic SDK
│   │       │   ├── tavily.ts       ← wrapper Tavily (con retry + backoff)
│   │       │   ├── resend.ts       ← wrapper Resend (distingue errores config vs red)
│   │       │   └── wsServer.ts     ← WebSocket server + broadcast
│   │       │
│   │       ├── agents/
│   │       │   ├── base.ts         ← BaseAgent: run(), saveOutput(), logError(), emitEvent()
│   │       │   ├── scout.ts        ← PASO 0
│   │       │   ├── kira.ts         ← PASO 1
│   │       │   ├── cleo.ts         ← PASO 2
│   │       │   ├── orion.ts        ← PASO 3
│   │       │   ├── nova.ts         ← PASO 4
│   │       │   ├── zane.ts         ← PASO 5
│   │       │   ├── milo.ts         ← PASO 6
│   │       │   ├── leo.ts          ← PASO 7
│   │       │   ├── qa/
│   │       │   │   ├── vera.ts     ← QA TikTok
│   │       │   │   ├── stella.ts   ← QA Instagram
│   │       │   │   └── atlas.ts    ← QA YouTube
│   │       │   └── dimitri.ts      ← PASO 9 + email
│   │       │
│   │       └── pipeline/
│   │           ├── orchestrator.ts ← FSM (ver estados abajo)
│   │           ├── scheduler.ts    ← node-cron timezone America/Bogota
│   │           └── runner.ts       ← ejecuta un run con lock
│   │
│   └── office-3d/                  ← React + Vite + R3F
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json           ← extends ../../tsconfig.base.json + jsx: react-jsx
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx             ← Canvas + DOM overlay estructura
│           │
│           ├── store/
│           │   └── agentStore.ts   ← Zustand: AgentState por nombre + wsStatus + handleWsEvent
│           │
│           ├── ws/
│           │   └── wsClient.ts     ← SINGLETON fuera de React (ver patrón abajo)
│           │
│           ├── core/
│           │   ├── Scene.tsx       ← R3F Canvas + OrthographicCamera
│           │   ├── Camera.tsx      ← OrthographicCamera zoom=50
│           │   ├── Lights.tsx      ← Hemisphere + Directional + RectArea
│           │   └── Controls.tsx    ← OrbitControls isométrico bloqueado
│           │
│           ├── environment/
│           │   ├── Floor.tsx       ← PBR + emissive LED strips
│           │   ├── Walls.tsx       ← 2 paredes diorama
│           │   └── Environment.tsx ← Environment procedural (sin HDRI externo)
│           │
│           ├── furniture/
│           │   ├── Desk.tsx
│           │   ├── Chair.tsx
│           │   ├── Monitor.tsx     ← ShaderMaterial pantalla encendida
│           │   └── Lounge.tsx
│           │
│           ├── characters/
│           │   ├── CharacterBase.tsx  ← Group + hit-area invisible + GSAP
│           │   ├── positions.ts       ← XYZ de los 11 agentes
│           │   └── colors.ts          ← color hex por agente
│           │
│           ├── animations/
│           │   └── useAgentAnimation.ts ← GSAP + useFrame (NO AnimationMixer)
│           │
│           ├── postprocessing/
│           │   └── Effects.tsx     ← Bloom + SSAO(low) + ACES (NO DOF — incompatible con ortho)
│           │
│           └── ui/
│               ├── Dashboard.tsx   ← overlay DOM (NO dentro del Canvas)
│               ├── AgentPopup.tsx  ← popup 2D sobre canvas
│               ├── RunControls.tsx ← botón → HTTP POST /api/run
│               └── ConnectionBadge.tsx ← estado WS (connected/offline)
│
└── scripts/                        ← dentro de apps/agent-system/scripts/
```

---

## TECH STACK (DEFINITIVO)

| Capa | Tecnología | Versión mínima |
|---|---|---|
| Runtime | Node.js LTS | 20+ |
| Backend | TypeScript | strict mode |
| LLM críticos | claude-sonnet-4-6 | — |
| LLM simples | claude-haiku-4-5-20251001 | — |
| Search | @tavily/core | — |
| Email | resend | ^4 |
| DB | better-sqlite3 | ^9 |
| Cron | node-cron | ^3 |
| WebSocket | ws | ^8 |
| HTTP server | express | ^4 |
| Validación env | zod | ^3 |
| Frontend | React 18 + Vite | — |
| 3D | three + @react-three/fiber | three ^0.170 |
| Helpers 3D | @react-three/drei | ^9 |
| Postprocessing | @react-three/postprocessing | ^2 |
| Animaciones | gsap | ^3 |
| Estado | zustand | ^5 |

---

## AGENTES DEL PIPELINE — MODELO POR AGENTE

| Paso | Agente | Modelo | Rol |
|---|---|---|---|
| INICIAL | — | — | Verificar tablas + lock |
| 0 | Scout | Haiku | Revisar redes Abrinay con Tavily |
| 1 | Kira | Haiku | Trend Hunter TikTok |
| 2 | Cleo | Haiku | Trend Hunter Instagram |
| 3 | Orion | Haiku | Trend Hunter YouTube |
| 4 | Nova | Sonnet | Estratega Editorial |
| 5 | Zane | Sonnet | Guionista TikTok |
| 6 | Milo | Sonnet | Creadora Instagram |
| 7 | Leo | Sonnet | Creador YouTube |
| 8 | Vera+Stella+Atlas | Sonnet | QA Triple |
| 9 | Dimitri | Sonnet | Director + email HTML |
| 10 | — | — | Validar correo + enviar |

**Scout NO tiene representación 3D** — es agente de sistema invisible.
**11 personajes 3D**: Kira, Cleo, Orion, Nova, Zane, Milo, Leo, Vera, Stella, Atlas, Dimitri.

---

## BASE DE DATOS SQLITE — SCHEMAS

```sql
-- Tabla 1: Outputs de agentes
CREATE TABLE IF NOT EXISTS squad_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  output_type TEXT NOT NULL,
  content TEXT NOT NULL,           -- SIEMPRE JSON.stringify(). Al leer: JSON.parse()
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Historial de contenido
CREATE TABLE IF NOT EXISTS content_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  fecha DATE NOT NULL,
  plataforma TEXT NOT NULL CHECK(plataforma IN ('TikTok','Instagram','YouTube')),
  formato TEXT NOT NULL,
  titulo TEXT NOT NULL,
  hook TEXT NOT NULL,
  score_general INTEGER,           -- escala 1-10 para TikTok/IG. Atlas: CTR*10 (5%=50? NO — ver abajo)
  score_hook INTEGER,              -- solo TikTok (Vera). NULL para IG y YT
  score_ctr REAL,                  -- SOLO Atlas/YouTube: CTR estimado en % (ej: 5.2)
  hashtags TEXT,
  audio_sugerido TEXT,
  status TEXT NOT NULL CHECK(status IN ('aprobado','descartado')),
  razon_descarte TEXT,
  licencia_p INTEGER DEFAULT 1 CHECK(licencia_p IN (0,1)), -- 1=relacionado con Licencia P
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 3: Log de errores
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_detail TEXT NOT NULL,
  fallback_used TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 4: Lock de ejecución (evitar runs concurrentes)
CREATE TABLE IF NOT EXISTS run_lock (
  id INTEGER PRIMARY KEY CHECK(id = 1),  -- solo 1 fila posible
  run_id TEXT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Convención content_history para Atlas:**
- `score_general`: puntuación general 1-10 (calidad del video)
- `score_ctr`: CTR estimado en porcentaje (ej: 6.5 significa 6.5%)
- Umbral de aprobación Atlas: `score_ctr >= 5.0`

---

## GENERACIÓN DE run_id

```typescript
import { randomUUID } from 'crypto'
const runId = `run_${Date.now()}_${randomUUID().slice(0, 8)}`
// Ejemplo: "run_1740571200000_a3f9b2c1"
```

---

## SCHEMAS JSON DE OUTPUT POR AGENTE

Todos los `content` en `squad_outputs` son JSON. Schemas exactos:

### Scout (output_type: 'redes_data')
```typescript
{
  tiktok_data: string | 'NO_DATA',
  instagram_data: string | 'NO_DATA',
  youtube_data: string | 'NO_DATA',
  scout_status: 'SUCCESS' | 'PARTIAL' | 'FAILED',
  scout_log: string[]
}
```

### Kira / Cleo / Orion (output_type: 'tendencias')
```typescript
{
  plataforma: 'TikTok' | 'Instagram' | 'YouTube',
  tendencias: Array<{
    nombre: string,
    descripcion: string,
    relevancia_para_abrinay: string,
    es_dato_real: boolean,     // true = visto en Tavily, false = LLM knowledge
    fuente_url?: string
  }>,
  fecha_busqueda: string       // ISO date
}
```

### Nova (output_type: 'parrilla_editorial')
```typescript
{
  items: Array<{
    id: string,                // 'item_1', 'item_2'...
    plataforma: 'TikTok' | 'Instagram' | 'YouTube',
    formato: string,           // 'video_corto', 'reel', 'carrusel', 'video_largo', 'short'
    fecha_sugerida: string,    // 'YYYY-MM-DD'
    hora_sugerida: string,     // 'HH:MM-HH:MM'
    tema_central: string,
    angulo: string,
    hook_sugerido: string,
    referencia_tendencia: string  // qué tendencia de Kira/Cleo/Orion usa
  }>,
  estrategia_licencia_p: string,
  justificacion: string
}
```

### Zane (output_type: 'guiones_tiktok')
```typescript
{
  guiones: Array<{
    id: string,
    parrilla_item_id: string,
    hook: string,              // primeros 3 segundos exactos
    desarrollo: string,        // guión completo palabra por palabra
    cta: string | null,
    audio_sugerido: string,
    duracion_estimada_seg: number,
    modismos_usados: string[]
  }>
}
```

### Milo (output_type: 'contenido_instagram')
```typescript
{
  reels: Array<{
    id: string,
    guion: string,
    audio: string,
    hook_visual: string,
    estetica: string
  }>,
  carrusel: {
    id: string,
    slides: Array<{ numero: number, copy: string, visual_sugerido: string }>,
    caption: string
  }
}
```

### Leo (output_type: 'contenido_youtube')
```typescript
{
  video_largo: {
    id: string,
    titulo_seo: string,
    descripcion: string,
    escaleta: Array<{ timestamp: string, seccion: string, descripcion: string }>,
    gancho_apertura: string,
    duracion_estimada_min: number
  },
  shorts: Array<{
    id: string,
    titulo: string,
    guion: string,
    hook_3seg: string
  }>
}
```

### QA outputs (output_type: 'qa_result' | 'qa_feedback')
```typescript
// qa_result — evaluación inicial
{
  pieza_id: string,
  agente_qa: 'vera' | 'stella' | 'atlas',
  status: 'aprobado' | 'needs_revision',
  score_general: number,
  score_hook?: number,       // solo Vera
  score_ctr?: number,        // solo Atlas
  problema?: string,
  linea_elemento?: string,
  ejemplo_correcto?: string,
  revision_attempt: 0
}

// qa_feedback — tras revisión del guionista
{
  pieza_id: string,
  revision_attempt: 1,
  revision_note: string,     // qué cambió y por qué
  contenido_revisado: string // el guión/pieza revisada completa
}
```

---

## ORQUESTADOR — PATRÓN FSM (ESTADOS FINITOS)

El pipeline NO es una lista de pasos. Es una FSM explícita:

```typescript
type PipelineState =
  | 'idle'
  | 'initializing'          // verificar tablas + lock
  | 'running_scout'
  | 'running_trend_hunters' // Kira + Cleo + Orion en Promise.all()
  | 'running_nova'
  | 'running_content_creators' // Zane + Milo + Leo en Promise.all()
  | 'running_qa'            // Vera + Stella + Atlas en Promise.all()
  | 'running_qa_revision'   // feedback loop (max 1 vez por pieza)
  | 'running_dimitri'
  | 'sending_email'
  | 'inserting_history'
  | 'complete'
  | 'failed'
```

**Paralelismo con Promise.all() (mismo proceso Node.js):**
```typescript
// Paso 1+2+3 en paralelo (después de Scout):
const [kiraOut, cleoOut, orionOut] = await Promise.all([
  kira.run(runCtx), cleo.run(runCtx), orion.run(runCtx)
])

// Paso 5+6+7 en paralelo (después de Nova):
const [zaneOut, miloOut, leoOut] = await Promise.all([
  zane.run(runCtx), milo.run(runCtx), leo.run(runCtx)
])

// Paso 8 QA en paralelo:
const [veraOut, stellaOut, atlasOut] = await Promise.all([
  vera.run(runCtx), stella.run(runCtx), atlas.run(runCtx)
])
```

---

## RUN LOCK — EVITAR EJECUCIONES CONCURRENTES

```typescript
// Al inicio de cada run:
function acquireLock(runId: string): boolean {
  try {
    db.prepare(`INSERT INTO run_lock (id, run_id) VALUES (1, ?)`).run(runId)
    return true
  } catch {
    // fila ya existe → run en progreso
    const existing = db.prepare(`SELECT *,
      (julianday('now') - julianday(started_at)) * 24 AS hours_elapsed
      FROM run_lock WHERE id = 1`).get()
    if (existing.hours_elapsed > 4) {
      // run fantasma (crash) → forzar liberación
      releaseLock()
      return acquireLock(runId)
    }
    return false
  }
}

function releaseLock(): void {
  db.prepare(`DELETE FROM run_lock WHERE id = 1`).run()
}
```

---

## MECANISMO FEEDBACK LOOP QA

```
QA evalúa pieza
  ↓ si needs_revision
QA guarda qa_feedback en squad_outputs (revision_attempt: 0 → indica qué corregir)
  ↓
Guionista re-ejecuta SOLO esa pieza con el feedback como contexto adicional
Guionista guarda en squad_outputs (revision_attempt: 1, contenido_revisado)
  ↓
QA re-evalúa el contenido_revisado
  ↓ aprobado → status: 'aprobado' en squad_outputs
  ↓ rechazado → status: 'descartado' → insert en content_history con status='descartado'

MÁXIMO 1 revisión por pieza. NUNCA una segunda revisión.
Pipeline NO se bloquea si una pieza es descartada.
```

---

## QA — CALIBRACIÓN Y UMBRALES

```typescript
// Al inicio de QA, consultar historial de la plataforma:
const history = db.prepare(`
  SELECT score_general, score_hook, score_ctr
  FROM content_history
  WHERE plataforma = ? AND status = 'aprobado'
  ORDER BY created_at DESC LIMIT 10
`).all(plataforma)

// Si no hay historial (primer run) → usar umbrales base:
const UMBRALES_BASE = {
  vera:  { general: 8.0, hook: 8.0 },
  stella:{ general: 8.0 },
  atlas: { ctr: 5.0 }
}

// Si hay historial → calibrar:
// promedio_general = avg(score_general de los últimos 10)
// Si promedio_general >= 9.0 → umbral_efectivo = 8.5
// Si promedio_general <= 7.5 → mantener umbral base 8.0 (documentar tendencia baja)
// Umbral nunca menor a 6.0 ni mayor a 9.5
```

---

## COMPORTAMIENTO CUANDO 0 CONTENIDOS APROBADOS EN UNA PLATAFORMA

Dimitri incluye en el email:
```
⚠️ SIN CONTENIDO APROBADO PARA [PLATAFORMA] en este ciclo.
Todos los [N] contenidos generados fueron descartados en QA.
Recomendación: revisar briefs y ejemplos aprobados anteriores.
```
El pipeline NO aborta. El email SE envía de todas formas.

---

## ENDPOINTS HTTP DEL BACKEND (Express — puerto 3001)

```
GET  /api/health           → { status: 'ok', version: '1.0' }
GET  /api/status           → estado actual del pipeline + último run
GET  /api/run/latest       → outputs del último run completado (para cargar UI al abrir)
GET  /api/agents/:name     → últimos outputs del agente especificado
POST /api/run              → disparar pipeline manualmente (respeta el lock)
```

El frontend usa `GET /api/run/latest` al montar para pre-popular Zustand con datos históricos.
El botón "Ejecutar ahora" usa `POST /api/run` (HTTP, NO WebSocket).

---

## WEBSOCKET EVENTS (puerto 8080)

```typescript
// Tipos exactos — definidos en packages/shared-types/src/events.ts
type AgentEvent =
  | { type: 'pipeline:start';    runId: string; timestamp: number }
  | { type: 'pipeline:complete'; runId: string; timestamp: number; summary: RunSummary }
  | { type: 'pipeline:progress'; runId: string; step: number; totalSteps: number }
  | { type: 'agent:start';       agentName: AgentName; runId: string }
  | { type: 'agent:thinking';    agentName: AgentName; message: string }
  | { type: 'agent:complete';    agentName: AgentName; outputType: string }
  | { type: 'agent:error';       agentName: AgentName; error: string }
  | { type: 'qa:revision';       agentName: 'vera'|'stella'|'atlas'; pieceId: string; score: number }
```

WS es **broadcast unidireccional** (backend → frontend).
El frontend usa HTTP POST (no WS) para enviar comandos al backend.

---

## WEBSOCKET CLIENT — PATRÓN SINGLETON

```typescript
// apps/office-3d/src/ws/wsClient.ts — FUERA de React
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const MAX_RETRIES = 5
let retryCount = 0

export function connectWS(url: string, onEvent: (e: AgentEvent) => void) {
  if (ws && ws.readyState < 2) return  // ya conectado

  ws = new WebSocket(url)
  ws.onopen = () => {
    retryCount = 0
    useAgentStore.getState().setWsStatus('connected')
  }
  ws.onmessage = (msg) => {
    const event = JSON.parse(msg.data) as AgentEvent
    onEvent(event)
  }
  ws.onclose = () => {
    useAgentStore.getState().setWsStatus('connecting')
    if (retryCount < MAX_RETRIES) {
      retryCount++
      reconnectTimer = setTimeout(
        () => connectWS(url, onEvent),
        Math.min(2000 * retryCount, 30000)  // backoff exponencial, max 30s
      )
    } else {
      useAgentStore.getState().setWsStatus('offline')
    }
  }
}

export function disconnectWS() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  ws?.close()
  ws = null
}
```

Inicializado en `App.tsx` con `useEffect(() => { connectWS(...); return disconnectWS }, [])`.

---

## ZUSTAND → THREE.JS — PATRÓN DE ANIMACIONES

```typescript
// Zustand store
interface AgentState {
  status: 'idle' | 'typing' | 'complete' | 'error'
  thinkingMessage: string | null
  lastOutput: string | null
}
interface AgentStore {
  agents: Record<string, AgentState>
  wsStatus: 'connecting' | 'connected' | 'offline'
  setWsStatus: (s: AgentStore['wsStatus']) => void
  handleWsEvent: (e: AgentEvent) => void
}

// En cada componente de personaje — subscribe imperativo (NO useSelector)
useEffect(() => {
  const unsub = useAgentStore.subscribe(
    (state) => state.agents[agentName]?.status,
    (newStatus) => {
      if (newStatus === 'typing')   gsap.to(armRef.current.rotation, { x: 0.4, repeat: -1, yoyo: true, duration: 0.3 })
      if (newStatus === 'complete') gsap.to(groupRef.current.scale, { y: 1.1, duration: 0.2, yoyo: true, repeat: 1 })
      if (newStatus === 'idle')     gsap.killTweensOf([armRef.current.rotation])
    }
  )
  return unsub
}, [])

// useFrame para idle breathing continuo (no depende de Zustand):
useFrame(({ clock }) => {
  if (!groupRef.current) return
  groupRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 1.2) * 0.03
})
```

**AnimationMixer ELIMINADO del plan** — requiere GLTF/skeleton. No aplica a geometría procedural.

---

## ARQUITECTURA 3D — DECISIONES FINALES

### Cámara: OrthographicCamera (NO Perspective)
```typescript
// OrthographicCamera da el look "diorama" isométrico real
// zoom=50 es el punto de partida — ajustar según escena
<OrthographicCamera makeDefault position={[15, 15, 15]} zoom={50} near={0.1} far={1000} />
```

### OrbitControls bloqueado
```typescript
<OrbitControls
  enablePan={false}
  enableZoom={true}
  minZoom={30} maxZoom={100}
  minPolarAngle={Math.PI / 4}  // bloquear ángulo vertical exacto
  maxPolarAngle={Math.PI / 4}  // misma → no inclina
/>
```

### Postprocessing (ACES + Bloom + SSAO — SIN DOF)
> **DOF eliminado**: incompatible con OrthographicCamera (DOF requiere focalLength de cámara perspectiva)
```typescript
<EffectComposer>
  <Bloom luminanceThreshold={0.9} intensity={1.5} />
  <SSAO samples={16} intensity={2} />         // samples bajo = mejor performance
  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
</EffectComposer>
```

### Geometría de personajes (Group de primitivas — NO SkinnedMesh)
```typescript
// Cada personaje: un <group> con 6-8 meshes hijos
// + 1 mesh invisible como hit-area para raycasting
<group
  ref={groupRef}
  onClick={(e) => { e.stopPropagation(); openPopup(agentName) }}
  onPointerOver={(e) => { e.stopPropagation(); setHovered(agentName) }}
  onPointerOut={(e) => { e.stopPropagation(); setHovered(null) }}
>
  {/* hit-area invisible — único target de raycaster */}
  <mesh visible={false}><boxGeometry args={[0.8, 1.8, 0.8]} /></mesh>

  {/* Cabeza */}
  <mesh ref={headRef} name="head" position={[0, 1.6, 0]}>
    <sphereGeometry args={[0.25, 8, 8]} />
    <meshStandardMaterial color={agentColor} />
  </mesh>
  {/* Torso, brazos, piernas... */}
</group>
```

### Texto flotante (Billboard + Text de Drei)
```typescript
{thinkingMessage && (
  <Billboard position={[0, 2.2, 0]}>
    <Suspense fallback={null}>
      <Text fontSize={0.15} color="white" outlineWidth={0.02} outlineColor="black">
        {thinkingMessage}
      </Text>
    </Suspense>
  </Billboard>
)}
```

### Dashboard overlay (DOM fuera del Canvas)
```typescript
// App.tsx — estructura correcta:
<div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
  <Canvas style={{ position: 'absolute', inset: 0 }} />
  <Dashboard style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }} />
</div>
```

### Environment (procedural — sin archivos HDRI externos)
```typescript
<Environment resolution={256}>
  <mesh scale={100}>
    <sphereGeometry args={[1, 32, 32]} />
    <meshBasicMaterial color="#0a0a1a" side={THREE.BackSide} />
  </mesh>
</Environment>
```

---

## POSICIONES Y COLORES DE LOS 11 PERSONAJES

| Agente | Posición [x,y,z] | Color | Zona |
|---|---|---|---|
| Kira | [-3, 0, 0] | #FF6B9D | Central |
| Cleo | [-1, 0, 0] | #833AB4 | Central |
| Orion | [1, 0, 0] | #FF0000 | Central |
| Zane | [-2, 0, 2] | #00FF88 | Central |
| Milo | [0, 0, 2] | #FFD700 | Central |
| Leo | [2, 0, 2] | #4FC3F7 | Central |
| Nova | [4, 0, -1] | #FF8C00 | Análisis |
| Dimitri | [6, 0, -1] | #C0C0C0 | Análisis |
| Vera | [-5, 0, 1] | #FF2D55 | QA |
| Stella | [-3, 0, 3] | #E040FB | QA |
| Atlas | [-1, 0, 4] | #29B6F6 | QA |

---

## MODO OFFLINE DE LA OFICINA 3D

Cuando `wsStatus === 'offline'`:
- Todos los personajes en estado `idle` (breathing loop continuo via useFrame)
- Badge rojo en UI: "Servidor desconectado — modo visor"
- Botón "Ejecutar ahora" deshabilitado con tooltip "Servidor no disponible"
- La UI carga el último run histórico via `GET /api/run/latest` al montar

---

## CRON — CONFIGURACIÓN

```typescript
// node-cron — timezone explícita America/Bogota (UTC-5)
cron.schedule('0 7 */3 * *', () => runner.run(), {
  timezone: 'America/Bogota'
})
```

---

## VARIABLES DE ENTORNO

```bash
# .env
ANTHROPIC_API_KEY=           # console.anthropic.com
TAVILY_API_KEY=              # tavily.com
RESEND_API_KEY=              # resend.com
RESEND_FROM_EMAIL=           # dominio verificado en Resend

WS_PORT=8080
AGENT_SERVER_PORT=3001
VITE_WS_URL=ws://localhost:8080
VITE_API_URL=http://localhost:3001

NODE_ENV=development         # 'development' → modo mock si faltan API keys
```

**Detección de modo mock:**
```typescript
// config.ts — si ANTHROPIC_API_KEY no existe → MOCK_MODE = true
export const MOCK_MODE = !process.env.ANTHROPIC_API_KEY
// Los mocks incluyen delays de 2000-5000ms para simular latencia real de API
```

---

## MOCK SERVICES — COMPORTAMIENTO

- **claudeMock**: delays de 2-5s + JSON de contenido pre-generado realista
- **tavilyMock**: delays de 1-2s + tendencias ficticias pero coherentes
- **resendMock**: delay de 500ms + log del HTML en consola
- Los mocks cubren TODOS los casos incluyendo fallos (para probar fallbacks)
- El orquestador no sabe si está en modo mock — la abstracción es transparente

---

## RESEND — MANEJO DE ERRORES

```typescript
// Distinguir errores de configuración vs errores de red:
if (error.statusCode === 422 || error.statusCode === 403) {
  // Error de configuración (dominio no verificado, email inválido)
  // → NO reintentar, loggear en error_log, pipeline continúa
} else {
  // Error de red → reintentar 1 vez con delay de 5s
  // → Si falla de nuevo: loggear, pipeline continúa sin email
}
```

**INSERT en content_history ocurre SIEMPRE** (email enviado o no).
El email fallido se documenta en error_log y en la sección de errores del próximo reporte.

---

## POLÍTICA DE FECHAS DE LA PARRILLA

- Nova genera parrilla a partir de `NOW() + 1 día`
- No se modifican registros existentes en content_history
- Duplicados de fecha: se insertan igualmente (Abrinay decide qué publicar)
- El pipeline anti-repetición consulta hooks/formatos, no fechas

---

## PAQUETES NPM POR APP

### Root workspace (`package.json`)
```json
{
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w apps/agent-system\" \"npm run dev -w apps/office-3d\"",
    "build": "npm run build -w packages/shared-types && npm run build -w apps/agent-system && npm run build -w apps/office-3d"
  }
}
```

### `packages/shared-types`
```json
{ "name": "@abrinay/shared-types", "main": "src/index.ts" }
```

### `apps/agent-system`
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.40",
    "@tavily/core": "^0.5",
    "resend": "^4",
    "better-sqlite3": "^9",
    "@types/better-sqlite3": "^7",
    "node-cron": "^3",
    "ws": "^8",
    "@types/ws": "^8",
    "express": "^4",
    "@types/express": "^4",
    "zod": "^3",
    "dotenv": "^16",
    "pino": "^9",
    "@abrinay/shared-types": "*"
  }
}
```

### `apps/office-3d`
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "three": "^0.170",
    "@react-three/fiber": "^8",
    "@react-three/drei": "^9",
    "@react-three/postprocessing": "^2",
    "postprocessing": "^6",
    "gsap": "^3",
    "zustand": "^5",
    "@abrinay/shared-types": "*"
  }
}
```

---

## TEMPLATE HTML DE DIMITRI (colores bloqueados)

```
Fondo:        #0a0a0a
TikTok:       #FF2D55
Instagram:    #833AB4
YouTube:      #FF0000
Acento/links: #ff4d8d
Notas QA:     #FFD700
Max-width:    480px (mobile-first)
```

Secciones en orden OBLIGATORIO:
1. Header — "🎵 Estrategia de Contenido Omnicanal / Abrinay — Campaña Licencia P / [FECHA]"
2. Resumen Ejecutivo
3. Parrilla de Contenido (2 semanas)
4. TikTok — guiones aprobados completos
5. Instagram — piezas aprobadas
6. YouTube — videos aprobados
7. Calendario de Publicación Sugerido
8. Hashtags Estratégicos por plataforma
9. Sinergias Omnicanal
10. Piezas Rechazadas *(SOLO si hubo)*
11. Errores y Advertencias *(SOLO si hubo)*
12. Nota personal de Dimitri (modismo panameño + referencia a Licencia P)
13. Footer

---

## REGLAS ABSOLUTAS (inamovibles)

**Correo destinatario:** abrinay1997@gmail.com — NUNCA otro
**Nombres de agentes:** Scout, Kira, Cleo, Orion, Nova, Zane, Milo, Leo, Vera, Stella, Atlas, Dimitri
**Anti-repetición:** nunca repetir hook/formato/tema en menos de 30 días
**Sin alucinación:** nunca inventar métricas, canciones, collabs o citas

---

## PERFIL DE ABRINAY (resumen para prompts de agentes)

- Artista: Rap, Hiphop, reggaeton, dembow, mombatón, Dancehall
- Redes: @abrinay (TikTok), @abrinay_ (IG), @Abrinay_ (YT)
- Proyecto en lanzamiento: **"Licencia P"**
- Audiencia: 18-24 años, Latinoamérica, 1K-10K seguidores
- Personalidad: ENTP, polémico, caótico-elegante, colombiano-panameño
- Estética: oscuro, cinemático, futurista, minimalista
- Modismos: xuxa, qué xopa, tá bien, chuzo, chuleta, fren, pana, parce, la vaina...
- NUNCA: religión, política, violencia, energía femenina, datos inventados

---

## COMANDOS DE DESARROLLO

```bash
npm install                                          # instalar todo el workspace
npm run dev                                          # ambos servidores
npm run dev -w apps/agent-system                     # solo backend
npm run dev -w apps/office-3d                        # solo frontend 3D
npx ts-node apps/agent-system/scripts/test-run.ts    # ejecutar pipeline 1 vez
```

---

## INSTRUCCIONES PARA CLAUDE AL ABRIR EL PROYECTO

1. Leer este CLAUDE.md completo antes de tocar código
2. Verificar tabla de fases → continuar desde la primera marcada como pendiente
3. Verificar si existe `.env` → determinar si es modo mock o real
4. NO rehacer trabajo ya completado — leer archivos existentes primero
5. Al completar cada fase → actualizar el checkbox correspondiente en este archivo
6. Cada cambio no trivial (>3 archivos) → presentar plan antes de ejecutar
