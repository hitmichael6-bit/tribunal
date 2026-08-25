export type Seat = 'defense' | 'prosecution';
export type Verdict = 'justified' | 'not justified';
export type CallStatus = 'success' | 'failure';

export interface RepresentativeResult {
  role: string;
  name: string;
  seat: Seat;
  status: CallStatus;
  argumentText?: string;
  error?: string;
}

export interface JudgeResult {
  role: string;
  name: string;
  status: CallStatus;
  verdict?: Verdict;
  reasoningText?: string;
  error?: string;
}

export interface CallLogEntry {
  agent_role: string;
  model_used: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost: number | null;
  status: CallStatus;
  error_message?: string | null;
  timestamp: string;
}

export interface ChargeSheet {
  id: string;
  accused: string;
  deceased: string;
  actAlleged: string;
  background: string;
  stipulatedFacts: string[];
  questionForJudgment: string;
  scopeNote: string;
}

export interface TrialRunSummary {
  id: string;
  started_at: string;
  // How far the run got — not whether it succeeded (see hadFailures).
  status: 'running' | 'representatives_complete' | 'completed';
  // Whether any call in this run actually failed, independent of `status`
  // (a run can reach "completed" while several of its 7 calls errored).
  hadFailures: boolean;
}

export interface TrialRunDetail {
  id: string;
  startedAt: string;
  status: string;
  chargeSheet: ChargeSheet;
  representatives: Array<{
    representative_role: string;
    representative_name: string;
    seat: Seat;
    argument_text: string;
    model_used: string;
    created_at: string;
  }>;
  judges: Array<{
    judge_role: string;
    judge_name: string;
    verdict: Verdict;
    reasoning_text: string;
    model_used: string;
    created_at: string;
  }>;
  callLog: CallLogEntry[];
}
