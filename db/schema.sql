-- Tribunal — Case T-001 schema.
--
-- Run this once against a Supabase (or plain Postgres) database. Idempotent:
-- safe to re-run. Holds the fixed charge sheet (reference data, not user-
-- editable), one row per trial run, the 4 representative opinions and 3
-- judge rulings per run, and a full per-call log.
--
-- Deliberately absent: any table, view, or column that aggregates or
-- combines the 3 judge_rulings rows for a run. The project brief makes this
-- a hard requirement — do not add one.

create extension if not exists pgcrypto;

create table if not exists charge_sheet (
  id text primary key,
  accused text not null,
  deceased text not null,
  act_alleged text not null,
  background text not null,
  stipulated_facts jsonb not null,
  question_for_judgment text not null,
  scope_note text not null
);

insert into charge_sheet (id, accused, deceased, act_alleged, background, stipulated_facts, question_for_judgment, scope_note)
values (
  'T-001',
  'Jon Snow',
  'Daenerys Targaryen',
  'Jon intentionally killed Daenerys by stabbing her during a private meeting in the throne room after the fall of King''s Landing.',
  'The story takes place mainly in Westeros. Jon Snow grows up believing he is the illegitimate son of Lord Eddard Stark; he becomes a military commander, then King in the North, and later learns he is the lawful son of Rhaegar Targaryen and Lyanna Stark — giving him a stronger hereditary claim to the throne than Daenerys, though he does not want to rule.

Daenerys Targaryen is the exiled heir of the dynasty that once ruled Westeros. She survives abuse, gains three dragons, frees enslaved people, and builds an army — becoming both liberator and increasingly absolute ruler. Jon and Daenerys become allies and lovers while fighting the Night King. After defeating the dead, Daenerys turns to the Iron Throne; Jon''s hidden parentage weakens her political claim and feeds her fear of betrayal.

Daenerys attacks King''s Landing. The city surrenders, but Daenerys burns streets and civilians from her dragon, Drogon. Jon witnesses the destruction. Grey Worm, her commander, joins the killing on the ground. Daenerys promises further campaigns of "liberation." Tyrion Lannister, her chief adviser, resigns in protest and is imprisoned, warning Jon that Daenerys will kill anyone who threatens her rule, including Jon''s sisters. Jon asks Daenerys to show mercy and share moral judgment with others. She refuses. During an embrace, he stabs her to death. Her soldiers arrest him.',
  '["King''s Landing had surrendered: bells rang, organized resistance had ceased. Daenerys then used Drogon against streets and civilians, causing destruction on a vast scale.", "After the victory, Daenerys told her assembled forces the campaign of \"liberation\" would continue beyond King''s Landing. Jon had seen the city and heard the speech.", "Tyrion Lannister renounced his office as Hand and was imprisoned. He warned Jon that Daenerys would treat Jon''s sisters, and anyone else she regarded as an obstacle, as enemies.", "Jon asked Daenerys to forgive Tyrion and show mercy. She refused to let others choose what was good and presented her own judgment as decisive.", "Daenerys was unarmed and was not attacking Jon when he killed her. Jon used their intimacy to get close enough to strike. He had not convened a council, attempted detention, or sought a public surrender of power."]'::jsonb,
  'Was Jon Snow''s intentional killing of Daenerys Targaryen justified as the necessary defense of others and of the realm, given what he knew, the scale of the threatened harm, the absence or presence of safer alternatives, and his lack of formal authority?',
  'The Tribunal decides justified / not justified and gives reasons. It does not impose a sentence, and it does not combine the three judges'' opinions into one verdict.'
)
on conflict (id) do nothing;

create table if not exists trial_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  status text not null default 'running' check (status in ('running', 'representatives_complete', 'completed'))
);

create table if not exists representative_opinions (
  id uuid primary key default gen_random_uuid(),
  trial_run_id uuid not null references trial_runs(id) on delete cascade,
  representative_role text not null check (representative_role in ('jon_snow', 'tyrion', 'daenerys', 'grey_worm')),
  representative_name text not null,
  seat text not null check (seat in ('defense', 'prosecution')),
  argument_text text not null,
  model_used text not null,
  created_at timestamptz not null default now()
);

create table if not exists judge_rulings (
  id uuid primary key default gen_random_uuid(),
  trial_run_id uuid not null references trial_runs(id) on delete cascade,
  judge_role text not null check (judge_role in ('judge_barak', 'judge_elon', 'judge_shamgar')),
  judge_name text not null,
  verdict text not null check (verdict in ('justified', 'not justified')),
  reasoning_text text not null,
  model_used text not null,
  created_at timestamptz not null default now()
);

create table if not exists api_call_logs (
  id uuid primary key default gen_random_uuid(),
  trial_run_id uuid references trial_runs(id) on delete cascade,
  agent_role text not null check (
    agent_role in ('jon_snow', 'tyrion', 'daenerys', 'grey_worm', 'judge_barak', 'judge_elon', 'judge_shamgar')
  ),
  model_used text not null,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  cost numeric,
  status text not null check (status in ('success', 'failure')),
  error_message text,
  timestamp timestamptz not null default now()
);

create index if not exists idx_representative_opinions_run on representative_opinions(trial_run_id);
create index if not exists idx_judge_rulings_run on judge_rulings(trial_run_id);
create index if not exists idx_api_call_logs_run on api_call_logs(trial_run_id);
