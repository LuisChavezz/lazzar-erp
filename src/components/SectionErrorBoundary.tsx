"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  /** Qué pintar en lugar de la sección; `reset` vuelve a intentar montarla. */
  fallback: (reset: () => void) => ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

/**
 * Límite de error de UNA sección: si su render lanza, pinta `fallback` en su
 * lugar y el resto de la página sigue funcionando. Sin él, un error de render
 * sube hasta la raíz (la app no tiene `error.tsx`) y tira la pantalla entera.
 * Solo atrapa errores de RENDER (y de ciclo de vida); los de una consulta los
 * maneja su hook. React no ofrece límites de error como hook, de ahí la clase.
 */
export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error al mostrar la sección", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) return this.props.fallback(this.reset);
    return this.props.children;
  }
}
