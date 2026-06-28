"use client";

import { useRef, useState } from "react";

/**
 * Capture/upload d'une photo optionnelle, redimensionnée côté client
 * (max 1000px, JPEG ~0.7) puis stockée en data URL dans un champ caché.
 * MVP : stockage en base. En production, basculer vers un stockage objet UE.
 */
export function PhotoInput({ name, label }: { name: string; label: string }) {
  const [preview, setPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await downscale(file, 1000, 0.7);
    setPreview(dataUrl);
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={preview} />
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Aperçu" className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200" />
          <button
            type="button"
            onClick={() => {
              setPreview("");
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="text-sm font-medium text-red-600"
          >
            Retirer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn-secondary w-full"
        >
          📷 Ajouter une photo
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}

function downscale(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(reader.result as string);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
