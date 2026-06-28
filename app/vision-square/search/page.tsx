"use client";

import { Suspense } from "react";
import SearchComponent from "./SearchComponent";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading search…</div>}>
      <SearchComponent />
    </Suspense>
  );
}
