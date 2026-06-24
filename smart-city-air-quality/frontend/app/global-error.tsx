'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>
          Something went wrong!
        </h2>
        <p style={{ color: '#94a3b8' }}>{error.message}</p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
