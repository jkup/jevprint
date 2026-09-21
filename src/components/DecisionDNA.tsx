import type { Analysis } from '../../shared/schema';
import { MODES, registry } from '../../shared/questions';

export function DecisionDNA({ analysis }: { analysis: Analysis }) {
  const values = registry.flatMap((q) => {
    const a = analysis.result.answers[q.id];
    return a.type === 'noul'
      ? [1 - a.noul, a.noul]
      : a.type === 'choice'
        ? MODES.map((key) => a.probabilities[key])
        : Array.from(
            { length: Object.keys(a.legend).length },
            (_, i) => a.probabilities[String(i)],
          );
  });
  return (
    <svg
      className="dna"
      viewBox={`0 0 ${values.length * 4} 34`}
      role="img"
      aria-label="Decision DNA: compact probability signature. Exact values are available in X-RAY."
    >
      {values.map((p, i) => (
        <line
          key={i}
          x1={i * 4 + 1}
          x2={i * 4 + 1}
          y1={17 - (3 + p * 14)}
          y2={17 + (3 + p * 14)}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity={0.25 + p * 0.75}
        />
      ))}
    </svg>
  );
}
