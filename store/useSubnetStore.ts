import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import {
  calculateSubnet, calculateVlsm, calculateIPv4, isValidIPv4,
  intToIp, ipToInt, type CalcResult, type IPVersion,
} from '../lib/subnet';

/* ── Types ── */
export type RecentCalculation = { id: string; input: string; network: string; scope: string; version: 'ipv4' | 'ipv6'; createdAt: number; favorite: boolean; };
export type VlsmRequestItem = { id: string; label: string; hosts: string; color: string; };
export type VlsmResult = { label: string; requestedHosts: number; allocatedHosts: number; cidr: number; network: string; firstHost: string; lastHost: string; broadcast: string; color: string; percentage: number; };
export type FlsmResult = { index: number; cidr: number; network: string; firstHost: string; lastHost: string; broadcast: string; usableHosts: number; mask: string; };
export type TrainingQuestion = { id: string; type: 'cidr-to-mask'|'mask-to-cidr'|'hosts-to-cidr'|'network-id'|'broadcast'|'usable-hosts'|'wildcard'|'first-last-host'; question: string; correctAnswer: string; options: string[]; explanation: string; difficulty: 'beginner'|'intermediate'|'advanced'; };
export type TrainingSession = { id: string; difficulty: 'beginner'|'intermediate'|'advanced'; totalQuestions: number; correctAnswers: number; wrongAnswers: number; completedAt: number; timeSpentMs: number; };

type SubnetState = {
  ipVersion: IPVersion; input: string; cidrInput: string; error: string; result: CalcResult;
  recentCalculations: RecentCalculation[]; showFavoritesOnly: boolean;
  vlsmBaseInput: string; vlsmCidrInput: string; vlsmRequests: VlsmRequestItem[]; vlsmResults: VlsmResult[]; vlsmTotalSpace: number; vlsmUsedSpace: number;
  flsmBaseInput: string; flsmSubnetCount: string; flsmResults: FlsmResult[]; flsmError: string;
  trainingDifficulty: 'beginner'|'intermediate'|'advanced'; questionCount: number; currentQuestion: TrainingQuestion|null; currentQuestionIndex: number; selectedAnswer: string|null; showExplanation: boolean; sessionQuestions: TrainingQuestion[]; sessionCorrect: number; sessionWrong: number; sessionStartTime: number; sessionActive: boolean; trainingSessions: TrainingSession[];

  // App State & RevenueCat
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (v: boolean) => void;
  isPremium: boolean;
  setIsPremium: (v: boolean) => void;
  initRevenueCat: () => Promise<void>;
  checkProStatus: () => Promise<void>;

  // Freemium gates — persisted so the gate survives app restarts
  hasUsedFreeVlsm: boolean;
  hasUsedFreeFlsm: boolean;

  // Training pause state
  sessionPaused: boolean;
  pausedTimeAccumMs: number;
  pauseStartTime: number;

  setIpVersion: (v: IPVersion) => void; setInput: (value: string) => void; setCidr: (value: number) => void; recalculate: (value?: string) => void; toggleFavorite: (id: string) => void; clearHistory: () => void; deleteHistoryItem: (id: string) => void; setShowFavoritesOnly: (v: boolean) => void; loadHistory: () => Promise<void>; restoreCalculation: (item: RecentCalculation) => void; setVlsmBaseInput: (ip: string) => void; setVlsmCidr: (cidr: string) => void; addVlsmRequest: () => void; updateVlsmRequest: (id: string, patch: Partial<VlsmRequestItem>) => void; removeVlsmRequest: (id: string) => void; calculateVlsmLayout: () => void; clearVlsm: () => void; setFlsmBaseInput: (v: string) => void; setFlsmSubnetCount: (v: string) => void; calculateFlsm: () => void; clearFlsm: () => void; setTrainingDifficulty: (d: 'beginner'|'intermediate'|'advanced') => void; setQuestionCount: (n: number) => void; startTrainingSession: () => void; answerQuestion: (answer: string) => void; nextQuestion: () => void; endTrainingSession: () => void; loadTrainingSessions: () => Promise<void>; pauseTraining: () => void; resumeTraining: () => void;
};

const VLSM_COLORS = ['#5ac8fa','#ff6b6b','#51cf66','#fcc419','#cc5de8','#ff922b','#20c997','#748ffc','#f06595','#22b8cf','#a9e34b','#e599f7','#fd7e14','#66d9e8','#f783ac'];
function makeId(p: string) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
const fallbackResult = calculateSubnet('192.168.1.50/24');
function randomInt(min: number, max: number) { return Math.floor(Math.random()*(max-min+1))+min; }
function cidrToMask(cidr: number): string { const m=cidr===0?0:(~0<<(32-cidr))>>>0; return [(m>>>24)&255,(m>>>16)&255,(m>>>8)&255,m&255].join('.'); }
function cidrToWildcard(cidr: number): string { const m=cidr===0?0:(~0<<(32-cidr))>>>0; const w=(~m)>>>0; return [(w>>>24)&255,(w>>>16)&255,(w>>>8)&255,w&255].join('.'); }
function shuffle<T>(arr: T[]): T[] { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function generateDistractors(correct: string, type: string, count=3): string[] { const d=new Set<string>(); if(type==='mask'){const masks=['255.0.0.0','255.128.0.0','255.192.0.0','255.224.0.0','255.240.0.0','255.248.0.0','255.252.0.0','255.254.0.0','255.255.0.0','255.255.128.0','255.255.192.0','255.255.224.0','255.255.240.0','255.255.248.0','255.255.252.0','255.255.254.0','255.255.255.0','255.255.255.128','255.255.255.192','255.255.255.224','255.255.255.240','255.255.255.248','255.255.255.252','255.255.255.254','255.255.255.255'].filter(m=>m!==correct);for(const m of shuffle(masks)){if(d.size>=count)break;d.add(m);}} else if(type==='cidr'){const n=parseInt(correct.replace('/',''),10);for(const c of shuffle([n-2,n-1,n+1,n+2,n-4,n+4].filter(x=>x>=0&&x<=32&&x!==n))){if(d.size>=count)break;d.add(`/${c}`);}} else if(type==='number'){const n=parseInt(correct.replace(/,/g,''),10);for(const c of shuffle([...new Set([n*2,Math.floor(n/2),n-2,n+2,n*4,Math.floor(n/4),n+1,n-1].filter(x=>x>0&&x!==n))])){if(d.size>=count)break;d.add(c.toLocaleString());}} else if(type==='ip'){const parts=correct.split('.').map(Number);for(let i=0;i<15&&d.size<count;i++){const np=[...parts];np[randomInt(2,3)]=Math.min(255,Math.max(0,np[randomInt(2,3)]+randomInt(-10,10)));const c=np.join('.');if(c!==correct)d.add(c);}} else if(type==='wildcard'){const wcs=['0.0.0.0','0.0.0.1','0.0.0.3','0.0.0.7','0.0.0.15','0.0.0.31','0.0.0.63','0.0.0.127','0.0.0.255','0.0.1.255','0.0.3.255','0.0.7.255','0.0.15.255','0.0.31.255','0.0.63.255','0.0.127.255','0.0.255.255','0.255.255.255'].filter(w=>w!==correct);for(const w of shuffle(wcs)){if(d.size>=count)break;d.add(w);}} while(d.size<count)d.add(`N/A ${d.size+1}`); return [...d].slice(0,count); }
function generateQuestion(difficulty: 'beginner'|'intermediate'|'advanced'): TrainingQuestion { const types: TrainingQuestion['type'][] = difficulty==='beginner'?['cidr-to-mask','mask-to-cidr','hosts-to-cidr','usable-hosts']:difficulty==='intermediate'?['cidr-to-mask','mask-to-cidr','hosts-to-cidr','network-id','broadcast','usable-hosts','wildcard']:['cidr-to-mask','mask-to-cidr','hosts-to-cidr','network-id','broadcast','usable-hosts','wildcard','first-last-host']; const type=types[randomInt(0,types.length-1)]; const cidrRange=difficulty==='beginner'?[8,16,24]:difficulty==='intermediate'?[8,12,16,20,24,26,27,28]:Array.from({length:25},(_,i)=>i+8); const cidr=cidrRange[randomInt(0,cidrRange.length-1)]; const mask=cidrToMask(cidr); const wildcard=cidrToWildcard(cidr); const usable=cidr>=31?(cidr===32?1:2):Math.pow(2,32-cidr)-2; const randomIp=`${randomInt(10,220)}.${randomInt(0,255)}.${randomInt(0,255)}.${randomInt(1,254)}`; let question='',correctAnswer='',explanation='',optionType=''; switch(type){ case 'cidr-to-mask': question=`What is the subnet mask for /${cidr}?`; correctAnswer=mask; optionType='mask'; explanation=`/${cidr} means ${cidr} network bits. The mask is ${mask}.`; break; case 'mask-to-cidr': question=`What CIDR notation matches subnet mask ${mask}?`; correctAnswer=`/${cidr}`; optionType='cidr'; explanation=`${mask} has ${cidr} consecutive 1-bits, giving /${cidr}.`; break; case 'hosts-to-cidr': question=`What's the smallest subnet that can hold ${usable} usable hosts?`; correctAnswer=`/${cidr}`; optionType='cidr'; explanation=`/${cidr} provides 2^${32-cidr}-2 = ${usable} usable hosts.`; break; case 'usable-hosts': question=`How many usable hosts does a /${cidr} subnet have?`; correctAnswer=usable.toLocaleString(); optionType='number'; explanation=`2^${32-cidr} - 2 = ${usable} usable hosts.`; break; case 'network-id': { const res=calculateIPv4(randomIp,cidr); question=`What is the network address for ${randomIp}/${cidr}?`; correctAnswer=res.network; optionType='ip'; explanation=`Apply mask ${mask} to ${randomIp} → ${res.network}.`; break; } case 'broadcast': { const res=calculateIPv4(randomIp,cidr); question=`What is the broadcast address for ${randomIp}/${cidr}?`; correctAnswer=res.broadcast; optionType='ip'; explanation=`All host bits set to 1 in ${res.network}/${cidr} → ${res.broadcast}.`; break; } case 'wildcard': question=`What is the wildcard mask for /${cidr}?`; correctAnswer=wildcard; optionType='wildcard'; explanation=`Wildcard is the inverse of ${mask} = ${wildcard}.`; break; case 'first-last-host': { const res=calculateIPv4(randomIp,cidr); const isFirst=randomInt(0,1)===0; question=`What is the ${isFirst?'first':'last'} usable host in ${randomIp}/${cidr}?`; correctAnswer=isFirst?res.firstHost:res.lastHost; optionType='ip'; explanation=`Network: ${res.network}, ${isFirst?'First host = network + 1':'Last host = broadcast - 1'} = ${isFirst?res.firstHost:res.lastHost}.`; break; } } const distractors=generateDistractors(correctAnswer,optionType); const options=shuffle([correctAnswer,...distractors]); return { id:makeId('q'), type, question, correctAnswer, options, explanation, difficulty }; }

export const useSubnetStore = create<SubnetState>()(
  persist(
    (set, get) => ({
      ipVersion: 'ipv4', input: '192.168.1.50/24', cidrInput: '24', error: '', result: fallbackResult, recentCalculations: [], showFavoritesOnly: false,
      vlsmBaseInput: '192.168.10.0', vlsmCidrInput: '24', vlsmRequests: [{ id: makeId('vlsm'), label: 'Sales', hosts: '50', color: VLSM_COLORS[0] }, { id: makeId('vlsm'), label: 'IT', hosts: '20', color: VLSM_COLORS[1] }, { id: makeId('vlsm'), label: 'IoT', hosts: '10', color: VLSM_COLORS[2] }], vlsmResults: [], vlsmTotalSpace: 0, vlsmUsedSpace: 0,
      flsmBaseInput: '192.168.1.0', flsmSubnetCount: '4', flsmResults: [], flsmError: '',
      trainingDifficulty: 'beginner', questionCount: 10, currentQuestion: null, currentQuestionIndex: 0, selectedAnswer: null, showExplanation: false, sessionQuestions: [], sessionCorrect: 0, sessionWrong: 0, sessionStartTime: 0, sessionActive: false, trainingSessions: [],
      sessionPaused: false, pausedTimeAccumMs: 0, pauseStartTime: 0,
      
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),
      isPremium: false,
      setIsPremium: (v) => set({ isPremium: v }),

      // Freemium gates
      hasUsedFreeVlsm: false,
      hasUsedFreeFlsm: false,
      
      initRevenueCat: async () => {
        const API_KEY = Platform.select({
          ios: 'appl_YOUR_IOS_API_KEY_HERE',
          android: 'goog_vrFlxIUsUSXrcsQmDIeTXwkAiLj', 
        });
        if (API_KEY) {
          Purchases.configure({ apiKey: API_KEY });
          await get().checkProStatus();
        }
      },
      checkProStatus: async () => {
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          const isPro = typeof customerInfo.entitlements.active['pro'] !== 'undefined';
          set({ isPremium: isPro });
        } catch (e) { console.log('RevenueCat Check Error:', e); }
      },
      
      setIpVersion: (v) => { const cur=get(); if(v==='ipv6'&&cur.ipVersion!=='ipv6'){set({ipVersion:v,input:'2001:db8::1/64',cidrInput:'64',error:''});get().recalculate('2001:db8::1/64');} else if(v==='ipv4'&&cur.ipVersion!=='ipv4'){set({ipVersion:v,input:'192.168.1.50/24',cidrInput:'24',error:''});get().recalculate('192.168.1.50/24');} },
      setInput: (value) => { const t=value.trim(); let ver=get().ipVersion; if(t.includes(':'))ver='ipv6'; else if(t.includes('.'))ver='ipv4'; set({input:value,ipVersion:ver}); get().recalculate(value); },
      setCidr: (value) => { const baseIp=get().input.includes('/')?get().input.split('/')[0]:get().input; const next=`${baseIp}/${value}`; set({cidrInput:String(value),input:next}); get().recalculate(next); },
      recalculate: (value) => { try { const result=calculateSubnet(value??get().input,get().cidrInput); const nr: RecentCalculation={id:makeId('r'),input:result.input,network:result.network,scope:result.ipScope,version:result.version,createdAt:Date.now(),favorite:false}; const deduped=[nr,...get().recentCalculations.filter(i=>i.input!==nr.input)].slice(0,50); set({result,cidrInput:String(result.cidr),error:'',recentCalculations:deduped}); } catch(err){set({error:err instanceof Error?err.message:'Unable to calculate.'});} },
      toggleFavorite: (id) => set({recentCalculations:get().recentCalculations.map(i=>i.id===id?{...i,favorite:!i.favorite}:i)}),
      clearHistory: () => set({recentCalculations:get().recentCalculations.filter(i=>i.favorite)}),
      deleteHistoryItem: (id) => set({recentCalculations:get().recentCalculations.filter(i=>i.id!==id)}),
      setShowFavoritesOnly: (v) => set({showFavoritesOnly:v}),
      loadHistory: async () => {},
      restoreCalculation: (item) => { set({ipVersion:item.version,input:item.input}); get().recalculate(item.input); },
      setVlsmBaseInput: (ip) => set({vlsmBaseInput:ip}),
      setVlsmCidr: (cidr) => set({vlsmCidrInput:cidr}),
      addVlsmRequest: () => set((s) => ({vlsmRequests:[...s.vlsmRequests,{id:makeId('v'),label:`Subnet ${s.vlsmRequests.length+1}`,hosts:'',color:VLSM_COLORS[s.vlsmRequests.length%VLSM_COLORS.length]}]})),
      updateVlsmRequest: (id,patch) => set((s) => ({vlsmRequests:s.vlsmRequests.map(i=>i.id===id?{...i,...patch}:i)})),
      removeVlsmRequest: (id) => set((s) => ({vlsmRequests:s.vlsmRequests.filter(i=>i.id!==id)})),
      calculateVlsmLayout: () => {
        try {
          const {vlsmBaseInput,vlsmCidrInput,vlsmRequests}=get();
          const baseIp=vlsmBaseInput.trim();
          const baseCidr=parseInt(vlsmCidrInput||'24',10)||24;
          const reqs=vlsmRequests.map((i,idx)=>({label:i.label||'Subnet',hosts:parseInt(i.hosts||'0',10)||0,color:i.color||VLSM_COLORS[idx%VLSM_COLORS.length]})).filter(i=>i.hosts>0);
          const raw=calculateVlsm(baseIp,baseCidr,reqs.map(r=>({label:r.label,hosts:r.hosts})));
          const totalSpace=Math.pow(2,32-baseCidr); let usedSpace=0;
          const results: VlsmResult[]=raw.map((item,i)=>{ const blockSize=Math.pow(2,32-item.cidr); usedSpace+=blockSize; const reqItem=reqs.find(r=>r.label===item.label); return{...item,color:reqItem?.color||VLSM_COLORS[i%VLSM_COLORS.length],percentage:(blockSize/totalSpace)*100}; });
          set({vlsmResults:results,vlsmTotalSpace:totalSpace,vlsmUsedSpace:usedSpace,error:'',hasUsedFreeVlsm:true});
        } catch(err){set({error:err instanceof Error?err.message:'Unable to calculate VLSM.'});}
      },
      clearVlsm: () => set({vlsmRequests:[],vlsmResults:[],vlsmTotalSpace:0,vlsmUsedSpace:0,error:''}),
      setFlsmBaseInput: (v) => set({flsmBaseInput:v}),
      setFlsmSubnetCount: (v) => set({flsmSubnetCount:v}),
      calculateFlsm: () => {
        try {
          const {flsmBaseInput,flsmSubnetCount}=get();
          const ipRaw=flsmBaseInput.includes('/')?flsmBaseInput.split('/')[0]:flsmBaseInput;
          const baseCidrStr=flsmBaseInput.includes('/')?flsmBaseInput.split('/')[1]:'24';
          const baseCidr=parseInt(baseCidrStr,10)||24;
          if(!isValidIPv4(ipRaw))throw new Error('Invalid base IP address');
          const count=parseInt(flsmSubnetCount,10);
          if(isNaN(count)||count<1||count>512)throw new Error('Subnet count must be between 1 and 512');
          const bits=Math.ceil(Math.log2(Math.max(count,2)));
          const newCidr=baseCidr+bits;
          if(newCidr>30)throw new Error(`/${newCidr} is too small — increase base subnet or reduce count`);
          const step=Math.pow(2,32-newCidr);
          const baseResult=calculateIPv4(ipRaw,baseCidr);
          const networkInt=ipToInt(baseResult.network);
          const results: FlsmResult[]=[];
          for(let i=0;i<count;i++){ const net=networkInt+i*step; const res=calculateIPv4(intToIp(net),newCidr); results.push({index:i+1,cidr:newCidr,network:res.network,firstHost:res.firstHost,lastHost:res.lastHost,broadcast:res.broadcast,usableHosts:parseInt(res.usableHosts.replace(/,/g,''),10)||0,mask:res.mask}); }
          set({flsmResults:results,flsmError:'',hasUsedFreeFlsm:true});
        } catch(err){set({flsmError:err instanceof Error?err.message:'Unable to calculate FLSM.',flsmResults:[]});}
      },
      clearFlsm: () => set({flsmResults:[],flsmError:''}),
      setTrainingDifficulty: (d) => set({trainingDifficulty:d}),
      setQuestionCount: (n) => set({questionCount:n}),
      startTrainingSession: () => { const{trainingDifficulty,questionCount}=get(); const questions=Array.from({length:questionCount},()=>generateQuestion(trainingDifficulty)); set({sessionQuestions:questions,currentQuestion:questions[0],currentQuestionIndex:0,selectedAnswer:null,showExplanation:false,sessionCorrect:0,sessionWrong:0,sessionStartTime:Date.now(),sessionActive:true,sessionPaused:false,pausedTimeAccumMs:0,pauseStartTime:0}); },
      answerQuestion: (answer) => { const{currentQuestion,sessionCorrect,sessionWrong}=get(); if(!currentQuestion||get().selectedAnswer)return; const ok=answer===currentQuestion.correctAnswer; set({selectedAnswer:answer,showExplanation:true,sessionCorrect:ok?sessionCorrect+1:sessionCorrect,sessionWrong:ok?sessionWrong:sessionWrong+1}); },
      nextQuestion: () => { const{currentQuestionIndex,sessionQuestions}=get(); const next=currentQuestionIndex+1; if(next>=sessionQuestions.length){get().endTrainingSession();return;} set({currentQuestion:sessionQuestions[next],currentQuestionIndex:next,selectedAnswer:null,showExplanation:false}); },
      endTrainingSession: () => { const{sessionCorrect,sessionWrong,sessionStartTime,trainingDifficulty,trainingSessions,pausedTimeAccumMs,sessionPaused,pauseStartTime}=get(); const extraPaused=sessionPaused?(Date.now()-pauseStartTime):0; const session: TrainingSession={id:makeId('s'),difficulty:trainingDifficulty,totalQuestions:sessionCorrect+sessionWrong,correctAnswers:sessionCorrect,wrongAnswers:sessionWrong,completedAt:Date.now(),timeSpentMs:Date.now()-sessionStartTime-(pausedTimeAccumMs+extraPaused)}; const updated=[session,...trainingSessions].slice(0,50); set({sessionActive:false,currentQuestion:null,trainingSessions:updated,sessionPaused:false}); },
      loadTrainingSessions: async () => {},
      pauseTraining: () => { const{sessionActive,sessionPaused}=get(); if(!sessionActive||sessionPaused)return; set({sessionPaused:true,pauseStartTime:Date.now()}); },
      resumeTraining: () => { const{sessionPaused,pausedTimeAccumMs,pauseStartTime}=get(); if(!sessionPaused)return; set({sessionPaused:false,pausedTimeAccumMs:pausedTimeAccumMs+(Date.now()-pauseStartTime),pauseStartTime:0}); },
    }),
    {
      name: 'subnetpro-store-v3',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ipVersion: state.ipVersion, input: state.input, cidrInput: state.cidrInput,
        recentCalculations: state.recentCalculations, showFavoritesOnly: state.showFavoritesOnly,
        vlsmBaseInput: state.vlsmBaseInput, vlsmCidrInput: state.vlsmCidrInput, vlsmRequests: state.vlsmRequests, vlsmResults: state.vlsmResults, vlsmTotalSpace: state.vlsmTotalSpace, vlsmUsedSpace: state.vlsmUsedSpace,
        flsmBaseInput: state.flsmBaseInput, flsmSubnetCount: state.flsmSubnetCount, flsmResults: state.flsmResults,
        trainingDifficulty: state.trainingDifficulty, questionCount: state.questionCount, trainingSessions: state.trainingSessions,
        isPremium: state.isPremium, hasSeenOnboarding: state.hasSeenOnboarding,
        // Freemium gates — must be persisted so the gate survives app restarts
        hasUsedFreeVlsm: state.hasUsedFreeVlsm,
        hasUsedFreeFlsm: state.hasUsedFreeFlsm,
      }),
      onRehydrateStorage: () => (state) => { if (state) { try { state.result = calculateSubnet(state.input, state.cidrInput); } catch { state.result = fallbackResult; } } },
    }
  )
);