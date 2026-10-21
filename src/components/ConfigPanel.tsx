import { useState, type Dispatch } from 'react';
import { ALPHABET, ROTOR_IDS, type RotorId } from '../core/catalog';
import { validateConfig, type EnigmaConfig, type Positions } from '../core/enigma';
import type { Action } from '../session';
import { Icon } from './Icon';
import s from '../App.module.css';

const slots = ['左', '中', '右'];
export function ConfigPanel({ draft, applied, dispatch }: { draft: EnigmaConfig; applied: EnigmaConfig; dispatch: Dispatch<Action> }) {
  const [pair, setPair] = useState(['', '']);
  const [plugError, setPlugError] = useState('');
  const [expanded, setExpanded] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const used = new Set(draft.plugboard.flat());
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const validation = validateConfig(draft);

  function update(config: EnigmaConfig) {
    dispatch({ type: 'draft', config });
    setPlugError('');
  }
  function setTriple(field: 'rings' | 'initialPositions', index: number, value: number) {
    const values = [...draft[field]];
    values[index] = value;
    update({ ...draft, [field]: values as unknown as Positions });
  }
  function swap(index: number) {
    const rotors = [...draft.rotors] as [RotorId, RotorId, RotorId];
    [rotors[index], rotors[index + 1]] = [rotors[index + 1], rotors[index]];
    // Ring and initial-position settings belong to the physical rotor being moved.
    const rings = [...draft.rings] as [number, number, number];
    const positions = [...draft.initialPositions] as [number, number, number];
    [rings[index], rings[index + 1]] = [rings[index + 1], rings[index]];
    [positions[index], positions[index + 1]] = [positions[index + 1], positions[index]];
    update({ ...draft, rotors, rings, initialPositions: positions });
  }
  function addPair() {
    const config: EnigmaConfig = { ...draft, plugboard: [...draft.plugboard, [pair[0], pair[1]]] };
    const result = validateConfig(config);
    if (!result.valid) { setPlugError(result.errors.map(e => e.message).join(' ')); return; }
    update(config); setPair(['', '']);
  }

  return <details className={s.config} open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary className={s.configSummary}>
      <span><span className={s.eyebrow}>MACHINE SETTINGS</span><span className={s.configTitle}>机器配置 <Icon name="settings" /></span></span>
      <Icon name="chevron" />
    </summary>
    <div className={s.configBody}>
      <div className={s.configStatus}><span className={dirty ? s.pendingDot : s.appliedDot} />{dirty ? '有未应用的修改' : '当前配置已应用'}<span className={s.fixedBadge}>UKW · B</span></div>
      <div className={s.sectionHeading}><h3>转子设置</h3><span>左 → 右</span></div>
      <div className={s.rotorFields}>
        {slots.map((slot, index) => <div className={s.rotorColumn} key={slot}>
          <span className={s.slotLabel}>{slot}转子</span>
          <label>型号<select aria-label={`${slot}转子型号`} value={draft.rotors[index]} onChange={event => {
            const rotors = [...draft.rotors] as [RotorId, RotorId, RotorId];
            rotors[index] = event.target.value as RotorId;
            update({ ...draft, rotors });
          }}>{ROTOR_IDS.map(id => <option key={id} value={id} disabled={draft.rotors.some((r, i) => i !== index && r === id)}>{id}</option>)}</select></label>
          <label>环位<select aria-label={`${slot}转子环位`} value={draft.rings[index]} onChange={event => setTriple('rings', index, Number(event.target.value))}>{[...ALPHABET].map((letter, n) => <option key={letter} value={n}>{String(n + 1).padStart(2, '0')}</option>)}</select></label>
          <label>初始位置<select aria-label={`${slot}转子初始位置`} value={draft.initialPositions[index]} onChange={event => setTriple('initialPositions', index, Number(event.target.value))}>{[...ALPHABET].map((letter, n) => <option key={letter} value={n}>{letter}</option>)}</select></label>
        </div>)}
      </div>
      <div className={s.swapRow}><button type="button" onClick={() => swap(0)} aria-label="交换左、中转子">← 交换 →</button><button type="button" onClick={() => swap(1)} aria-label="交换中、右转子">← 交换 →</button></div>
      <p className={s.fieldHint}>环位调整内部接线；初始位置决定消息的起点。</p>
      <div className={s.sectionHeading}><h3>插线板</h3><span>{draft.plugboard.length} / 10 对</span></div>
      <div className={s.plugEntries}>
        {[0, 1].map(index => <select key={index} aria-label={`插线字母${index + 1}`} value={pair[index]} onChange={event => { const values = [...pair]; values[index] = event.target.value; setPair(values); setPlugError(''); }}>
          <option value="">字母</option>{[...ALPHABET].map(letter => <option key={letter} disabled={used.has(letter)}>{letter}</option>)}
        </select>)}
        <button type="button" aria-label="连接字母" className={s.addPair} disabled={!pair[0] || !pair[1]} onClick={addPair}>连接 <span aria-hidden="true">＋</span></button>
      </div>
      <div className={s.plugPairs} aria-label="已配置的插线">
        {draft.plugboard.length === 0 ? <span className={s.emptyPlugs}>尚未连接 · 字母直接通过</span> : draft.plugboard.map(([a, b], index) => <button type="button" key={`${a}${b}`} aria-label={`移除插线 ${a}${b}`} onClick={() => update({ ...draft, plugboard: draft.plugboard.filter((_, i) => i !== index) })}>{a}<span>↔</span>{b}<Icon name="close" size={12} /></button>)}
      </div>
      {plugError && <p role="alert" className={s.configError}>{plugError}</p>}
      {!validation.valid && <p role="alert" className={s.configError}>{validation.errors.map(e => e.message).join(' ')}</p>}
      <p className={s.fieldHint}>每个字母只能连接一次，修改后需应用配置。</p>
      <button type="button" className={s.applyButton} disabled={!validation.valid} onClick={() => dispatch({ type: 'apply' })}>应用配置 <Icon name="arrow" /></button>
      <p className={s.configFootnote}>应用后，现有消息将从初始位置重新计算。</p>
    </div>
  </details>;
}
