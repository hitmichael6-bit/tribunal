import { jonSnow } from './jonSnow';
import { tyrion } from './tyrion';
import { daenerys } from './daenerys';
import { greyWorm } from './greyWorm';
import { judgeBarak } from './judgeBarak';
import { judgeElon } from './judgeElon';
import { judgeShamgar } from './judgeShamgar';
import type { JudgeSpec, RepresentativeSpec } from '../types';

// Order fixes display order only (2 defense, 2 prosecution) — not weight or precedence.
export const REPRESENTATIVES: RepresentativeSpec[] = [jonSnow, tyrion, daenerys, greyWorm];

// Three independent judges. Never iterate this list to produce a combined
// or majority result — each entry is rendered and stored on its own.
export const JUDGES: JudgeSpec[] = [judgeBarak, judgeElon, judgeShamgar];

export { jonSnow, tyrion, daenerys, greyWorm, judgeBarak, judgeElon, judgeShamgar };
