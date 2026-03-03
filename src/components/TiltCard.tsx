"use client";

import { useRef, useEffect } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}

export default function TiltCard({
  children,
  className = "",
  onClick,
  href,
}: TiltCardProps) {
  // Referencias para animación sin recalcular en cada render
  const cardRef = useRef<HTMLDivElement & HTMLAnchorElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastEventRef = useRef<MouseEvent | null>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    // Solo activar en dispositivos con puntero fino
    if (!window.matchMedia?.("(pointer: fine)")?.matches) return;

    const threshold = 15;

    const handleMouseMove = (e: MouseEvent) => {
      // Guardar último evento y sincronizar con RAF
      lastEventRef.current = e;
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        const rect = rectRef.current;
        const event = lastEventRef.current;
        if (!rect || !event) {
          frameRef.current = null;
          return;
        }
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        const rotateX = y * -threshold;
        const rotateY = x * threshold;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        frameRef.current = null;
      });
    };

    const handleMouseEnter = () => {
      // Capturar rect una sola vez al entrar
      rectRef.current = card.getBoundingClientRect();
      card.style.transition = "none";
    };

    const handleMouseLeave = () => {
      // Limpiar estado y resetear transformación
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      rectRef.current = null;
      lastEventRef.current = null;
      card.style.transition = "transform 0.5s ease";
      card.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseenter", handleMouseEnter);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseenter", handleMouseEnter);
      card.removeEventListener("mouseleave", handleMouseLeave);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  const Component = href ? "a" : "div";

  return (
    <Component
      ref={cardRef}
      href={href}
      onClick={onClick}
      className={`block relative transition-all duration-300 ${className}`}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      <div className="h-full" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </Component>
  );
}
