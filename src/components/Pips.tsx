export function Pips({ tier, on, off, className }: { tier: number; on: string; off: string; className: string }) {
  return (
    <span className={className}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ background: i <= tier ? on : off }} />
      ))}
    </span>
  );
}
