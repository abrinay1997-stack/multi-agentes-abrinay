import { useState, useEffect, useRef } from 'react'
import { useAgentStore } from '../store/agentStore'
import type { AgentConfig } from '../store/agentStore'

// Agentes con búsqueda Tavily (mostrar sección de queries)
const TAVILY_AGENTS = new Set(['kira', 'cleo', 'orion', 'scout'])
// Agentes QA (mostrar score_threshold)
const QA_AGENTS = new Set(['vera', 'stella', 'atlas'])

// ─── Estilos base reutilizables ───────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid #2a2a2a',
  borderRadius: 4,
  color: '#e0e0e0',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '6px 8px',
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
  lineHeight: 1.5,
}

const BTN_STYLE: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a2a',
  borderRadius: 4,
  color: '#888',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '4px 8px',
  lineHeight: 1,
}

const LABEL_STYLE: React.CSSProperties = {
  color: '#555',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
  display: 'block',
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: '#ff4d8d',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 8,
      marginTop: 14,
      paddingTop: 10,
      borderTop: '1px solid #1a1a1a',
    }}>
      {children}
    </div>
  )
}

// ─── ListEditor ───────────────────────────────────────────────────────────────
// Lista editable con + / ×. El padre mantiene el array; este componente gestiona
// solo el input temporal de "nueva entrada".

function ListEditor({ items, onChange, placeholder }: {
  items: string[] | null
  onChange: (items: string[] | null) => void
  placeholder?: string
}) {
  const [newItem, setNewItem] = useState('')
  const list = items ?? []

  const addItem = () => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    onChange([...list, trimmed])
    setNewItem('')
  }

  const removeItem = (i: number) => {
    const next = list.filter((_, idx) => idx !== i)
    onChange(next.length > 0 ? next : null)
  }

  return (
    <div>
      {list.map((item, i) => (
        <div key={`${item}-${i}`} style={{ display: 'flex', gap: 4, marginBottom: 3, alignItems: 'flex-start' }}>
          <span style={{
            flex: 1,
            fontSize: 10,
            color: '#ccc',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #222',
            padding: '4px 8px',
            borderRadius: 3,
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}>
            {item}
          </span>
          <button
            onClick={() => removeItem(i)}
            title="Eliminar"
            style={{
              ...BTN_STYLE,
              color: '#ff6666',
              border: 'none',
              padding: '3px 7px',
              fontSize: 14,
              minWidth: 22,
              flexShrink: 0,
            }}
          >×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          placeholder={placeholder ?? 'Añadir... (Enter para confirmar)'}
          style={{ ...INPUT_STYLE, resize: 'none', padding: '4px 7px' }}
        />
        <button
          onClick={addItem}
          style={{
            ...BTN_STYLE,
            color: '#00ff88',
            border: '1px solid #1a4a2a',
            padding: '4px 10px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >+ Añadir</button>
      </div>
    </div>
  )
}

// ─── safeNumber ───────────────────────────────────────────────────────────────
// Evita que parseFloat('') / parseInt('') retornen NaN → JSON.stringify(NaN) = null

function safeNumber(val: number, fallback: number): number {
  return isNaN(val) ? fallback : val
}

// ─── AgentEditorPanel ─────────────────────────────────────────────────────────

export function AgentEditorPanel({
  name,
  onDirtyChange,
}: {
  name: string
  onDirtyChange?: (dirty: boolean) => void
}) {
  const agentConfig   = useAgentStore(s => s.agentConfigs[name])
  // configLoadingFor granular — solo bloquea el agente en operación, no todos
  const configLoading = useAgentStore(s => s.configLoadingFor === name)
  const configError   = useAgentStore(s => s.configError)
  const loadConfig    = useAgentStore(s => s.loadConfig)
  const saveConfig    = useAgentStore(s => s.saveConfig)
  const resetConfig   = useAgentStore(s => s.resetConfig)

  // Estado local del formulario (draft editable)
  const [local, setLocal] = useState<Partial<AgentConfig> | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  // savingRef: guard sincrónico contra doble-click en "Guardar" (G1).
  // useRef en lugar de useState para que la protección sea inmediata
  // sin esperar un ciclo de re-render.
  const savingRef = useRef(false)

  // Auto-cargar config al montar si no está en el store.
  // El panel debe ser auto-suficiente y no depender exclusivamente de que
  // AgentPopup.handleTabChange haya llamado loadConfig antes de renderizar.
  // No hay loop: cuando loadConfig completa, agentConfig deja de ser falsy
  // y la condición corta la ejecución en el siguiente disparo del efecto.
  useEffect(() => {
    if (!agentConfig) {
      loadConfig(name)
    }
  }, [name, agentConfig, loadConfig])

  // Sincronizar local con el store cuando llega o cambia la config (post-save/reset)
  useEffect(() => {
    if (agentConfig) {
      setLocal({ ...agentConfig })
    }
  }, [agentConfig])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    if (!local || savingRef.current) return  // guard: ignora doble-click
    savingRef.current = true
    try {
      await saveConfig(name, local)
      // Leer el estado más reciente del store (post-await la closure es stale)
      const err = useAgentStore.getState().configError
      if (!err) { setIsDirty(false); onDirtyChange?.(false) }
      showToast(err ? `Error: ${err}` : '✓ Guardado', !err)
    } finally {
      savingRef.current = false
    }
  }

  const handleReset = async () => {
    await resetConfig(name)
    setConfirmReset(false)
    const err = useAgentStore.getState().configError
    if (!err) { setIsDirty(false); onDirtyChange?.(false) }
    showToast(err ? `Error: ${err}` : '✓ Reseteado a defaults', !err)
  }

  const update = (field: keyof AgentConfig, value: unknown) => {
    setLocal(prev => prev ? { ...prev, [field]: value } : prev)
    setIsDirty(true)
    onDirtyChange?.(true)
  }

  // ─── Estados de carga / sin datos ─────────────────────────────────────────

  if (!agentConfig || !local) {
    if (configLoading) {
      return (
        <div style={{ color: '#555', fontSize: 11, padding: '16px 0', textAlign: 'center' }}>
          ↻ Cargando configuración...
        </div>
      )
    }
    return (
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        {configError && (
          <div style={{
            fontSize: 10, color: '#ff6666', fontFamily: 'monospace',
            background: 'rgba(255,50,50,0.07)', border: '1px solid #3a1010',
            borderRadius: 4, padding: '6px 10px', marginBottom: 10,
            wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {configError}
          </div>
        )}
        <div style={{ color: '#444', fontSize: 11, marginBottom: 10 }}>
          Sin datos — el backend no respondió
        </div>
        <button
          onClick={() => loadConfig(name)}
          style={{
            ...BTN_STYLE,
            color: '#888',
            padding: '5px 14px',
          }}
        >
          ↺ Reintentar
        </button>
      </div>
    )
  }

  const hasTavily = TAVILY_AGENTS.has(name)
  const hasQA = QA_AGENTS.has(name)

  // ─── Formulario ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontSize: 11 }}>

      {/* ── Prompt principal ── */}
      <div>
        <span style={LABEL_STYLE}>Prompt del sistema</span>
        <textarea
          value={local.systemPrompt ?? ''}
          onChange={e => update('systemPrompt', e.target.value || null)}
          placeholder="Vacío = usar el prompt hardcoded por defecto"
          rows={4}
          style={INPUT_STYLE}
        />
      </div>

      {/* ── Queries Tavily (solo Kira / Cleo / Orion) ── */}
      {hasTavily && (
        <>
          <SectionTitle>Queries de búsqueda (Tavily)</SectionTitle>
          <ListEditor
            items={local.tavilyQueries ?? null}
            onChange={v => update('tavilyQueries', v)}
            placeholder="Ej: Abrinay TikTok tendencias 2026"
          />
        </>
      )}

      {/* ── Reglas — Siempre ── */}
      <SectionTitle>Reglas — Siempre</SectionTitle>
      <ListEditor
        items={local.rulesAlways ?? null}
        onChange={v => update('rulesAlways', v)}
        placeholder="Ej: Usar modismos colombianos"
      />

      {/* ── Reglas — Nunca ── */}
      <SectionTitle>Reglas — Nunca</SectionTitle>
      <ListEditor
        items={local.rulesNever ?? null}
        onChange={v => update('rulesNever', v)}
        placeholder="Ej: Mencionar religión o política"
      />

      {/* ── Notas / Memoria libre ── */}
      <SectionTitle>Notas / Memoria libre</SectionTitle>
      <textarea
        value={local.memoryNotes ?? ''}
        onChange={e => update('memoryNotes', e.target.value || null)}
        placeholder="Se inyecta al final del prompt en cada ejecución..."
        rows={3}
        style={INPUT_STYLE}
      />

      {/* ── Perfil de Abrinay ── */}
      <SectionTitle>Perfil de Abrinay (override)</SectionTitle>
      <textarea
        value={local.abrinayProfile ?? ''}
        onChange={e => update('abrinayProfile', e.target.value || null)}
        placeholder="Vacío = usar el perfil global del CLAUDE.md"
        rows={3}
        style={INPUT_STYLE}
      />

      {/* ── Variables de control ── */}
      <SectionTitle>Variables de control</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: hasQA ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
        <div>
          <span style={LABEL_STYLE}>Max reintentos</span>
          <input
            type="number"
            min={0} max={3} step={1}
            value={local.maxRetries ?? 1}
            onChange={e => update('maxRetries', safeNumber(parseInt(e.target.value, 10), local.maxRetries ?? 1))}
            style={{ ...INPUT_STYLE, resize: 'none' }}
          />
          <span style={{ color: '#444', fontSize: 9, display: 'block', marginTop: 2 }}>0 = sin revisión</span>
        </div>
        {hasQA && (
          <div>
            <span style={LABEL_STYLE}>Score mín QA</span>
            <input
              type="number"
              min={5} max={10} step={0.5}
              value={local.scoreThreshold ?? 8.0}
              onChange={e => update('scoreThreshold', safeNumber(parseFloat(e.target.value), local.scoreThreshold ?? 8.0))}
              style={{ ...INPUT_STYLE, resize: 'none' }}
            />
            <span style={{ color: '#444', fontSize: 9, display: 'block', marginTop: 2 }}>sobre 10</span>
          </div>
        )}
        <div>
          <span style={LABEL_STYLE}>Temperatura</span>
          <input
            type="number"
            min={0} max={1} step={0.1}
            value={local.temperature ?? 0.7}
            onChange={e => update('temperature', safeNumber(parseFloat(e.target.value), local.temperature ?? 0.7))}
            style={{ ...INPUT_STYLE, resize: 'none' }}
          />
          <span style={{ color: '#444', fontSize: 9, display: 'block', marginTop: 2 }}>0 exacto – 1 creativo</span>
        </div>
      </div>

      {/* ── Botones de acción ── */}
      <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
        <button
          onClick={handleSave}
          disabled={configLoading}
          style={{
            ...BTN_STYLE,
            flex: 1,
            background: configLoading ? 'transparent' : 'rgba(0,255,136,0.08)',
            border: '1px solid #00ff88',
            color: configLoading ? '#333' : '#00ff88',
            padding: '7px 0',
          }}
        >
          {configLoading ? '↻ Guardando...' : '✓ Guardar cambios'}
        </button>
        <button
          onClick={() => setConfirmReset(true)}
          disabled={configLoading}
          style={{
            ...BTN_STYLE,
            background: 'rgba(255,50,50,0.05)',
            border: '1px solid #2a1010',
            color: '#ff6666',
            padding: '7px 10px',
          }}
        >
          Resetear
        </button>
      </div>

      {/* ── Confirmación de reset ── */}
      {confirmReset && (
        <div style={{
          background: 'rgba(255,50,50,0.06)',
          border: '1px solid #3a1a1a',
          borderRadius: 6,
          padding: '10px 12px',
          marginTop: 8,
        }}>
          <div style={{ color: '#ff9999', fontSize: 11, marginBottom: 8 }}>
            ⚠ ¿Resetear <strong style={{ color: '#ffbbbb' }}>{name}</strong> a valores por defecto?
            <br />
            <span style={{ color: '#664444', fontSize: 10 }}>Esta acción borrará todos los cambios guardados.</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleReset}
              style={{ ...BTN_STYLE, color: '#ff4444', border: '1px solid #5a1a1a', flex: 1, padding: '5px 0' }}
            >
              Sí, resetear
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              style={{ ...BTN_STYLE, flex: 1, padding: '5px 0' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Toast de feedback ── */}
      {toast && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: toast.ok ? 'rgba(0,255,136,0.1)' : 'rgba(255,50,50,0.1)',
          border: `1px solid ${toast.ok ? '#00ff88' : '#ff4444'}`,
          borderRadius: 5,
          padding: '7px 12px',
          marginTop: 10,
          color: toast.ok ? '#00ff88' : '#ff8888',
          fontSize: 11,
          textAlign: 'center',
        }}>
          {toast.msg}
        </div>
      )}

    </div>
  )
}
