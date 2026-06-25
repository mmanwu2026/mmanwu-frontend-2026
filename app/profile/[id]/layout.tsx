export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen max-w-2xl mx-auto px-4 py-6 space-y-6">
      {children}
    </div>
  );
}
