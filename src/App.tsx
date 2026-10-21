import { useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ALPHABET } from './core/catalog';
import { displayPositions, MAX_MESSAGE_LENGTH, processMessage } from './core/enigma';
import { initialSession, sessionReducer } from './session';
import { ConfigPanel } from './components/ConfigPanel';
import { Icon } from './components/Icon';
import s from './App.module.css';

const keyboardRows = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];
const slotNames = ['左', '中', '右'];

export default function App() {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const result = useMemo(() => processMessage(state.applied, state.message), [state.applied, state.message]);
  const [composition, setComposition] = useState<string | null>(null);
  const composing = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<{ start: number; end: number; direction: 'forward' | 'backward' | 'none' } | null>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const currentMessage = composition ?? state.message;

  // ASCII normalization preserves length. Restore the caret after React updates
  // the controlled value, including edits in the middle of an existing message.
  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    if (selection && document.activeElement === inputRef.current) {
      inputRef.current?.setSelectionRange(selection.start, selection.end, selection.direction);
    }
    pendingSelection.current = null;
  }, [state, composition]);

  function commitMessage(element: HTMLTextAreaElement) {
    pendingSelection.current = { start: element.selectionStart, end: element.selectionEnd, direction: element.selectionDirection };
    dispatch({ type: 'message', value: element.value });
  }

  function clearMessage(reset = false) {
    composing.current = false;
    pendingSelection.current = null;
    setComposition(null);
    dispatch({ type: reset ? 'reset' : 'clear' });
  }
  async function copyResult() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(result.output);
      dispatch({ type: 'notice', value: '结果已复制。' });
    } catch {
      outputRef.current?.focus(); outputRef.current?.select();
      dispatch({ type: 'notice', value: '无法访问剪贴板，已选中结果，请手动复制。' });
    }
  }

  return <div className={s.app}>
    <header className={s.header}>
      <a href="#" className={s.brand} aria-label="Enigma 密码机工坊首页"><span className={s.brandMark}><Icon name="rotor" size={26} /></span><span>ENIGMA<span className={s.brandSub}>密码机工坊</span></span></a>
      <nav aria-label="页面导航"><a href="#workbench" className={s.activeLink}>操作台</a><a href="#guide">使用指南 <span aria-hidden="true">↗</span></a></nav>
      <span className={s.localBadge}><span /> 本地运行 <Icon name="lock" size={13} /></span>
    </header>

    <main>
      <section className={s.intro} aria-labelledby="page-title">
        <div><div className={s.kicker}><span /> A MACHINE. A MILLION POSSIBILITIES.</div><h1 id="page-title">Enigma<span className={s.titleDot}>.</span></h1><p className={s.subtitle}>每一次按键，都是新的秘密。</p></div>
        <div className={s.introAside}><span className={s.modelTag}>MODEL I <span>·</span> THREE ROTORS</span><p>转动历史的齿轮，亲手编写密文。<br />一台经典密码机，在你的浏览器中重现。</p><span className={s.introMeta}>准确模拟 / 即时转换 / 无需联网运算</span></div>
      </section>

      <div className={s.workbenchHeading} id="workbench"><h2><span className={s.numberLabel}>01</span> 密码机操作台</h2><span>ENIGMA I <span className={s.dim}>/</span> READY TO ENCODE</span></div>

      <div className={s.workspace}>
          <section className={s.rotorPanel} aria-label="机器运行状态">
            <span className={`${s.screw} ${s.screwTl}`} aria-hidden="true" /><span className={`${s.screw} ${s.screwTr}`} aria-hidden="true" />
            <div className={s.panelLabel}><span>WALZENLAGE <span className={s.labelDivider}>/</span> 转子窗口</span><span className={s.liveTag}><span /> 已处理 {result.processedCount} 个字母</span></div>
            <div className={s.rotorAssembly}>
              <div className={s.rotorGroup}>
                {result.finalPositions.map((position, index) => <div key={index} className={s.rotorUnit}>
                  <span className={s.rotorRoman}>{state.applied.rotors[index]}</span>
                  <div className={s.rotorHousing}><div className={s.rotorTeeth} /><div className={s.rotorStrip}><span className={s.adjacentLetter} aria-hidden="true">{ALPHABET[(position + 25) % 26]}</span><span className={s.rotorLetter} aria-label={`${slotNames[index]}转子当前位置`}>{ALPHABET[position]}</span><span className={s.adjacentLetter} aria-hidden="true">{ALPHABET[(position + 1) % 26]}</span></div><span className={s.rotorIndex} aria-hidden="true" /></div>
                  <span className={s.rotorBottom}>{slotNames[index]}转子 <span>·</span> {String(state.applied.rings[index] + 1).padStart(2, '0')}</span>
                </div>)}
              </div>
              <div className={s.serialPlate}><Icon name="rotor" size={25} /><strong>ENIGMA</strong><span>CHIFFRIERMASCHINE</span><small>Nr. 001 / TYPE I</small></div>
            </div>
            <div className={s.positionNote}><span>初始位置 <strong>{displayPositions(state.applied.initialPositions)}</strong></span><span>窗口显示运算后的位置 <span aria-hidden="true">↗</span></span></div>
          </section>

        <section className={s.messages} aria-label="消息编辑">
          <div className={s.messageToolbar}><h2><span className={s.numberLabel}>02</span> 消息工作区</h2><div><button type="button" onClick={() => clearMessage()} disabled={!currentMessage}><Icon name="close" size={15} />清空消息</button><button type="button" onClick={() => clearMessage(true)}><Icon name="reset" size={15} />恢复默认</button></div></div>
          <div className={s.messageGrid}>
            <div className={s.paperCard}>
              <div className={s.paperHeader}><label htmlFor="message-input"><span className={s.paperDot} /> 输入消息 <span>INPUT</span></label><span className={s.messageCount}>{currentMessage.length.toLocaleString()} / 10,000</span></div>
              <textarea ref={inputRef} id="message-input" aria-describedby="input-rules input-error" aria-invalid={Boolean(state.error)} spellCheck={false} autoCapitalize="characters" autoComplete="off" placeholder="在这里写下你的秘密…" value={currentMessage}
                onCompositionStart={() => { composing.current = true; setComposition(state.message); }}
                onCompositionEnd={event => { composing.current = false; setComposition(null); commitMessage(event.currentTarget); }}
                onChange={event => { if (composing.current) setComposition(event.target.value); else { setComposition(null); commitMessage(event.currentTarget); } }}
                onPaste={event => {
                  const element = event.currentTarget;
                  const insertion = event.clipboardData.getData('text');
                  const nextLength = element.value.length - (element.selectionEnd - element.selectionStart) + insertion.length;
                  if (nextLength > MAX_MESSAGE_LENGTH) {
                    event.preventDefault();
                    dispatch({ type: 'rejectMessage' });
                  }
                }} />
              <div className={s.paperFooter}><span>支持键盘输入与粘贴</span><span>A–Z <Icon name="arrow" size={13} /> A–Z</span></div>
            </div>
            <div className={`${s.paperCard} ${s.resultCard}`}>
              <div className={s.paperHeader}><label htmlFor="message-output"><span className={s.paperDot} /> 转换结果 <span>OUTPUT</span></label><button type="button" className={s.copyButton} onClick={copyResult} disabled={!result.output}><Icon name="copy" size={15} />复制结果</button></div>
              <textarea ref={outputRef} id="message-output" readOnly spellCheck={false} placeholder="密文将在这里浮现…" value={result.output} />
              <div className={s.paperFooter}><span><Icon name="lock" size={12} /> 仅在此浏览器中处理</span><span>{result.processedCount} 个字母已转换</span></div>
            </div>
          </div>
          <div className={s.messageRules} id="input-rules"><Icon name="check" size={15} /><span>英文字母自动大写；空格、数字、标点及中文保持原样，不推动转子。</span></div>
          <p id="input-error" role={state.error ? 'alert' : undefined} className={s.error}>{state.error}</p>
          <p role="status" className={s.notice}>{state.notice}</p>
        </section>

          <section className={s.consolePanel} aria-label="灯板与屏幕键盘">
            <div className={s.panelLabel}><span>LAMPENFELD <span className={s.labelDivider}>/</span> 输出灯板</span><span className={s.outputTag}>{result.lastOutput ? <>最近输出 <strong>{result.lastOutput}</strong></> : '等待输入'}</span></div>
            <div className={s.lampBoard} aria-label="输出灯板">
              {keyboardRows.map(row => <div className={s.letterRow} key={row}>{[...row].map(letter => <span key={letter} className={`${s.lamp} ${result.lastOutput === letter ? s.lit : ''}`} aria-label={`${letter}${result.lastOutput === letter ? ' 已点亮' : ''}`}>{letter}</span>)}</div>)}
            </div>
            <div className={s.keyboardDivider}><span>TASTATUR / 输入键盘</span><span>点击字母即可输入</span></div>
            <div className={s.keyboard} aria-label="屏幕键盘">
              {keyboardRows.map(row => <div className={s.letterRow} key={row}>{[...row].map(letter => <button key={letter} type="button" className={s.key} disabled={composition !== null} aria-label={`输入字母 ${letter}`} onClick={() => dispatch({ type: 'append', letter })}>{letter}</button>)}</div>)}
            </div>
            <span className={`${s.screw} ${s.screwBl}`} aria-hidden="true" /><span className={`${s.screw} ${s.screwBr}`} aria-hidden="true" />
          </section>

        <ConfigPanel key={state.resetCount} draft={state.draft} applied={state.applied} dispatch={dispatch} />
      </div>

      <section className={s.guide} id="guide" aria-labelledby="guide-title">
        <div className={s.guideIntro}><span className={s.eyebrow}>A LITTLE CONTEXT</span><h2 id="guide-title">秘密，始于相同的起点。</h2><p>加密与解密使用完全相同的过程。<br />还原一段密文，需要相同的配置与初始位置。</p></div>
        <div className={s.guideStep}><span>01 / CONFIGURE</span><h3>配置你的机器</h3><p>选择转子、环位与初始位置，按需连接插线板，然后点击「应用配置」。</p></div>
        <div className={s.guideStep}><span>02 / TRANSFORM</span><h3>写下一段消息</h3><p>每处理一个英文字母，转子先步进再转换。编辑文字时，整段消息会从起点重算。</p></div>
        <div className={s.guideStep}><span>03 / DECODE</span><h3>让密文回到原文</h3><p>复制结果，清空消息后粘贴密文。保留相同配置，即可还原大写后的原文。</p></div>
      </section>
      <details className={s.about}><summary>关于这个模拟器 <Icon name="chevron" size={16} /></summary><div><p>模拟 Enigma I 三转子的接线、环位与双步进机制，固定使用反射器 B。为便于阅读，转子窗口以 A–Z 表示，与历史数字刻度 01–26 对应。</p><p>本版本支持最多十对插线，这是产品采用的操作范围。灯板保留最后一次输出，非英文字母原样保留，这些是网页的便利功能。环位和初始位置随转子交换一起移动。</p><p>消息上限为 10,000 个 UTF-16 单元，部分表情占两个单元。页面不保存消息或配置，刷新即重置。加载完成后，运算不依赖网络；不上传消息、不使用第三方追踪。</p><p>用于历史体验、学习与娱乐，不适合保护现代敏感信息。规则与接线参考 <a href="https://www.cryptomuseum.com/crypto/enigma/wiring.htm" target="_blank" rel="noreferrer">Crypto Museum</a>，样例参考 <a href="https://py-enigma.readthedocs.io/en/latest/guide.html" target="_blank" rel="noreferrer">Py-Enigma</a>。</p></div></details>
    </main>
    <footer className={s.footer}><span>ENIGMA <span className={s.footerSep}>/</span> 让历史在指尖运转</span><span>BUILT FOR CURIOSITY. <span className={s.footerSep}>·</span> ALL SECRETS STAY LOCAL.</span></footer>
  </div>;
}
