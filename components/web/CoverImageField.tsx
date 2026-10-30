"use client";

import { ImagePlus } from "lucide-react";
import { FadeImage } from "@/components/ui/fade-image";

interface CoverImageFieldProps {
  previewUrl: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
}

const pill =
  "rounded-full bg-white/85 dark:bg-black/75 backdrop-blur px-3 py-1.5 text-xs font-medium text-black dark:text-white cursor-pointer hover:bg-white dark:hover:bg-black";

// A post's cover image: click or drop to pick one; Change and Remove once it's there.
export function CoverImageField({ previewUrl, onPick, onRemove }: CoverImageFieldProps) {
  return (
    <div
      className="relative h-[280px] w-full overflow-hidden rounded-xl bg-[#F5F5F5] dark:bg-[#0A0A0A] sm:h-[380px]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onPick(file);
      }}
    >
      <input
        type="file"
        accept="image/*"
        id="image"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />

      {previewUrl ? (
        <>
          <FadeImage src={previewUrl} alt="Cover" fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
          <div className="absolute right-3 top-3 flex gap-2">
            <label htmlFor="image" className={pill}>
              Change
            </label>
            <button type="button" onClick={onRemove} className={pill}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <label
          htmlFor="image"
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 text-[#A0A0A0] hover:text-black dark:text-[#666666] dark:hover:text-white transition-colors"
        >
          <ImagePlus className="size-6" />
          <span className="text-sm font-light">Cover</span>
        </label>
      )}
    </div>
  );
}
