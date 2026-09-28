import { Send } from 'lucide-react';

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-icon ${large ? 'brand-icon-large' : ''}`} aria-hidden="true">
      <Send strokeWidth={1.7} />
    </span>
  );
}
