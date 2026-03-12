import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateSubnet,
  calculateVlsm,
  calculateIPv4,
  isValidIPv4,
  type CalcResult,
  type IPVersion,
} from '../lib/subnet';

/* ── Types ── */
export type RecentCalculation = {
  id: string; input: string; network: string; scope: string;
  version: 'ipv4' | 'ipv6'; createdAt: number; favorite: boolean;
};

export type VlsmRequestItem = { id: string; label: string; hosts: string; color: string; };

export type VlsmResult = {
  label: string; requestedHosts: number; allocatedHosts: number; cidr: number;
  network: string; firstHost: string; lastHost: string; broadcast: string;
  color: string; percentage: number;
};

export type TrainingQuestion = {
  id: string; type: 'cidr-to-mask' | 'mask-to-cidr' | 'hosts-to-cidr' | 'network-id' | 'broadcast' | 'usable-hosts' | 'wildcard' | 'first-last-host';
  question: string; correctAnswer: string; options: string[]; explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
};

export type TrainingSession = {
  id: string; difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalQuestions: number; correctAnswers: number; wrongAnswers: number;
  completedAt: number; timeSpentMs: number;
};

/* ── State ── */
type SubnetState = {
  ipVersion: IPVersion; input: string; cidrInput: string; error: string; result: CalcResult;
  recentCalculations: RecentCalculation[]; showFavoritesOnly: boolean;
  vlsmBaseInput: string; vlsmRequests: VlsmRequestItem[]; vlsmResults: VlsmResult[];
  vlsmTotalSpace: number; vlsmUsedSpace: number;
  trainingDifficulty: 'beginner' | 'intermediate' | 'advanced';
  questionCount: number;
  currentQuestion: TrainingQuestion | null; currentQuestionIndex: number;
  selectedAnswer: string | null; showExplanation: boolean;
  sessionQuestions: TrainingQuestion[]; sessionCorrect: number; sessionWrong: number;
  sessionStartTime: number; sessionActive: boolean; trainingSessions: TrainingSession[];
  // Actions
  setIpVersion: (v: IPVersion) => void;
  setInput: (value: string) => void;
  setCidr: (value: number) => void;
  recalculate: (value?: string) => void;
  toggleFavorite: (id: string) => void;
  clearHistory: () => void;
  deleteHistoryItem: (id: string) => void;
  setShowFavoritesOnly: (v: boolean) => void;
  loadHistory: () => Promise<void>;
  restoreCalculation: (item: RecentCalculation) => void;
  setVlsmBaseInput: (value: string) => void;
  addVlsmRequest: () => void;
  updateVlsmRequest: (id: string, patch: Partial<VlsmRequestItem>) => void;
  removeVlsmRequest: (id: string) => void;
  calculateVlsmLayout: () => void;
  clearVlsm: () => void; // <--- ADDED
  setTrainingDifficulty: (d: 'beginner' | 'intermediate' | 'advanced') => void;
  setQuestionCount: (n: number) => void;
  startTrainingSession: () => void;
  answerQuestion: (answer: string) => void;
  nextQuestion: () => void;
  endTrainingSession: () => void;
  loadTrainingSessions: () => Promise<void>;
};

/* ── Helpers ── */
const HISTORY_KEY = 'subnetpro_history_v2';
const SESSIONS_KEY = 'subnetpro_training_v2';
const VLSM_COLORS = ['#5ac8fa','#ff6b6b','#51cf66','#fcc419','#cc5de8','#ff922b','#20c997','#748ffc','#f06595','#22b8cf','#a9e34b','#e599f7','#fd7e14','#66d9e8','#f783ac'];

function makeId(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
const fallbackResult = calculateSubnet('192.168.1.50/24');

async function persistHistory(items: RecentCalculation[]) { try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch {} }
async function persistSessions(items: TrainingSession[]) { try { await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(items)); } catch {} }

/* ── Training Question Generator ── */
// ... (Keeping generator math same to avoid breaking anything)
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function cidrToMask(cidr: number): string { const m = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0; return [(m >>> 24) & 255, (m >>> 16) & 255, (m >>> 8) & 255, m & 255].join('.'); }
function cidrToWildcard(cidr: number): string { const m = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0; const w = (~m) >>> 0; return [(w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255].join('.'); }
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function generateDistractors(correct: string, type: string, count = 3): string[] {
  const d = new Set<string>();
  if (type === 'mask') { const masks = ['255.0.0.0','255.128.0.0','255.192.0.0','255.224.0.0','255.240.0.0','255.248.0.0','255.252.0.0','255.254.0.0','255.255.0.0','255.255.128.0','255.255.192.0','255.255.224.0','255.255.240.0','255.255.248.0','255.255.252.0','255.255.254.0','255.255.255.0','255.255.255.128','255.255.255.192','255.255.255.224','255.255.255.240','255.255.255.248','255.255.255.252','255.255.255.254','255.255.255.255'].filter(m => m !== correct); for (const m of shuffle(masks)) { if (d.size >= count) break; d.add(m); } } else if (type === 'cidr') { const n = parseInt(correct.replace('/', ''), 10); for (const c of shuffle([n-2,n-1,n+1,n+2,n-4,n+4].filter(x => x >= 0 && x <= 32 && x !== n))) { if (d.size >= count) break; d.add(`/${c}`); } } else if (type === 'number') { const n = parseInt(correct.replace(/,/g, ''), 10); for (const c of shuffle([...new Set([n*2,Math.floor(n/2),n-2,n+2,n*4,Math.floor(n/4),n+1,n-1].filter(x => x > 0 && x !== n))])) { if (d.size >= count) break; d.add(c.toLocaleString()); } } else if (type === 'ip') { const parts = correct.split('.').map(Number); for (let i = 0; i < 15 && d.size < count; i++) { const np = [...parts]; np[randomInt(2,3)] = Math.min(255, Math.max(0, np[randomInt(2,3)] + randomInt(-10,10))); const c = np.join('.'); if (c !== correct) d.add(c); } } else if (type === 'wildcard') { const wcs = ['0.0.0.0','0.0.0.1','0.0.0.3','0.0.0.7','0.0.0.15','0.0.0.31','0.0.0.63','0.0.0.127','0.0.0.255','0.0.1.255','0.0.3.255','0.0.7.255','0.0.15.255','0.0.31.255','0.0.63.255','0.0.127.255','0.0.255.255','0.255.255.255'].filter(w => w !== correct); for (const w of shuffle(wcs)) { if (d.size >= count) break; d.add(w); } }
  while (d.size < count) d.add(`N/A ${d.size + 1}`);
  return [...d].slice(0, count);
}
function generateQuestion(difficulty: 'beginner' | 'intermediate' | 'advanced'): TrainingQuestion {
  const types: TrainingQuestion['type'][] = difficulty === 'beginner' ? ['cidr-to-mask','mask-to-cidr','hosts-to-cidr','usable-hosts'] : difficulty === 'intermediate' ? ['cidr-to-mask','mask-to-cidr','hosts-to-cidr','network-id','broadcast','usable-hosts','wildcard'] : ['cidr-to-mask','mask-to-cidr','hosts-to-cidr','network-id','broadcast','usable-hosts','wildcard','first-last-host'];
  const type = types[randomInt(0, types.length - 1)]; const cidrRange = difficulty === 'beginner' ? [8,16,24] : difficulty === 'intermediate' ? [8,12,16,20,24,26,27,28] : Array.from({length:25}, (_,i)=>i+8); const cidr = cidrRange[randomInt(0, cidrRange.length - 1)]; const mask = cidrToMask(cidr); const wildcard = cidrToWildcard(cidr); const usable = cidr >= 31 ? (cidr === 32 ? 1 : 2) : Math.pow(2, 32 - cidr) - 2; const randomIp = `${randomInt(10,220)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,254)}`;
  let question = '', correctAnswer = '', explanation = '', optionType = '';
  switch (type) { case 'cidr-to-mask': question = `What is the subnet mask for /${cidr}?`; correctAnswer = mask; explanation = `/${cidr} means ${cidr} network bits. Mask = ${mask}.`; optionType = 'mask'; break; case 'mask-to-cidr': question = `What CIDR prefix matches mask ${mask}?`; correctAnswer = `/${cidr}`; explanation = `${mask} has ${cidr} consecutive 1-bits → /${cidr}.`; optionType = 'cidr'; break; case 'hosts-to-cidr': question = `You need ${usable.toLocaleString()} usable hosts. Tightest CIDR?`; correctAnswer = `/${cidr}`; explanation = `/${cidr} → 2^${32-cidr} - 2 = ${usable.toLocaleString()} usable hosts.`; optionType = 'cidr'; break; case 'usable-hosts': question = `How many usable hosts in a /${cidr} subnet?`; correctAnswer = usable.toLocaleString(); explanation = `${32-cidr} host bits → 2^${32-cidr} - 2 = ${usable.toLocaleString()}.`; optionType = 'number'; break; case 'wildcard': question = `Wildcard mask for /${cidr}?`; correctAnswer = wildcard; explanation = `Inverse of ${mask} = ${wildcard}.`; optionType = 'wildcard'; break; case 'network-id': { try { const r = calculateIPv4(randomIp, cidr); question = `Network address for ${randomIp}/${cidr}?`; correctAnswer = r.network; explanation = `AND ${randomIp} with ${mask} → ${r.network}.`; optionType = 'ip'; } catch { return generateQuestion(difficulty); } break; } case 'broadcast': { try { const r = calculateIPv4(randomIp, cidr); question = `Broadcast for ${randomIp}/${cidr}?`; correctAnswer = r.broadcast; explanation = `Set host bits to 1 in ${r.network}/${cidr} → ${r.broadcast}.`; optionType = 'ip'; } catch { return generateQuestion(difficulty); } break; } case 'first-last-host': { try { const r = calculateIPv4(randomIp, cidr); question = `First usable host for ${randomIp}/${cidr}?`; correctAnswer = r.firstHost; explanation = `Network + 1 = ${r.firstHost}.`; optionType = 'ip'; } catch { return generateQuestion(difficulty); } break; } }
  return { id: makeId('q'), type, question, correctAnswer, options: shuffle([correctAnswer, ...generateDistractors(correctAnswer, optionType)]), explanation, difficulty };
}

/* ── Store ── */
export const useSubnetStore = create<SubnetState>((set, get) => ({
  ipVersion: 'ipv4', input: '192.168.1.50/24', cidrInput: '24', error: '', result: fallbackResult,
  recentCalculations: [], showFavoritesOnly: false,
  vlsmBaseInput: '192.168.10.0/24',
  vlsmRequests: [
    { id: makeId('vlsm'), label: 'Sales', hosts: '50', color: VLSM_COLORS[0] },
    { id: makeId('vlsm'), label: 'IT', hosts: '20', color: VLSM_COLORS[1] },
    { id: makeId('vlsm'), label: 'IoT', hosts: '10', color: VLSM_COLORS[2] },
  ],
  vlsmResults: [], vlsmTotalSpace: 0, vlsmUsedSpace: 0,
  trainingDifficulty: 'beginner', questionCount: 10,
  currentQuestion: null, currentQuestionIndex: 0, selectedAnswer: null, showExplanation: false,
  sessionQuestions: [], sessionCorrect: 0, sessionWrong: 0, sessionStartTime: 0,
  sessionActive: false, trainingSessions: [],

  setIpVersion: (v) => {
    const cur = get();
    if (v === 'ipv6' && cur.ipVersion !== 'ipv6') {
      set({ ipVersion: v, input: '2001:db8::1/64', cidrInput: '64', error: '' });
      get().recalculate('2001:db8::1/64');
    } else if (v === 'ipv4' && cur.ipVersion !== 'ipv4') {
      set({ ipVersion: v, input: '192.168.1.50/24', cidrInput: '24', error: '' });
      get().recalculate('192.168.1.50/24');
    }
  },
  setInput: (value) => {
    const t = value.trim();
    let ver = get().ipVersion;
    if (t.includes(':')) ver = 'ipv6'; else if (t.includes('.')) ver = 'ipv4';
    set({ input: value, ipVersion: ver });
    get().recalculate(value);
  },
  setCidr: (value) => {
    const baseIp = get().input.includes('/') ? get().input.split('/')[0] : get().input;
    const next = `${baseIp}/${value}`;
    set({ cidrInput: String(value), input: next });
    get().recalculate(next);
  },
  recalculate: (value) => {
    try {
      const result = calculateSubnet(value ?? get().input, get().cidrInput);
      const nr: RecentCalculation = { id: makeId('r'), input: result.input, network: result.network, scope: result.ipScope, version: result.version, createdAt: Date.now(), favorite: false };
      const deduped = [nr, ...get().recentCalculations.filter(i => i.input !== nr.input)].slice(0, 50);
      set({ result, cidrInput: String(result.cidr), error: '', recentCalculations: deduped });
      persistHistory(deduped);
    } catch (err) { set({ error: err instanceof Error ? err.message : 'Unable to calculate.' }); }
  },
  toggleFavorite: (id) => { const items = get().recentCalculations.map(i => i.id === id ? { ...i, favorite: !i.favorite } : i); set({ recentCalculations: items }); persistHistory(items); },
  clearHistory: () => { const items = get().recentCalculations.filter(i => i.favorite); set({ recentCalculations: items }); persistHistory(items); },
  deleteHistoryItem: (id) => { const items = get().recentCalculations.filter(i => i.id !== id); set({ recentCalculations: items }); persistHistory(items); },
  setShowFavoritesOnly: (v) => set({ showFavoritesOnly: v }),
  loadHistory: async () => { try { const raw = await AsyncStorage.getItem(HISTORY_KEY); if (raw) set({ recentCalculations: JSON.parse(raw) }); } catch {} },
  restoreCalculation: (item) => { set({ ipVersion: item.version, input: item.input }); get().recalculate(item.input); },
  setVlsmBaseInput: (value) => set({ vlsmBaseInput: value }),
  addVlsmRequest: () => set((s) => ({ vlsmRequests: [...s.vlsmRequests, { id: makeId('v'), label: `Subnet ${s.vlsmRequests.length + 1}`, hosts: '10', color: VLSM_COLORS[s.vlsmRequests.length % VLSM_COLORS.length] }] })),
  updateVlsmRequest: (id, patch) => set((s) => ({ vlsmRequests: s.vlsmRequests.map(i => i.id === id ? { ...i, ...patch } : i) })),
  removeVlsmRequest: (id) => set((s) => ({ vlsmRequests: s.vlsmRequests.filter(i => i.id !== id) })),
  calculateVlsmLayout: () => {
    try {
      const [baseIp, baseCidrRaw] = get().vlsmBaseInput.split('/');
      const baseCidr = parseInt(baseCidrRaw || '24', 10) || 24;
      const reqs = get().vlsmRequests.map((i, idx) => ({ label: i.label || 'Subnet', hosts: parseInt(i.hosts || '0', 10) || 0, color: i.color || VLSM_COLORS[idx % VLSM_COLORS.length] })).filter(i => i.hosts > 0);
      const raw = calculateVlsm(baseIp, baseCidr, reqs.map(r => ({ label: r.label, hosts: r.hosts })));
      const totalSpace = Math.pow(2, 32 - baseCidr);
      let usedSpace = 0;
      const results: VlsmResult[] = raw.map((item, i) => {
        const blockSize = Math.pow(2, 32 - item.cidr); usedSpace += blockSize;
        const reqItem = reqs.find(r => r.label === item.label);
        return { ...item, color: reqItem?.color || VLSM_COLORS[i % VLSM_COLORS.length], percentage: (blockSize / totalSpace) * 100 };
      });
      set({ vlsmResults: results, vlsmTotalSpace: totalSpace, vlsmUsedSpace: usedSpace, error: '' });
    } catch (err) { set({ error: err instanceof Error ? err.message : 'Unable to calculate VLSM.' }); }
  },
  
  // <--- ADDED: Resets the entire VLSM state completely
  clearVlsm: () => set({ vlsmRequests: [], vlsmResults: [], vlsmTotalSpace: 0, vlsmUsedSpace: 0, error: '' }),

  setTrainingDifficulty: (d) => set({ trainingDifficulty: d }),
  setQuestionCount: (n) => set({ questionCount: n }),
  startTrainingSession: () => {
    const { trainingDifficulty, questionCount } = get();
    const questions = Array.from({ length: questionCount }, () => generateQuestion(trainingDifficulty));
    set({ sessionQuestions: questions, currentQuestion: questions[0], currentQuestionIndex: 0, selectedAnswer: null, showExplanation: false, sessionCorrect: 0, sessionWrong: 0, sessionStartTime: Date.now(), sessionActive: true });
  },
  answerQuestion: (answer) => {
    const { currentQuestion, sessionCorrect, sessionWrong } = get();
    if (!currentQuestion || get().selectedAnswer) return;
    const ok = answer === currentQuestion.correctAnswer;
    set({ selectedAnswer: answer, showExplanation: true, sessionCorrect: ok ? sessionCorrect + 1 : sessionCorrect, sessionWrong: ok ? sessionWrong : sessionWrong + 1 });
  },
  nextQuestion: () => {
    const { currentQuestionIndex, sessionQuestions } = get();
    const next = currentQuestionIndex + 1;
    if (next >= sessionQuestions.length) { get().endTrainingSession(); return; }
    set({ currentQuestion: sessionQuestions[next], currentQuestionIndex: next, selectedAnswer: null, showExplanation: false });
  },
  endTrainingSession: () => {
    const { sessionCorrect, sessionWrong, sessionStartTime, trainingDifficulty, trainingSessions } = get();
    const session: TrainingSession = { id: makeId('s'), difficulty: trainingDifficulty, totalQuestions: sessionCorrect + sessionWrong, correctAnswers: sessionCorrect, wrongAnswers: sessionWrong, completedAt: Date.now(), timeSpentMs: Date.now() - sessionStartTime };
    const updated = [session, ...trainingSessions].slice(0, 50);
    set({ sessionActive: false, currentQuestion: null, trainingSessions: updated });
    persistSessions(updated);
  },
  loadTrainingSessions: async () => { try { const raw = await AsyncStorage.getItem(SESSIONS_KEY); if (raw) set({ trainingSessions: JSON.parse(raw) }); } catch {} },
}));