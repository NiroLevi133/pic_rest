import { NextResponse } from 'next/server';

// Health check endpoint — GET /
export default function Page() {
  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>Restorante Mobile API</h1>
      <p>Backend is running. Use <code>/api/*</code> endpoints.</p>
    </div>
  );
}
