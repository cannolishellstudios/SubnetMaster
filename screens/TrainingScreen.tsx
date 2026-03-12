import React, { useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { useSubnetStore, type TrainingSession } from '../store/useSubnetStore';

const { width: SW } = Dimensions.get('window');

/* ── Progress Ring ── */
function ProgressRing({ size, progress, color, children }: { size: number; progress: number; color: string; children?: React.ReactNode }) {
  const strokeWidth = 5;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(progress, 1));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {children}
    </View>
  );
}

/* ── Difficulty Selector ── */
function DifficultySelector() {
  const { trainingDifficulty, setTrainingDifficulty } = useSubnetStore();
  const levels = [
    { key: 'beginner' as const, label: 'Beginner', icon: 'leaf-outline', desc: 'Masks, CIDR basics, usable hosts', color: '#51cf66' },
    { key: 'intermediate' as const, label: 'Intermediate', icon: 'fitness-outline', desc: 'Network IDs, wildcards, broadcast', color: '#fcc419' },
    { key: 'advanced' as const, label: 'Advanced', icon: 'flame-outline', desc: 'All types, tricky CIDRs, first/last', color: '#ff6b6b' },
  ] as const;

  return (
    <View style={ds.container}>
      {levels.map((lv) => {
        const active = trainingDifficulty === lv.key;
        return (
          <Pressable key={lv.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTrainingDifficulty(lv.key); }}
            style={[ds.card, active && { borderColor: lv.color, backgroundColor: `${lv.color}10` }]}>
            <View style={[ds.iconBox, active && { backgroundColor: `${lv.color}20` }]}>
              <Ionicons name={lv.icon as any} size={18} color={active ? lv.color : 'rgba(255,255,255,0.35)'} />
            </View>
            <Text style={[ds.cardTitle, active && { color: lv.color }]}>{lv.label}</Text>
            <Text style={ds.cardDesc}>{lv.desc}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const ds = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8 },
  card: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', gap: 6 },
  iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '800' },
  cardDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 13 },
});

/* ── Question Count Selector ── */
function QuestionCountSelector() {
  const { questionCount, setQuestionCount } = useSubnetStore();
  const counts = [10, 25, 50];
  return (
    <View style={qcs.container}>
      <Text style={qcs.label}>QUESTIONS PER SESSION</Text>
      <View style={qcs.row}>
        {counts.map((c) => (
          <Pressable key={c} onPress={() => { Haptics.selectionAsync(); setQuestionCount(c); }}
            style={[qcs.btn, questionCount === c && qcs.btnActive]}>
            <Text style={[qcs.btnText, questionCount === c && qcs.btnTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const qcs = StyleSheet.create({
  container: { gap: 8 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  btnActive: { backgroundColor: 'rgba(90,200,250,0.12)', borderColor: 'rgba(90,200,250,0.3)' },
  btnText: { color: 'rgba(255,255,255,0.45)', fontSize: 18, fontWeight: '900' },
  btnTextActive: { color: '#5ac8fa' },
});

/* ── Quiz View ── */
function QuizView() {
  const { currentQuestion, currentQuestionIndex, selectedAnswer, showExplanation,
    sessionCorrect, sessionWrong, sessionQuestions, sessionStartTime,
    answerQuestion, nextQuestion, endTrainingSession } = useSubnetStore();
  const scrollRef = React.useRef<ScrollView>(null);

  if (!currentQuestion) return null;

  const total = sessionQuestions.length;
  const progress = (currentQuestionIndex + 1) / total;
  const isLast = currentQuestionIndex + 1 >= total;

  // Timer
  const [elapsed, setElapsed] = React.useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);
  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;

  // Scroll to top on new question
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); }, [currentQuestionIndex]);

  return (
    <View style={qz.container}>
      {/* Timer + progress */}
      <View style={qz.topBar}>
        <View style={qz.timerPill}><Ionicons name="timer-outline" size={14} color="#fcc419" /><Text style={qz.timerText}>{timeStr}</Text></View>
        <View style={qz.progressBar}><View style={[qz.progressFill, { width: `${progress * 100}%` }]} /></View>
        <Text style={qz.progressText}>{currentQuestionIndex + 1}/{total}</Text>
      </View>

      {/* Score */}
      <View style={qz.scoreRow}>
        <View style={qz.scorePill}><Ionicons name="checkmark-circle" size={14} color="#51cf66" /><Text style={[qz.scoreText, { color: '#51cf66' }]}>{sessionCorrect}</Text></View>
        <View style={qz.scorePill}><Ionicons name="close-circle" size={14} color="#ff6b6b" /><Text style={[qz.scoreText, { color: '#ff6b6b' }]}>{sessionWrong}</Text></View>
        <View style={qz.scorePill}><Text style={qz.scoreTextDim}>{total - currentQuestionIndex - 1} left</Text></View>
      </View>

      {/* Question */}
      <View style={qz.questionCard}>
        <View style={qz.questionMeta}>
          <View style={qz.diffBadge}><Text style={qz.diffText}>{currentQuestion.difficulty.toUpperCase()}</Text></View>
          <Text style={qz.typeText}>{currentQuestion.type.replace(/-/g, ' ').toUpperCase()}</Text>
        </View>
        <Text style={qz.questionText}>{currentQuestion.question}</Text>
      </View>

      {/* Options */}
      <View style={qz.options}>
        {currentQuestion.options.map((opt, i) => {
          const isSel = selectedAnswer === opt;
          const isCorrect = opt === currentQuestion.correctAnswer;
          const showRes = selectedAnswer !== null;
          let bc = 'rgba(255,255,255,0.08)', bg = 'rgba(255,255,255,0.03)', tc = '#fff';
          if (showRes && isCorrect) { bc = '#51cf66'; bg = 'rgba(81,207,102,0.12)'; tc = '#51cf66'; }
          else if (showRes && isSel && !isCorrect) { bc = '#ff6b6b'; bg = 'rgba(255,107,107,0.12)'; tc = '#ff6b6b'; }
          return (
            <Pressable key={i} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); answerQuestion(opt); }}
              disabled={selectedAnswer !== null} style={[qz.option, { borderColor: bc, backgroundColor: bg }]}>
              <View style={qz.optionLeft}>
                <View style={[qz.optionLetter, { borderColor: bc }]}><Text style={[qz.optionLetterText, { color: tc }]}>{String.fromCharCode(65 + i)}</Text></View>
                <Text style={[qz.optionText, { color: tc }]}>{opt}</Text>
              </View>
              {showRes && isCorrect && <Ionicons name="checkmark-circle" size={20} color="#51cf66" />}
              {showRes && isSel && !isCorrect && <Ionicons name="close-circle" size={20} color="#ff6b6b" />}
            </Pressable>
          );
        })}
      </View>

      {/* Explanation */}
      {showExplanation && (
        <View style={qz.explanationBox}>
          <Ionicons name="bulb-outline" size={16} color="#fcc419" />
          <Text style={qz.explanationText}>{currentQuestion.explanation}</Text>
        </View>
      )}

      {/* Next / Finish */}
      {selectedAnswer !== null && (
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); isLast ? endTrainingSession() : nextQuestion(); }} style={qz.nextBtn}>
          <LinearGradient colors={['#5ac8fa', '#3aa8e0']} style={qz.nextGrad}>
            <Text style={qz.nextText}>{isLast ? 'View Results' : 'Next Question'}</Text>
            <Ionicons name={isLast ? 'flag' : 'arrow-forward'} size={18} color="#020408" />
          </LinearGradient>
        </Pressable>
      )}

      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); endTrainingSession(); }} style={qz.quitBtn}>
        <Text style={qz.quitText}>End Session Early</Text>
      </Pressable>
    </View>
  );
}
const qz = StyleSheet.create({
  container: { gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(252,196,25,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  timerText: { color: '#fcc419', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#5ac8fa' },
  progressText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scoreRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  scoreText: { fontSize: 15, fontWeight: '900' },
  scoreTextDim: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
  questionCard: { backgroundColor: 'rgba(10,25,60,0.35)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(90,200,250,0.1)', gap: 10 },
  questionMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  diffBadge: { backgroundColor: 'rgba(90,200,250,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { color: 'rgba(90,200,250,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  typeText: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  questionText: { color: '#fff', fontSize: 17, fontWeight: '800', lineHeight: 24 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 14, borderWidth: 1 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  optionLetter: { width: 28, height: 28, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontSize: 13, fontWeight: '800' },
  optionText: { fontSize: 15, fontWeight: '700', flex: 1 },
  explanationBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(252,196,25,0.06)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(252,196,25,0.15)', alignItems: 'flex-start' },
  explanationText: { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', lineHeight: 20 },
  nextBtn: { borderRadius: 18, overflow: 'hidden' },
  nextGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  nextText: { color: '#020408', fontSize: 17, fontWeight: '900' },
  quitBtn: { alignItems: 'center', paddingVertical: 10 },
  quitText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '700' },
});

/* ── Session Card ── */
function SessionCard({ session }: { session: TrainingSession }) {
  const pct = session.totalQuestions > 0 ? Math.round((session.correctAnswers / session.totalQuestions) * 100) : 0;
  const gradeColor = pct >= 80 ? '#51cf66' : pct >= 60 ? '#fcc419' : '#ff6b6b';
  const gradeLabel = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';
  const timeSec = Math.round(session.timeSpentMs / 1000);
  const timeStr = timeSec > 60 ? `${Math.floor(timeSec / 60)}m ${timeSec % 60}s` : `${timeSec}s`;
  const date = new Date(session.completedAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeOfDay = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={sc.card}>
      <ProgressRing size={44} progress={pct / 100} color={gradeColor}>
        <Text style={[sc.grade, { color: gradeColor }]}>{gradeLabel}</Text>
      </ProgressRing>
      <View style={sc.middle}>
        <Text style={sc.title}>{session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1)} · {session.totalQuestions}Q</Text>
        <Text style={sc.meta}>{dateStr} · {timeOfDay} · {timeStr}</Text>
      </View>
      <View style={sc.right}>
        <Text style={[sc.score, { color: gradeColor }]}>{pct}%</Text>
        <Text style={sc.detail}>{session.correctAnswers}/{session.totalQuestions}</Text>
      </View>
    </View>
  );
}
const sc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  middle: { flex: 1, gap: 2 },
  title: { color: '#fff', fontSize: 14, fontWeight: '800' },
  meta: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  score: { fontSize: 18, fontWeight: '900' },
  detail: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
  grade: { fontSize: 14, fontWeight: '900' },
});

/* ── Stats ── */
function StatsOverview() {
  const { trainingSessions } = useSubnetStore();
  const stats = useMemo(() => {
    if (trainingSessions.length === 0) return null;
    const total = trainingSessions.length;
    const totalCorrect = trainingSessions.reduce((s, sess) => s + sess.correctAnswers, 0);
    const totalQuestions = trainingSessions.reduce((s, sess) => s + sess.totalQuestions, 0);
    const avgPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const bestPct = Math.max(...trainingSessions.map(s => s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0));
    let streak = 0;
    for (const sess of trainingSessions) { if (sess.correctAnswers / sess.totalQuestions >= 0.7) streak++; else break; }
    return { total, totalCorrect, totalQuestions, avgPct, bestPct, streak };
  }, [trainingSessions]);
  if (!stats) return null;

  return (
    <View style={so.container}>
      <View style={so.bigStatRow}>
        <ProgressRing size={80} progress={stats.avgPct / 100} color={stats.avgPct >= 70 ? '#51cf66' : '#fcc419'}>
          <Text style={so.bigPct}>{stats.avgPct}%</Text>
          <Text style={so.bigLabel}>AVG</Text>
        </ProgressRing>
        <View style={so.bigStatRight}>
          <View style={so.miniRow}>
            <View style={so.miniStat}><Text style={so.miniLabel}>SESSIONS</Text><Text style={so.miniValue}>{stats.total}</Text></View>
            <View style={so.miniStat}><Text style={so.miniLabel}>BEST</Text><Text style={[so.miniValue, { color: '#51cf66' }]}>{stats.bestPct}%</Text></View>
          </View>
          <View style={so.miniRow}>
            <View style={so.miniStat}><Text style={so.miniLabel}>STREAK</Text><Text style={[so.miniValue, { color: '#ff922b' }]}>{stats.streak}</Text></View>
            <View style={so.miniStat}><Text style={so.miniLabel}>CORRECT</Text><Text style={so.miniValue}>{stats.totalCorrect}/{stats.totalQuestions}</Text></View>
          </View>
        </View>
      </View>
    </View>
  );
}
const so = StyleSheet.create({
  container: { backgroundColor: 'rgba(10,25,60,0.25)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  bigStatRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigPct: { color: '#fff', fontSize: 20, fontWeight: '900' },
  bigLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800' },
  bigStatRight: { flex: 1, gap: 8 },
  miniRow: { flexDirection: 'row', gap: 8 },
  miniStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  miniLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  miniValue: { color: '#fff', fontSize: 15, fontWeight: '900' },
});

/* ── Main Screen ── */
export default function TrainingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const { sessionActive, trainingSessions, startTrainingSession, loadTrainingSessions } = useSubnetStore();

  useEffect(() => { loadTrainingSessions(); }, []);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollToTop', (tabName: string) => {
      if (tabName === 'Training') scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={ms.container}>
      <LinearGradient colors={['#030810', '#06101f', '#040812', '#020408']} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFillObject} />
      <ScrollView ref={scrollRef} style={ms.scroll}
        contentContainerStyle={[ms.content, { paddingTop: Math.max(insets.top + 8, 28), paddingBottom: 120 + Math.max(insets.bottom, 16) }]}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={ms.headerRow}>
          <View><Text style={ms.eyebrow}>PRACTICE</Text><Text style={ms.pageTitle}>CIDR Training</Text></View>
          <View style={ms.badgePill}><Ionicons name="school" size={18} color="#5ac8fa" /></View>
        </View>

        {sessionActive ? <QuizView /> : (
          <>
            <StatsOverview />
            <View style={ms.section}>
              <Text style={ms.sectionTitle}>Select Difficulty</Text>
              <DifficultySelector />
            </View>
            <QuestionCountSelector />
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startTrainingSession(); }} style={ms.startBtn}>
              <LinearGradient colors={['#5ac8fa', '#3aa8e0']} style={ms.startGrad}>
                <Ionicons name="play" size={20} color="#020408" /><Text style={ms.startText}>Start Training Session</Text>
              </LinearGradient>
            </Pressable>

            {/* Topics */}
            <View style={ms.topicCard}>
              <Text style={ms.topicTitle}>What You'll Practice</Text>
              <View style={ms.topicGrid}>
                {[
                  { icon: 'swap-horizontal', text: 'CIDR ↔ Subnet Mask' },
                  { icon: 'calculator', text: 'Usable Host Count' },
                  { icon: 'git-network', text: 'Network ID Finding' },
                  { icon: 'radio', text: 'Broadcast Address' },
                  { icon: 'code-working', text: 'Wildcard Masks' },
                  { icon: 'navigate', text: 'First / Last Host' },
                  { icon: 'resize', text: 'CIDR from Host Need' },
                  { icon: 'shield-checkmark', text: 'Mask Validation' },
                ].map((t, i) => (
                  <View key={i} style={ms.topicItem}>
                    <Ionicons name={t.icon as any} size={16} color="#5ac8fa" />
                    <Text style={ms.topicText}>{t.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Tip card */}
            <View style={ms.tipCard}>
              <Ionicons name="bulb" size={20} color="#fcc419" />
              <View style={{ flex: 1 }}>
                <Text style={ms.tipTitle}>Pro Tip</Text>
                <Text style={ms.tipText}>Memorize the power-of-2 table: /24=256, /25=128, /26=64, /27=32, /28=16, /29=8, /30=4. This lets you instantly calculate usable hosts and subnet boundaries.</Text>
              </View>
            </View>

            {/* Past sessions */}
            {trainingSessions.length > 0 && (
              <View style={ms.section}>
                <Text style={ms.sectionTitle}>Recent Sessions</Text>
                <View style={ms.sessionList}>
                  {trainingSessions.slice(0, 15).map((session) => <SessionCard key={session.id} session={session} />)}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: 'rgba(90,200,250,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 2 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  badgePill: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(90,200,250,0.1)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.2)', alignItems: 'center', justifyContent: 'center' },
  section: { gap: 10 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  startBtn: { borderRadius: 20, overflow: 'hidden' },
  startGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  startText: { color: '#020408', fontSize: 17, fontWeight: '900' },
  topicCard: { backgroundColor: 'rgba(10,25,60,0.25)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  topicTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  topicGrid: { gap: 8 },
  topicItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topicText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  tipCard: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(252,196,25,0.04)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(252,196,25,0.1)', alignItems: 'flex-start' },
  tipTitle: { color: '#fcc419', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  tipText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  sessionList: { gap: 8 },
});