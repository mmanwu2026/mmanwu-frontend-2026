import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import AuthNavWrapper from "@/components/AuthNavWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
<body className="bg-black text-white" suppressHydrationWarning>
        <UserProvider>
          <AuthNavWrapper />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
