import { useRef } from "react";

interface Props {
  onCaptured: (jpegBase64: string) => void;
}

// Force a 35x45 mm portrait crop (ID-photo ratio = 7:9).
const TARGET_W = 350;
const TARGET_H = 450;

export function PhotoCapturePicker({ onCaptured }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    inputRef.current?.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const cropped = await cropTo35x45(file);
    onCaptured(cropped);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={open}
        className="text-xs px-2 py-1 rounded border bg-white hover:bg-neutral-50"
      >
        📷 Capture / Retake
      </button>
    </>
  );
}

async function cropTo35x45(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const srcRatio = img.width / img.height;
    const targetRatio = TARGET_W / TARGET_H;
    let sx = 0,
      sy = 0,
      sw = img.width,
      sh = img.height;
    if (srcRatio > targetRatio) {
      // too wide — crop sides
      sw = img.height * targetRatio;
      sx = (img.width - sw) / 2;
    } else {
      // too tall — crop top/bottom (bias toward upper third for face)
      sh = img.width / targetRatio;
      sy = Math.max(0, (img.height - sh) / 3);
    }
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}