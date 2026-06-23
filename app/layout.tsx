import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Mmanwu Reactions Plaza",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
