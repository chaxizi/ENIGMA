import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

describe('workbench interaction', () => {
  it('edits and recalculates from the initial positions, including non-Latin text', async () => {
    const user = userEvent.setup(); render(<App />);
    const input = screen.getByLabelText(/输入消息/);
    const output = screen.getByLabelText(/转换结果/);
    await user.type(input, 'aaaaa');
    expect(input).toHaveValue('AAAAA'); expect(output).toHaveValue('BDZGO');
    await user.type(input, '{Backspace}'); expect(output).toHaveValue('BDZG');
    fireEvent.change(input, { target: { value: 'a中文🙂ß 1!a' } });
    expect(output).toHaveValue('B中文🙂ß 1!D');
    expect(screen.getByLabelText('右转子当前位置')).toHaveTextContent('C');
    await user.click(screen.getByRole('button', { name: '清空消息' }));
    expect(output).toHaveValue(''); expect(screen.getByLabelText('右转子当前位置')).toHaveTextContent('A');
  });
  it('does not normalize or compute while an IME composition is active', () => {
    render(<App />);
    const input = screen.getByLabelText(/输入消息/);
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'zhong' } });
    expect(input).toHaveValue('zhong'); expect(screen.getByLabelText(/转换结果/)).toHaveValue('');
    fireEvent.change(input, { target: { value: '中a' } });
    fireEvent.compositionEnd(input, { data: '中a' });
    expect(input).toHaveValue('中A'); expect(screen.getByLabelText(/转换结果/)).toHaveValue('中B');
  });
  it('keeps applied settings separate from the draft and recomputes on apply', async () => {
    const user = userEvent.setup(); render(<App />);
    fireEvent.change(screen.getByLabelText(/输入消息/), { target: { value: 'AAAAA' } });
    await user.selectOptions(screen.getByLabelText('右转子初始位置'), '1');
    expect(screen.getByLabelText(/转换结果/)).toHaveValue('BDZGO');
    await user.click(screen.getByRole('button', { name: /应用配置/ }));
    expect(screen.getByLabelText(/转换结果/)).toHaveValue('DZGOW');
    expect(screen.getByLabelText(/输入消息/)).toHaveValue('AAAAA');
    await user.click(screen.getByRole('button', { name: /清空消息/ }));
    expect(screen.getByLabelText('右转子当前位置')).toHaveTextContent('B');
    await user.click(screen.getByRole('button', { name: /恢复默认/ }));
    expect(screen.getByLabelText('右转子初始位置')).toHaveValue('0');
    expect(screen.getByLabelText('右转子当前位置')).toHaveTextContent('A');
  });
  it('validates plug pairs locally and disables already used letters', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.selectOptions(screen.getByLabelText('插线字母1'), 'A');
    await user.selectOptions(screen.getByLabelText('插线字母2'), 'A');
    await user.click(screen.getByRole('button', { name: '连接字母' }));
    expect(screen.getByRole('alert')).toHaveTextContent('自身');
    await user.selectOptions(screen.getByLabelText('插线字母2'), 'B');
    await user.click(screen.getByRole('button', { name: '连接字母' }));
    expect(screen.getByRole('button', { name: '移除插线 AB' })).toBeInTheDocument();
    expect(screen.getByLabelText('插线字母1').querySelector('option[value=""]')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '移除插线 AB' }));
    expect(screen.queryByRole('button', { name: '移除插线 AB' })).not.toBeInTheDocument();
  });
  it('refuses oversized edits and paste without silently truncating', () => {
    render(<App />); const input = screen.getByLabelText(/输入消息/);
    fireEvent.change(input, { target: { value: 'ABC' } });
    fireEvent.change(input, { target: { value: 'X'.repeat(10001) } });
    expect(input).toHaveValue('ABC'); expect(screen.getByRole('alert')).toHaveTextContent('10,000');
    fireEvent.paste(input, { clipboardData: { getData: () => 'Z'.repeat(10001) } });
    expect(input).toHaveValue('ABC');
  });
  it('moves the rotor together with its ring and initial position while keeping the active configuration unchanged', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.selectOptions(screen.getByLabelText('左转子环位'), ['3']);
    await user.selectOptions(screen.getByLabelText('左转子初始位置'), ['5']);
    await user.click(screen.getByRole('button', { name: '交换左、中转子' }));
    expect(screen.getByLabelText('中转子型号')).toHaveValue('I');
    expect(screen.getByLabelText('中转子环位')).toHaveValue('3');
    expect(screen.getByLabelText('中转子初始位置')).toHaveValue('5');
    expect(screen.getByLabelText('中转子当前位置')).toHaveTextContent('A');
    await user.click(screen.getByRole('button', { name: /应用配置/ }));
    expect(screen.getByLabelText('中转子当前位置')).toHaveTextContent('F');
  });
  it('copies the complete result when clipboard access succeeds', async () => {
    const user = userEvent.setup(); render(<App />);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    fireEvent.change(screen.getByLabelText(/输入消息/), { target: { value: 'A中🙂\nA' } });
    await user.click(screen.getByRole('button', { name: '复制结果' }));
    expect(writeText).toHaveBeenCalledWith('B中🙂\nD');
    expect(screen.getByRole('status')).toHaveTextContent('结果已复制');
  });
  it('appends screen keys and handles a denied clipboard with a selected result', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: '输入字母 A' }));
    await user.click(screen.getByRole('button', { name: '输入字母 A' }));
    expect(screen.getByLabelText(/转换结果/)).toHaveValue('BD');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await user.click(screen.getByRole('button', { name: '复制结果' }));
    expect(screen.getByRole('status')).toHaveTextContent('手动复制');
    const output = screen.getByLabelText<HTMLTextAreaElement>(/转换结果/);
    expect(output.selectionEnd - output.selectionStart).toBe(2);
  });
});
