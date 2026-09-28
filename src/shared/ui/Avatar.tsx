export function Avatar({ name, id }: { name: string; id: string }) {
  const color = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5;
  const initials = name
    .replace(/^[@+]/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span className={`avatar avatar-${color}`} aria-hidden="true">
      {initials}
    </span>
  );
}
