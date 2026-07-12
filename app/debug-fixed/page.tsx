export default function DebugFixed() {
  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900">
      <div className="h-[200vh] p-4">
        <p>Scroll me. This is a debug page.</p>
      </div>

      <nav
        className="
          fixed left-0 right-0 bottom-0
          bg-blue-600 text-white
          flex justify-center items-center
          py-3
          z-[9999]
        "
      >
        Debug Bottom Bar
      </nav>
    </div>
  );
}
