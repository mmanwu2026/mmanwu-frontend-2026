"use client";

import { useRouter } from "next/navigation";

export default function CreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Create
        </h2>

        <div className="space-y-3">

          <button
            onClick={() => router.push("/plaza/compose")}
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700"
          >
            Plaza Post
          </button>

          <button
            onClick={() => router.push("/vision-square/create")}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Vision Upload
          </button>

          <button
            onClick={() => router.push("/sound-square/create")}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            Sound Upload
          </button>

        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
