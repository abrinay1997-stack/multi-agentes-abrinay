import { MOCK_MODE } from '../config'
import type Anthropic from '@anthropic-ai/sdk'

// Singleton lazy — se instancia una sola vez en el primer uso real del SDK.
// Evita múltiples handshakes TLS por cada agente durante el pipeline (15-24 conexiones).
let _anthropicClient: InstanceType<typeof Anthropic> | null = null

async function getAnthropicClient(): Promise<InstanceType<typeof Anthropic>> {
  if (!_anthropicClient) {
    const AnthropicSDK = (await import('@anthropic-ai/sdk')).default
    _anthropicClient = new AnthropicSDK()
  }
  return _anthropicClient
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Mock responses realistas por tipo de agente
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOCK_RESPONSES: Record<string, any> = {
  qa_tiktok: {
    score_general: 8.7,
    score_hook: 9.1,
    status: 'aprobado',
  },
  qa_instagram: {
    score_general: 8.5,
    status: 'aprobado',
  },
  qa_youtube: {
    score_general: 8.3,
    score_ctr: 6.2,
    status: 'aprobado',
  },
  email_dimitri: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Estrategia Licencia P</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
<div style="max-width:480px;margin:0 auto;padding:20px;">

<div style="border-bottom:2px solid #ff4d8d;padding-bottom:16px;margin-bottom:24px;">
  <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Sistema Multi-Agente</p>
  <h1 style="margin:0;font-size:20px;line-height:1.3;">🎵 Estrategia de Contenido Omnicanal<br><span style="color:#ff4d8d;">Abrinay — Campaña Licencia P</span></h1>
  <p style="color:#888;font-size:12px;margin:8px 0 0;">[FECHA]</p>
</div>

<div style="background:#111;border-radius:8px;padding:16px;margin-bottom:20px;">
  <h2 style="color:#ff4d8d;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Resumen Ejecutivo</h2>
  <p style="margin:0;font-size:14px;line-height:1.6;color:#ccc;">Este ciclo se generaron 6 piezas de contenido estratégico para el lanzamiento de <strong style="color:#ff4d8d;">Licencia P</strong>. El pipeline de QA aprobó el 100% de las piezas, con scores promedio de 8.7/10. La estrategia prioriza el narrative building en YouTube y la viralización en TikTok.</p>
</div>

<div style="margin-bottom:20px;">
  <h2 style="color:#FF2D55;font-size:14px;text-transform:uppercase;letter-spacing:1px;border-left:3px solid #FF2D55;padding-left:10px;">TikTok</h2>
  <div style="background:#111;border-radius:8px;padding:14px;">
    <p style="font-size:13px;color:#aaa;margin:0 0 8px;">3 guiones aprobados por Vera QA</p>
    <p style="font-size:12px;color:#888;margin:0;">Hook promedio: 9.1/10 · Score general: 8.7/10</p>
  </div>
</div>

<div style="margin-bottom:20px;">
  <h2 style="color:#833AB4;font-size:14px;text-transform:uppercase;letter-spacing:1px;border-left:3px solid #833AB4;padding-left:10px;">Instagram</h2>
  <div style="background:#111;border-radius:8px;padding:14px;">
    <p style="font-size:13px;color:#aaa;margin:0 0 8px;">1 reel + 1 carrusel aprobados por Stella QA</p>
    <p style="font-size:12px;color:#888;margin:0;">Score general promedio: 8.5/10</p>
  </div>
</div>

<div style="margin-bottom:20px;">
  <h2 style="color:#FF0000;font-size:14px;text-transform:uppercase;letter-spacing:1px;border-left:3px solid #FF0000;padding-left:10px;">YouTube</h2>
  <div style="background:#111;border-radius:8px;padding:14px;">
    <p style="font-size:13px;color:#aaa;margin:0 0 8px;">1 video largo + 1 short aprobados por Atlas QA</p>
    <p style="font-size:12px;color:#888;margin:0;">CTR estimado: 6.2% · Score: 8.3/10</p>
  </div>
</div>

<div style="background:#1a1a0a;border:1px solid #FFD700;border-radius:8px;padding:16px;margin-bottom:20px;">
  <p style="color:#FFD700;font-size:12px;font-weight:bold;margin:0 0 8px;">💬 Nota de Dimitri</p>
  <p style="font-size:13px;color:#ccc;margin:0;font-style:italic;">Chuleta, fren — este ciclo quedó chuzo. La campaña Licencia P está agarrando vuelo. Las 6 piezas aprobadas tienen el balance perfecto: TikTok para el hype, IG para la estética, YouTube para el narrative. Tá bien, Abrinay. La P tiene su propia licencia y ya lo saben.</p>
</div>

<div style="text-align:center;padding-top:20px;border-top:1px solid #222;">
  <p style="color:#444;font-size:11px;margin:0;">Sistema Multi-Agente Abrinay · Generado automáticamente</p>
  <p style="color:#444;font-size:11px;margin:4px 0 0;">Próximo ciclo: en 3 días · abrinay1997@gmail.com</p>
</div>

</div>
</body>
</html>`,
  redes_data: {
    tiktok_data: 'Abrinay (@abrinay) TikTok: 1.2K seguidores. Últimos 5 videos: 500-2000 vistas. Último post hace 3 días. Comentarios: "fuego", "licencia p cuando?", "el beat está pesado". Tendencia creciente +15% mensual.',
    instagram_data: 'Abrinay_ IG: 890 seguidores. Reels: 300-1500 reproducciones. Stories: activas diariamente. Último reel hace 2 días, 1.1K views. Comentarios positivos sobre estética oscura.',
    youtube_data: 'Canal Abrinay_: 450 suscriptores. Videos: 200-800 vistas. Último upload hace 1 semana. Watch time promedio 2:40 min. CTR thumbnail ~4.2%.',
    scout_status: 'SUCCESS',
    scout_log: [
      'Búsqueda TikTok @abrinay completada — 3 resultados',
      'Búsqueda Instagram @abrinay_ completada — 2 resultados',
      'Búsqueda YouTube @Abrinay_ completada — 2 resultados',
    ],
  },
  tendencias_tiktok: {
    plataforma: 'TikTok',
    tendencias: [
      { nombre: 'Dembow oscuro/cinemático', descripcion: 'Videos con producción oscura, slow motion, estética película noir con dembow acelerado', relevancia_para_abrinay: 'Muy alta — su estética encaja perfectamente con este formato', es_dato_real: true, fuente_url: 'https://www.tiktok.com/trending' },
      { nombre: 'Day in my life artista emergente', descripcion: 'Rutina diaria de artistas pre-mainstream, mostrando proceso creativo y estudio', relevancia_para_abrinay: 'Alta — genera conexión auténtica con audiencia 18-24', es_dato_real: false },
      { nombre: 'Before/After studio session', descripcion: 'Transformación de un beat rough a producción final', relevancia_para_abrinay: 'Alta — puede mostrar el proceso de Licencia P', es_dato_real: true, fuente_url: 'https://www.tiktok.com/trending' },
    ],
    fecha_busqueda: new Date().toISOString(),
  },
  tendencias_instagram: {
    plataforma: 'Instagram',
    tendencias: [
      { nombre: 'Carrusel "proceso creativo"', descripcion: 'Secuencias de 5-8 slides mostrando behind the scenes de producción musical', relevancia_para_abrinay: 'Alta — contenido de valor para audiencia músicos', es_dato_real: false },
      { nombre: 'Reels con texto mínimo + beat', descripcion: 'Solo el artista, fondo oscuro, letra flotando, beat de la canción', relevancia_para_abrinay: 'Muy alta — encaja con estética minimalista/futurista', es_dato_real: true },
      { nombre: 'Collabs con artistas locales', descripcion: 'Feature en videos de artistas de la misma escena para cross-audience', relevancia_para_abrinay: 'Media — requiere coordinar con otros artistas', es_dato_real: false },
    ],
    fecha_busqueda: new Date().toISOString(),
  },
  tendencias_youtube: {
    plataforma: 'YouTube',
    tendencias: [
      { nombre: 'Mini-documentales de lanzamiento', descripcion: 'Serie de 3-5 videos contando la historia detrás del álbum/single antes del release', relevancia_para_abrinay: 'Muy alta — Licencia P necesita narrative building', es_dato_real: true },
      { nombre: 'Videos lyrics con estética visual', descripcion: 'Lyrics videos con animaciones minimalistas y alta producción visual', relevancia_para_abrinay: 'Alta — bajo costo, alto valor para fans', es_dato_real: false },
      { nombre: 'Freestyle sessions en locación', descripcion: 'Freestyles en lugares simbólicos grabados con calidad cinematográfica', relevancia_para_abrinay: 'Alta — demuestra habilidad y genera buzz orgánico', es_dato_real: false },
    ],
    fecha_busqueda: new Date().toISOString(),
  },
  parrilla_editorial: {
    items: [
      { id: 'item_1', plataforma: 'TikTok', formato: 'video_corto', fecha_sugerida: '2026-03-01', hora_sugerida: '19:00-21:00', tema_central: 'Teaser Licencia P — beat drop', angulo: 'Oscuro, cinematográfico, solo el artista', hook_sugerido: '¿Qué pasa cuando le das licencia a la P...?', referencia_tendencia: 'Dembow oscuro/cinemático' },
      { id: 'item_2', plataforma: 'Instagram', formato: 'reel', fecha_sugerida: '2026-03-02', hora_sugerida: '18:00-20:00', tema_central: 'Proceso de producción Licencia P', angulo: 'Behind the scenes del estudio', hook_sugerido: 'Nadie sabe lo que pasó en esta sesión...', referencia_tendencia: 'Reels con texto mínimo + beat' },
      { id: 'item_3', plataforma: 'YouTube', formato: 'video_largo', fecha_sugerida: '2026-03-04', hora_sugerida: '15:00-17:00', tema_central: 'La historia de Licencia P — mini doc', angulo: 'Documental personal, íntimo, honesto', hook_sugerido: 'Esto es lo que nadie te cuenta sobre lanzar música desde cero', referencia_tendencia: 'Mini-documentales de lanzamiento' },
    ],
    estrategia_licencia_p: 'Construir anticipación en 2 semanas con teasers oscuros en TikTok, behind-scenes en IG, y mini-doc en YouTube. Todas las piezas convergen al release date.',
    justificacion: 'El artista está en fase pre-lanzamiento. La estrategia prioriza narrative building y construcción de audiencia fiel antes que volumen de posts.',
  },
  guiones_tiktok: {
    guiones: [
      {
        id: 'tiktok_001',
        parrilla_item_id: 'item_1',
        hook: '[Beat drop] Pausa. Miro la cámara. "Xuxa... ya saben."',
        desarrollo: '[0-3s] Plano cerrado cara, beat building. [3-10s] Cámara se aleja, estudio oscuro, luces de neón. [10-20s] Letra del chorus de Licencia P en pantalla, flow encima. [20-30s] Fade a negro, título "LICENCIA P — PRÓXIMAMENTE"',
        cta: null,
        audio_sugerido: 'Beat original de Licencia P — primeros 30s',
        duracion_estimada_seg: 30,
        modismos_usados: ['xuxa'],
      },
    ],
  },
  contenido_instagram: {
    reels: [
      { id: 'ig_reel_001', guion: '[0-3s] Plano manos en teclado MIDI, iluminación roja. [3-15s] Proceso de armar el beat de Licencia P. [15-25s] Artista escucha el resultado, reacción genuina.', audio: 'Beat de Licencia P instrumental', hook_visual: 'Manos en el MIDI controller en slow motion', estetica: 'Oscuro, rojo/negro, industrial, minimalista' },
    ],
    carrusel: {
      id: 'ig_carrusel_001',
      slides: [
        { numero: 1, copy: 'La vaina que nadie te cuenta sobre hacer música desde cero 🎵', visual_sugerido: 'Fondo negro, texto blanco minimal' },
        { numero: 2, copy: '1. El 90% de los beats que haces no llegan a ningún lado', visual_sugerido: 'Studio con carpetas de proyectos' },
        { numero: 3, copy: '2. La canción que más te gusta nunca es la que más pega', visual_sugerido: 'Pantalla de DAW con proyecto' },
        { numero: 4, copy: '3. La P siempre tiene su propio plan', visual_sugerido: 'Arte oscuro abstracto' },
        { numero: 5, copy: 'Licencia P — próximamente. @abrinay_', visual_sugerido: 'Logo/arte del single' },
      ],
      caption: 'Esto es lo que aprendí haciendo Licencia P. ¿Cuál de estas te pareció? 👇 #rap #colombia #panama #liricaurbana #licenciap',
    },
  },
  contenido_youtube: {
    video_largo: {
      id: 'yt_001',
      titulo_seo: 'Cómo Hice Licencia P: La Historia Detrás del Single | Abrinay',
      descripcion: 'El proceso completo detrás de Licencia P. Desde el primer beat hasta la mezcla final. Sin filtros.\n\n🎵 Licencia P — próximamente en todas las plataformas\n\n📲 Sígueme:\nInstagram: @abrinay_\nTikTok: @abrinay\n\n#Abrinay #LicenciaP #RapColombia',
      escaleta: [
        { timestamp: '00:00', seccion: 'Cold open', descripcion: 'Fragment del beat, corte a negro, título' },
        { timestamp: '00:30', seccion: 'Introducción', descripcion: 'Quién soy, por qué este proyecto importa' },
        { timestamp: '03:00', seccion: 'La idea original', descripcion: 'El momento en que nació Licencia P' },
        { timestamp: '08:00', seccion: 'El proceso de producción', descripcion: 'Sesiones en estudio, decisiones sonoras' },
        { timestamp: '15:00', seccion: 'Las letras', descripcion: 'Qué significan, proceso de escritura' },
        { timestamp: '20:00', seccion: 'El futuro', descripcion: 'Qué viene después del lanzamiento' },
      ],
      gancho_apertura: '¿Cuánto tiempo llevas escuchando música sin saber lo que hay detrás? Esto es lo que nadie te muestra.',
      duracion_estimada_min: 22,
    },
    shorts: [
      { id: 'yt_short_001', titulo: 'El beat que se convirtió en Licencia P 🎵 #shorts', guion: '[0-3s] Plano en el DAW, proyecto original. [3-30s] Play del demo inicial vs la versión final. [30-58s] Reacción y explicación rápida del cambio.', hook_3seg: 'Así sonaba Licencia P antes de ser Licencia P...' },
    ],
  },
}

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callClaude(params: {
  model: string
  messages: ClaudeMessage[]
  maxTokens?: number
  system?: string
  mockKey?: string
}): Promise<string> {
  if (MOCK_MODE) {
    await delay(2000 + Math.random() * 3000)
    const data = MOCK_RESPONSES[params.mockKey ?? 'default'] ?? { message: 'Mock response', timestamp: new Date().toISOString() }
    return JSON.stringify(data)
  }

  const client = await getAnthropicClient()

  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: params.messages,
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}
