import Redirector from "./redirector";

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
        textAlign: "center",
        padding: "20px",
      }}
    >
      <img
        src="/icons/icon-192x192.png"
        alt="Mman Plaza"
        style={{ width: 96, height: 96, marginBottom: 20 }}
      />

      <div style={{ marginBottom: 10 }}>
        <strong>Welcome to Mman Plaza</strong>
      </div>

      <div style={{ opacity: 0.8 }}>
        Preparing your experience…
      </div>

      {/* Client-side redirect */}
      <Redirector />
    </div>
  );
}
