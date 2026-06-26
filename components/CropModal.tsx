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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-black p-4 rounded-lg w-[90vw] max-w-md space-y-4">

        <div className="relative w-full h-64 bg-black">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
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
            onClick={() => cropDone(crop, zoom)}
            className="px-3 py-1 bg-blue-500 rounded text-sm"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
}
