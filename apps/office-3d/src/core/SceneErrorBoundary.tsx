import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

// ErrorBoundary para la escena 3D — evita que un error de WebGL/R3F
// derribe toda la aplicación. Muestra un fallback DOM en su lugar.
export class SceneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Scene] Error 3D:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#ff4d8d',
          fontFamily: 'monospace',
          gap: 16,
        }}>
          <div style={{ fontSize: 32 }}>⚠</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Error en la escena 3D</div>
          <div style={{
            fontSize: 11,
            color: '#666',
            maxWidth: 400,
            textAlign: 'center',
            padding: '0 24px',
          }}>
            {this.state.message || 'Error desconocido de WebGL'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid #ff4d8d',
              borderRadius: 6,
              color: '#ff4d8d',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
