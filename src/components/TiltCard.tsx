"use client";

import { useRef, useEffect } from "react";
import { ChevronRightIcon } from "./Icons";

interface TiltCardProps {
  title: string;
  description?: string;
  footerText?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  accentBgClass: string;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  href?: string;
  shadowColorClassName?: string;
}

export default function TiltCard({
  title,
  description,
  footerText,
  icon: Icon,
  accentClass,
  accentBgClass,
  className = "",
  onClick,
  onMouseEnter,
  href,
  shadowColorClassName,
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
  const shadowClassName = shadowColorClassName
    ? `shadow-sm hover:shadow-xl dark:shadow-none ${shadowColorClassName}`
    : "";

  return (
    <Component
      ref={cardRef}
      href={href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`block relative transition-all duration-300 group ${shadowClassName} ${className}`}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      <div className="h-full flex flex-col" style={{ transform: "translateZ(20px)" }}>
        <div className={`mb-6 w-14 h-14 rounded-full ${accentBgClass} flex items-center justify-center ${accentClass}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {footerText && (
          <div
            className={`mt-auto pt-8 flex items-center ${accentClass} text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0`}
          >
            <span>{footerText}</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </div>
    </Component>
  );
}
