import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Mmanwu Reactions Plaza",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <div id="__next">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
