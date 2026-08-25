// Shared types for the Tribunal backend. Mirrors the schema in db/schema.sql.

export type RepresentativeRole = 'jon_snow' | 'tyrion' | 'daenerys' | 'grey_worm';
export type JudgeRole = 'judge_barak' | 'judge_elon' | 'judge_shamgar';
export type AgentRole = RepresentativeRole | JudgeRole;

export type Seat = 'defense' | 'prosecution';

// Verdict vocabulary is fixed by the project brief: "justified" / "not justified"
// everywhere (backend, frontend, DB) — never guilty/not guilty, never combined.
export type Verdict = 'justified' | 'not justified';

export type CallStatus = 'success' | 'failure';

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface OpenRouterCallResult {
  status: CallStatus;
  content?: string;
  usage?: UsageInfo;
  errorMessage?: string;
}

export interface RepresentativeSpec {
  role: RepresentativeRole;
  name: string;
  seat: Seat;
  systemPrompt: string;
}

export interface JudgeSpec {
  role: JudgeRole;
  name: string;
  systemPrompt: string;
}

export interface RepresentativeResult {
  role: RepresentativeRole;
  name: string;
  seat: Seat;
  status: CallStatus;
  argumentText?: string;
  error?: string;
}

export interface JudgeResult {
  role: JudgeRole;
  name: string;
  status: CallStatus;
  verdict?: Verdict;
  reasoningText?: string;
  error?: string;
}
