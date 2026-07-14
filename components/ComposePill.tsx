"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function ComposePill() {
  const pathname = usePathname();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // ⭐ Only show in Plaza pages
  if (!pathname || !pathname.startsWith("/plaza")) {
    return null;
  }

  return (
    <>
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]"
          onClick={() => setShowModal(false)}
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
                onClick={() => router.push("/compose")}
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
              onClick={() => setShowModal(false)}
              className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="fixed top-16 left-0 right-0 flex justify-center z-50">
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700"
        >
          + Compose
        </button>
      </div>
    </>
  );
}
