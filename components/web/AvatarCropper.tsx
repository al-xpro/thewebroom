"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FRAME = 256;
const OUTPUT = 512;

interface AvatarCropperProps {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => Promise<void>;
}

// Frames a new profile photo: drag to move it, zoom with the slider or the wheel. The photo
// always covers the round frame, and is saved as a 512×512 square.
export function AvatarCropper({ file, onCancel, onDone }: AvatarCropperProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Shows the photo once it has loaded.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setUrl(objectUrl);
    image.src = objectUrl;
    return () => {
      image.onload = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Scale at which the photo just covers the frame, times the zoom.
  const scale = size ? Math.max(FRAME / size.w, FRAME / size.h) * zoom : 1;

  const clamp = (x: number, y: number, s = scale) => {
    if (!size) return { x: 0, y: 0 };
    const maxX = Math.max(0, (size.w * s - FRAME) / 2);
    const maxY = Math.max(0, (size.h * s - FRAME) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const setZoomClamped = (next: number) => {
    const z = Math.min(3, Math.max(1, next));
    setZoom(z);
    if (size) setOffset((o) => clamp(o.x, o.y, Math.max(FRAME / size.w, FRAME / size.h) * z));
  };

  const save = async () => {
    const image = imageRef.current;
    if (!image || !size) return;
    // The frame's top-left corner in the photo's own pixels.
    const left = FRAME / 2 - (size.w * scale) / 2 + offset.x;
    const top = FRAME / 2 - (size.h * scale) / 2 + offset.y;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    canvas.getContext("2d")?.drawImage(image, -left / scale, -top / scale, FRAME / scale, FRAME / scale, 0, 0, OUTPUT, OUTPUT);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", 0.9)
    );
    const result =
      blob?.type === "image/webp"
        ? blob
        : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!result) return;
    setSaving(true);
    try {
      await onDone(result);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-white p-6 dark:bg-black">
        <h2 id="crop-title" className="type-heading">Photo</h2>

        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-[#F5F5F5] dark:bg-[#0A0A0A] cursor-grab active:cursor-grabbing"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setOffset(clamp(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y));
          }}
          onPointerUp={() => (drag.current = null)}
          onWheel={(e) => setZoomClamped(zoom - e.deltaY * 0.002)}
        >
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imageRef}
              src={url}
              alt="Your new photo"
              draggable={false}
              onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="absolute left-1/2 top-1/2 max-w-none"
              style={
                size
                  ? {
                      width: size.w * scale,
                      height: size.h * scale,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    }
                  : { opacity: 0 }
              }
            />
          )}
        </div>

        <label className="flex items-center gap-3">
          <span className="type-meta">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            className="flex-1 accent-black dark:accent-white"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!size || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
