import Link from 'next/link';
export default function NotFound() {
  return <main style={{ padding: '4rem', fontFamily: 'system-ui' }}><h1>Page not found</h1><p>This page may have moved.</p><Link href="/">Return to the workspace</Link></main>;
}
