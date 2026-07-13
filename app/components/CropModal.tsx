"use client";

import Cropper from "react-easy-crop";
import { useState } from "react";

export default function CropModal({
  src,
  cancel,
  cropDone,
}: {
  src: string;
  cancel: () => void;
  cropDone: (crop: any, zoom: number) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // NEW: Track when cropper is ready
  const [cropReady, setCropReady] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-black p-4 rounded-lg w-[90vw] max-w-md space-y-4">

        {/* Visible cropper viewport — pinch-to-zoom enabled */}
        <div className="relative w-full h-[320px] bg-black z-[99999]">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            minZoom={1}
            maxZoom={4}
            restrictPosition={false}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onMediaLoaded={() => setCropReady(true)}   // enables Save
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={cancel}
            className="px-3 py-1 bg-white/20 rounded text-sm"
          >
            Cancel
          </button>

          <button
            disabled={!cropReady}
            onClick={() => cropDone(crop, zoom)}
            className={`px-3 py-1 rounded text-sm ${
              cropReady
                ? "bg-blue-500"
                : "bg-blue-500/40 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
}
