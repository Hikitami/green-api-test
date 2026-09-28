export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-icon ${large ? 'brand-icon-large' : ''}`} aria-hidden="true">
      <img src="/favicon.svg" alt="" width={64} height={64} />
    </span>
  );
}
