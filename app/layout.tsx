import "./globals.css";
import type { Metadata } from "next";
import ProvidersWrapper from "./providers-wrapper";

export const metadata: Metadata = {
  title: "Mmanwu Reactions Plaza",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <ProvidersWrapper>
          {/* ⭐ Remove <main> as a layout box — it was the containing block */}
          <div className="contents">
            {children}
          </div>

          {/* ⭐ Modal root stays inside ProvidersWrapper */}
          <div id="modal-root"></div>
        </ProvidersWrapper>
      </body>
    </html>
  );
}
