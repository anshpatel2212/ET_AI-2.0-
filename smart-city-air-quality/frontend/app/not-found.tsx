import Link from 'next/link';

export default function NotFound() {
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
      <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
        404
      </h2>
      <p style={{ color: '#94a3b8' }}>Page not found</p>
      <Link
        href="/"
        style={{
          padding: '0.5rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontSize: '1rem',
        }}
      >
        Go Home
      </Link>
    </div>
  );
}
