import type { AgentRole } from './types';

// Every role's model id comes from an env var, falling back to DEFAULT_MODEL.
// Swapping a model is a config change (Netlify env var), never a code change.
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'nvidia/nemotron-3.5-lightning:free';

const ROLE_ENV_VAR: Record<AgentRole, string> = {
  jon_snow: 'MODEL_JON_SNOW',
  tyrion: 'MODEL_TYRION',
  daenerys: 'MODEL_DAENERYS',
  grey_worm: 'MODEL_GREY_WORM',
  judge_barak: 'MODEL_JUDGE_BARAK',
  judge_elon: 'MODEL_JUDGE_ELON',
  judge_shamgar: 'MODEL_JUDGE_SHAMGAR',
};

export function getModelForRole(role: AgentRole): string {
  const envVar = ROLE_ENV_VAR[role];
  const override = envVar ? process.env[envVar] : undefined;
  return override && override.trim().length > 0 ? override.trim() : DEFAULT_MODEL;
}
