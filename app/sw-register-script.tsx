export default function SWRegisterScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
              .catch(err => console.error('SW registration failed:', err));
          }
        `,
      }}
    />
  );
}
