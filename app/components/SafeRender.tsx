"use client";

export default function SafeRender({ children }: { children: any }) {
  try {
    return children;
  } catch (err) {
    console.error("VisionCard render error:", err);
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        VisionCard failed to render.
      </div>
    );
  }
}
