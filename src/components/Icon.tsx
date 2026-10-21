import type { CSSProperties } from 'react';

type Name = 'rotor' | 'arrow' | 'copy' | 'reset' | 'close' | 'lock' | 'chevron' | 'check' | 'settings';
const paths: Record<Name, string> = {
  rotor: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  copy: 'M9 9h11v12H9zM15 9V3H3v12h6',
  reset: 'M3 10a9 9 0 1 1 2 8M3 3v7h7',
  close: 'm6 6 12 12M6 18 18 6',
  lock: 'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4',
  chevron: 'm6 9 6 6 6-6',
  check: 'm5 12 4 4L19 6',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
};
export function Icon({ name, size = 18, style }: { name: Name; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
