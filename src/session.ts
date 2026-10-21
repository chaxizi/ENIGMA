import { DEFAULT_CONFIG, MAX_MESSAGE_LENGTH, validateConfig, type EnigmaConfig } from './core/enigma';

export interface Session {
  applied: EnigmaConfig;
  draft: EnigmaConfig;
  message: string;
  error: string;
  notice: string;
  resetCount: number;
}
export type Action =
  | { type: 'message'; value: string }
  | { type: 'append'; letter: string }
  | { type: 'rejectMessage' }
  | { type: 'draft'; config: EnigmaConfig }
  | { type: 'apply' }
  | { type: 'clear' }
  | { type: 'reset' }
  | { type: 'notice'; value: string };

export const initialSession: Session = {
  applied: DEFAULT_CONFIG, draft: DEFAULT_CONFIG, message: '', error: '', notice: '', resetCount: 0,
};

export function sessionReducer(state: Session, action: Action): Session {
  switch (action.type) {
    case 'rejectMessage': return { ...state, error: '消息最多支持 10,000 个 UTF-16 单元，已保留上一次有效内容。', notice: '' };
    case 'message':
    case 'append': {
      const value = action.type === 'message' ? action.value : state.message + action.letter;
      if (value.length > MAX_MESSAGE_LENGTH) return { ...state, error: '消息最多支持 10,000 个 UTF-16 单元，已保留上一次有效内容。', notice: '' };
      return { ...state, message: value.replace(/[a-z]/g, c => c.toUpperCase()), error: '', notice: '' };
    }
    case 'draft': return { ...state, draft: action.config, notice: '' };
    case 'apply': {
      const validation = validateConfig(state.draft);
      if (!validation.valid) return { ...state, notice: validation.errors.map(e => e.message).join(' ') };
      return { ...state, applied: state.draft, notice: '配置已应用，消息已从初始位置重新计算。' };
    }
    case 'clear': return { ...state, message: '', error: '', notice: '消息已清空，转子已回到初始位置。' };
    case 'reset': return { ...initialSession, resetCount: state.resetCount + 1, notice: '已恢复默认配置。' };
    case 'notice': return { ...state, notice: action.value };
  }
}
