"use client";

/**
 * GalleryImageItem.tsx
 * Miniatura de imagen de galería, extraída como componente memoizado para
 * evitar re-renders cuando el estado del padre (mode, isUploading, etc.) cambia.
 * Se usa conjuntamente con TanStack Virtual en EmbroideryImageSelector.
 */
import { memo } from "react";
import Image from "next/image";
import type { NgrokImageItem } from "../services/ngrok.actions";

const NGROK_BASE_URL = process.env.NEXT_PUBLIC_NGROK_BASE_URL ?? "";

const externalImageLoader = ({ src }: { src: string }) => src;

interface GalleryImageItemProps {
  item: NgrokImageItem;
  onSelect: (item: NgrokImageItem) => void;
}

export const GalleryImageItem = memo(function GalleryImageItem({
  item,
  onSelect,
}: GalleryImageItemProps) {
  const fullUrl = `${NGROK_BASE_URL}${item.url}`;

  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={() => onSelect(item)}
      title={item.nombre}
      className="group flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-violet-400 dark:hover:border-violet-500/50 hover:bg-violet-50/60 dark:hover:bg-violet-500/5 hover:shadow-sm transition-[border-color,background-color,box-shadow] duration-150 cursor-pointer"
    >
      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-zinc-800">
        <Image
          loader={externalImageLoader}
          unoptimized
          loading="lazy"
          decoding="async"
          src={fullUrl}
          alt={item.nombre}
          fill
          sizes="96px"
          className="object-contain group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <span className="w-full text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate leading-tight text-center px-0.5">
        {item.nombre}
      </span>
    </button>
  );
});
