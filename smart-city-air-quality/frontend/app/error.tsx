'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '1rem',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>
        Something went wrong!
      </h2>
      <p style={{ color: '#6b7280' }}>{error.message}</p>
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
    </div>
  );
}
