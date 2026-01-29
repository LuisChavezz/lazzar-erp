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
  const cardRef = useRef<HTMLDivElement & HTMLAnchorElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const threshold = 15;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const rotateX = y * -threshold;
      const rotateY = x * threshold;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseEnter = () => {
      card.style.transition = "none";
    };

    const handleMouseLeave = () => {
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
    };
  }, []);

  const Component = href ? "a" : "div";

  return (
    <Component
      ref={cardRef}
      href={href}
      onClick={onClick}
      className={`block relative transition-all duration-300 ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="h-full" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </Component>
  );
}
