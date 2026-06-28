'use client';

/**
 * v6.6 Date-To-Marry (DTM) daily-question page.
 *
 * Mirrors Discover's batch-of-N flow for matrimonial questions:
 *  - shows one question at a time
 *  - skip / answer / save-for-later actions, each tracked
 *  - "all caught up" terminal screen + deferred-pile modal
 *
 * NOTE: The DTM question backend (daily prompt feed) is not yet
 * exposed via the web ApiClient. Until it lands the page draws from
 * a local stub set so the see-later infrastructure (api.deferItem,
 * resolveDeferred, learner rewards) can be exercised end-to-end.
 * Replace `loadQuestions()` with a real fetch when the endpoint ships.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Check, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTrackPageView, useTrackActivity } from '@/hooks/useTrackActivity';
import { usePersistentState } from '@/hooks/usePersistentState';
import {
  trackDtmSeeLater,
  trackDtmBatchExhausted,
} from '@/lib/track/collectors/deferred';
import { trackDtmQuestionSkip, trackDtmAnswerRevise } from '@/lib/track/collectors/firstMove';
import { useReadingTime } from '@/lib/track/react/useReadingTime';
import { DeferredPileModal } from '@/components/deferred/DeferredPileModal';
import { AllCaughtUpScreen } from '@/components/deferred/AllCaughtUpScreen';
import { FamilyBrief } from './components/FamilyBrief';

type DtmQuestion = {
  id: string;
  topic: string;
  prompt: string;
  hint?: string;
};

// TODO(v6.7): swap with `api.getDtmQuestions(...)` once the question
// feed endpoint is exposed by the matrimonial service.
const STUB_QUESTIONS: DtmQuestion[] = [
  { id: 'q_finance_01', topic: 'finance', prompt: 'How would you split shared expenses in marriage?', hint: 'There is no wrong answer.' },
  { id: 'q_family_01', topic: 'family', prompt: 'How close do you want to live to extended family?' },
  { id: 'q_kids_01', topic: 'kids', prompt: 'When (if at all) do you want children?' },
  { id: 'q_career_01', topic: 'career', prompt: 'Whose career takes priority if a relocation is needed?' },
  { id: 'q_faith_01', topic: 'faith', prompt: 'How important is shared religious practice?' },
  { id: 'q_lifestyle_01', topic: 'lifestyle', prompt: 'Are you a planner or a go-with-the-flow person on weekends?' },
  { id: 'q_conflict_01', topic: 'conflict', prompt: 'How do you prefer to resolve disagreements?' },
  { id: 'q_intimacy_01', topic: 'intimacy', prompt: 'How do you express affection day to day?' },
  { id: 'q_growth_01', topic: 'growth', prompt: 'What does personal growth look like for you in 5 years?' },
  { id: 'q_homelife_01', topic: 'homelife', prompt: 'How do you split household responsibilities?' },
];

export default function DtmPage() {
  const [questions, setQuestions] = useState<DtmQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = usePersistentState<number>('dtmQuestions:currentIndex', 0);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = usePersistentState<string>('dtmQuestions:answerDraft', '');
  const [showDeferred, setShowDeferred] = useState(false);
  const [deferredCount, setDeferredCount] = useState(0);
  const [batchId, setBatchId] = useState<string>(() => `dtm_${Date.now()}`);
  const [batchActed, setBatchActed] = useState(0);
  const [batchDeferred, setBatchDeferred] = useState(0);
  const [batchExhaustedFired, setBatchExhaustedFired] = useState(false);
  // v3.6.0 — Family Brief modal state. Preview pane reads the user's
  // existing matrimonial profile (best-effort; falls back to a placeholder).
  const [showFamilyBrief, setShowFamilyBrief] = useState(false);
  const [familyBriefPreview, setFamilyBriefPreview] = useState<{
    displayName?: string | null;
    age?: number | null;
    city?: string | null;
    profession?: string | null;
    education?: string | null;
    religion?: string | null;
    familyBackground?: string | null;
    subCommunity?: string | null;
    expectedTimeline?: string | null;
  } | null>(null);
  const initialAnswerRef = useRef<string>('');
  const toast = useToast();

  useTrackPageView('dtm');
  const trackActivity = useTrackActivity();

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      // STUB: replace with `await api.getDtmQuestions(...)` when shipped.
      setQuestions(STUB_QUESTIONS);
      setCurrentIndex(0);
      setBatchId(`dtm_${Date.now()}`);
      setBatchActed(0);
      setBatchDeferred(0);
      setBatchExhaustedFired(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const refreshDeferredCount = useCallback(async () => {
    try {
      const res = await api.listDeferred({ surface: 'dtm', kind: 'pending', limit: 100 });
      setDeferredCount(res.data?.count ?? 0);
    } catch { /* swallow */ }
  }, []);
  useEffect(() => { refreshDeferredCount(); }, [refreshDeferredCount]);
  useEffect(() => { if (!showDeferred) refreshDeferredCount(); }, [showDeferred, refreshDeferredCount]);

  // Best-effort matrimonial-profile fetch for the Family Brief preview pane.
  // Silently no-ops if the endpoint 404s or the user has nothing on file.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [matRes, meRes] = await Promise.all([
          api.getMatrimonialProfile().catch(() => null),
          api.getMe().catch(() => null),
        ]);
        if (cancelled) return;
        const m = (matRes as any)?.data ?? matRes ?? {};
        const user = (meRes as any)?.data ?? meRes ?? {};
        const profile = user?.profile ?? {};
        setFamilyBriefPreview({
          displayName: user?.displayName ?? null,
          age: profile?.age ?? null,
          city: profile?.city ?? null,
          profession: profile?.profession ?? null,
          education: profile?.education ?? m?.educationLevel ?? null,
          religion: profile?.religion ?? null,
          familyBackground: m?.familyBackground ?? null,
          subCommunity: m?.subCommunity ?? null,
          expectedTimeline: m?.expectedTimeline ?? null,
        });
      } catch { /* preview is optional */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const current = questions[currentIndex];
  const promptWords = current?.prompt.split(/\s+/).filter(Boolean).length ?? 0;
  const promptRef = useReadingTime<HTMLHeadingElement>(
    current ? `dtm.prompt.${current.id}` : 'dtm.prompt',
    promptWords,
  );

  useEffect(() => { initialAnswerRef.current = ''; }, [current?.id]);

  const handleAnswer = async () => {
    if (!current || !answer.trim()) return;
    if (initialAnswerRef.current && initialAnswerRef.current !== answer) {
      trackDtmAnswerRevise({
        topic: current.topic,
        qid: current.id,
        fromValue: initialAnswerRef.current,
        toValue: answer,
      });
    }
    initialAnswerRef.current = answer;
    trackActivity('answer', 'question', current.id, { topic: current.topic });
    setBatchActed((n) => n + 1);
    // TODO(v6.7): POST answer to matrimonial service when endpoint exists.
    toast.success('Answer saved');
    setAnswer('');
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
    else setQuestions([]);
  };

  const handleSkip = () => {
    if (!current) return;
    trackDtmQuestionSkip(current.topic, current.id);
    trackActivity('skip', 'question', current.id, { topic: current.topic });
    setBatchActed((n) => n + 1);
    setAnswer('');
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
    else setQuestions([]);
  };

  const handleSeeLater = async () => {
    if (!current) return;
    trackDtmSeeLater(current.topic, current.id);
    setBatchDeferred((n) => n + 1);
    setDeferredCount((n) => n + 1);
    try {
      await api.deferItem({
        surface: 'dtm',
        targetId: current.id,
        topic: current.topic,
        batchId,
        reason: 'thinking',
      });
      toast.success('Saved for later');
    } catch { /* still advance even if persistence fails */ }
    setAnswer('');
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
    else setQuestions([]);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[12px] text-text-muted">Loading questions…</p>
      </div>
    );
  }

  if (!current) {
    if (!batchExhaustedFired) {
      trackDtmBatchExhausted({
        topic: 'mixed',
        shown: questions.length,
        answered: batchActed,
        skipped: Math.max(0, batchActed - batchDeferred),
        deferred: batchDeferred,
      });
      setBatchExhaustedFired(true);
    }
    return (
      <>
        <div className="flex justify-end px-6 pt-4">
          <button
            type="button"
            onClick={() => setShowFamilyBrief(true)}
            className="h-8 px-3 rounded-full text-[11px] font-semibold border border-rose-main/30 text-rose hover:bg-rose-main/10 transition flex items-center gap-1.5"
            title="Generate a parent-shareable bio brief"
          >
            <span aria-hidden>📋</span> Family Brief
          </button>
        </div>
        <AllCaughtUpScreen
          surface="dtm"
          deferredCount={deferredCount}
          onViewDeferred={() => setShowDeferred(true)}
          primaryLabel={`Revisit ${deferredCount} saved`}
        />
        <DeferredPileModal
          surface="dtm"
          isOpen={showDeferred}
          onClose={() => setShowDeferred(false)}
          renderItem={(item) => (
            <div>
              <p className="text-[10px] font-bold text-rose uppercase tracking-[0.15em]">
                {item.topic ?? 'question'}
              </p>
              <p className="text-[13px] font-semibold text-text-primary mt-1">
                {STUB_QUESTIONS.find((q) => q.id === item.targetId)?.prompt ?? item.targetId}
              </p>
              <p className="text-[10px] text-text-muted mt-1">
                Saved {new Date(item.deferredAt).toLocaleDateString()}
              </p>
            </div>
          )}
        />
        <FamilyBrief
          isOpen={showFamilyBrief}
          onClose={() => setShowFamilyBrief(false)}
          previewBio={familyBriefPreview}
        />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6 gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose" />
              <h1 className="font-brand font-semibold text-xl text-text-primary">Date to Marry</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFamilyBrief(true)}
                className="h-8 px-3 rounded-full text-[11px] font-semibold border border-rose-main/30 text-rose hover:bg-rose-main/10 transition flex items-center gap-1.5"
                title="Generate a parent-shareable bio brief"
              >
                <span aria-hidden>📋</span> Family Brief
              </button>
              <span className="text-[12px] text-text-muted font-semibold tabular-nums">
                {currentIndex + 1} <span className="text-text-secondary">of</span> {questions.length}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="rounded-[20px] bg-miamo-card border border-border shadow-[0_8px_40px_rgba(201,120,86,0.08)] p-7"
            >
              <p className="text-[10px] font-bold text-rose uppercase tracking-[0.15em] mb-3">
                {current.topic}
              </p>
              <h2 ref={promptRef} className="font-brand font-semibold text-2xl text-text-primary leading-tight mb-3">
                {current.prompt}
              </h2>
              {current.hint && (
                <p className="text-[12px] text-text-muted mb-4">{current.hint}</p>
              )}

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Share your perspective…"
                className="w-full h-32 rounded-xl bg-miamo-surface border border-border text-text-primary text-[13px] px-4 py-3 resize-none focus:outline-none placeholder:text-text-muted mb-5"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkip}
                  className="h-11 px-5 rounded-xl bg-miamo-surface border border-border text-text-muted text-[12px] font-semibold hover:bg-miamo-card hover:text-text-secondary transition flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Skip
                </button>
                <button
                  onClick={handleSeeLater}
                  className="h-11 px-5 rounded-xl bg-miamo-surface border border-border text-text-muted text-[12px] font-semibold hover:bg-rose-soft hover:border-rose-main/30 hover:text-rose transition flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" /> See later
                </button>
                <button
                  onClick={handleAnswer}
                  disabled={!answer.trim()}
                  className={cn(
                    'flex-1 h-11 px-5 rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5',
                    answer.trim()
                      ? 'bg-rose-main text-white hover:bg-rose-dark shadow-soft'
                      : 'bg-miamo-surface text-text-secondary cursor-not-allowed',
                  )}
                >
                  <Check className="w-4 h-4" /> Answer
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {deferredCount > 0 && (
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowDeferred(true)}
                className="text-[12px] font-semibold text-rose hover:text-rose-dark transition inline-flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" /> {deferredCount} saved for later
              </button>
            </div>
          )}
        </div>

        <DeferredPileModal
          surface="dtm"
          isOpen={showDeferred}
          onClose={() => setShowDeferred(false)}
          renderItem={(item) => (
            <div>
              <p className="text-[10px] font-bold text-rose uppercase tracking-[0.15em]">
                {item.topic ?? 'question'}
              </p>
              <p className="text-[13px] font-semibold text-text-primary mt-1">
                {STUB_QUESTIONS.find((q) => q.id === item.targetId)?.prompt ?? item.targetId}
              </p>
              <p className="text-[10px] text-text-muted mt-1">
                Saved {new Date(item.deferredAt).toLocaleDateString()}
              </p>
            </div>
          )}
        />
        <FamilyBrief
          isOpen={showFamilyBrief}
          onClose={() => setShowFamilyBrief(false)}
          previewBio={familyBriefPreview}
        />
      </div>
    </ErrorBoundary>
  );
}
