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
          {children}
        </ProvidersWrapper>
      </body>
    </html>
  );
}
