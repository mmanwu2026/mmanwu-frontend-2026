"use client";

export default function Home() {
  return (
    <div
      style={{
        background: "black",
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "1.5rem",
      }}
    >
      <img
        src="/icons/icon-192x192.png"
        alt="Mman Plaza"
        style={{ width: 96, height: 96, marginBottom: 20 }}
      />
      <div>Loading Mman Plaza…</div>
    </div>
  );
}
