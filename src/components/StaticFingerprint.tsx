import { interpolate, point, SEGMENTS, STRANDS, type Fingerprint } from '../../shared/fingerprint';

/** A lightweight projection of the same semantic geometry, also used while WebGL loads. */
export function StaticFingerprint({
  a,
  b,
  blend,
  message,
}: {
  a: Fingerprint;
  b: Fingerprint;
  blend: number;
  message?: string;
}) {
  const f = interpolate(a, b, blend);
  const color = `rgb(${f.color.map((v) => Math.round(v * 255)).join(' ')})`;
  return (
    <div className="static-fingerprint">
      <svg viewBox="-2 -2 4 4" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => {
          const strand = Math.floor((i * STRANDS) / 24);
          const path = Array.from({ length: 81 }, (_, j) => {
            const [x, y, z] = point(f, strand, (j * SEGMENTS) / 80);
            return `${j === 0 ? 'M' : 'L'}${(x + z * 0.25).toFixed(4)},${(-y + z * 0.2).toFixed(4)}`;
          }).join(' ');
          return (
            <path key={i} d={path} fill="none" stroke={color} strokeWidth="0.003" opacity="0.65" />
          );
        })}
      </svg>
      {message && <p>{message}</p>}
    </div>
  );
}
