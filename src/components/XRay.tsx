import { useState } from 'react';
import { registry } from '../../shared/questions';
import type { Analysis } from '../../shared/schema';

export function XRay({ analysis, onClose }: { analysis: Analysis; onClose: () => void }) {
  const [selected, setSelected] = useState('primary_mode');
  const definition = registry.find((q) => q.id === selected)!;
  const answer = analysis.result.answers[selected];
  return (
    <section className="xray panel" aria-label="X-RAY decisions">
      <div className="panel-heading">
        <span className="eyebrow">Beneath the surface</span>
        <button onClick={onClose} aria-label="Close X-RAY">
          ×
        </button>
      </div>
      <h2>Why this shape?</h2>
      <p className="muted small">{analysis.title}</p>
      <label className="eyebrow" htmlFor="dimension">
        Explore a decision
      </label>
      <select id="dimension" value={selected} onChange={(event) => setSelected(event.target.value)}>
        {['Form', 'Motion', 'Signal', 'Intent'].map((group) => (
          <optgroup label={group} key={group}>
            {registry
              .filter((q) => q.group === group)
              .map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <div className="decision-reading">
        <span>{definition.label}</span>
        <strong>
          {answer.type === 'score'
            ? `${answer.score.toFixed(2)} / 4`
            : answer.type === 'noul'
              ? `${Math.round(answer.noul * 100)}%`
              : answer.choice}
        </strong>
      </div>
      <p className="effect">{definition.effect}</p>
      <div className="probabilities">
        {(answer.type === 'noul'
          ? ([
              ['Yes', answer.noul],
              ['No', 1 - answer.noul],
            ] as const)
          : Object.entries(answer.probabilities)
        ).map(([label, value]) => (
          <div className="probability" key={label}>
            <div>
              <span>{answer.type === 'score' ? `${label} · ${answer.legend[label]}` : label}</span>
              <span>{(value * 100).toFixed(1)}%</span>
            </div>
            <div className="probability-track">
              <i style={{ width: `${value * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {answer.type !== 'noul' && (
        <p className="small muted">
          Model confidence {answer.confidence.toFixed(2)} · A measure of probability concentration,
          not correctness.
        </p>
      )}
      <div className="xray-footer">
        <span>{analysis.result.model}</span>
        <span>Question set {analysis.questionSetVersion}</span>
      </div>
    </section>
  );
}
