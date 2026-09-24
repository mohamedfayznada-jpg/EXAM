-- EXAM Supabase schema
create extension if not exists pgcrypto;

create type public.user_role as enum ('student','admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  pass_percentage numeric(5,2) not null default 60 check (pass_percentage between 0 and 100),
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_text text,\n  image_path text,
  points numeric(8,2) not null default 1 check (points > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(10,2),
  total_points numeric(10,2),
  percentage numeric(5,2),
  passed boolean
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  selected_option_id uuid references public.question_options(id) on delete restrict,
  is_correct boolean,
  points_awarded numeric(10,2),
  unique(attempt_id, question_id)
);

create index if not exists idx_questions_exam on public.questions(exam_id, sort_order);
create index if not exists idx_options_question on public.question_options(question_id, sort_order);
create index if not exists idx_attempts_student on public.attempts(student_id, submitted_at desc);
create index if not exists idx_attempts_exam on public.attempts(exam_id, submitted_at desc);
create index if not exists idx_answers_attempt on public.attempt_answers(attempt_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_admin());

drop policy if exists "admins manage exams" on public.exams;
create policy "admins manage exams" on public.exams for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "students read published exams" on public.exams;
create policy "students read published exams" on public.exams for select using (is_published = true or public.is_admin());

drop policy if exists "admins manage questions" on public.questions;
create policy "admins manage questions" on public.questions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "students read questions of published exams" on public.questions;
create policy "students read questions of published exams" on public.questions for select using (
  exists (select 1 from public.exams e where e.id = exam_id and e.is_published = true)
);

drop policy if exists "admins manage options" on public.question_options;
create policy "admins manage options" on public.question_options for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "students read options of published exams" on public.question_options;
create policy "students read options of published exams" on public.question_options for select using (
  exists (
    select 1 from public.questions q
    join public.exams e on e.id = q.exam_id
    where q.id = question_id and e.is_published = true
  )
);

drop policy if exists "students read own attempts" on public.attempts;
create policy "students read own attempts" on public.attempts for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "students create own attempts" on public.attempts;
create policy "students create own attempts" on public.attempts for insert with check (student_id = auth.uid() or public.is_admin());
drop policy if exists "admins manage attempts" on public.attempts;
create policy "admins manage attempts" on public.attempts for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "students manage own answers" on public.attempt_answers;
create policy "students manage own answers" on public.attempt_answers for all
using (exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = auth.uid()) or public.is_admin())
with check (exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = auth.uid()) or public.is_admin());

-- IMPORTANT:
-- For production, do not expose is_correct to students through a direct query.
-- Move scoring/submission into a trusted server-side function/Edge Function
-- so students cannot inspect correct answers before submission.


-- Storage for question images
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do update set public = true;

drop policy if exists "admins upload question images" on storage.objects;
create policy "admins upload question images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'question-images' and public.is_admin());

drop policy if exists "admins update question images" on storage.objects;
create policy "admins update question images"
on storage.objects for update
to authenticated
using (bucket_id = 'question-images' and public.is_admin())
with check (bucket_id = 'question-images' and public.is_admin());

drop policy if exists "admins delete question images" on storage.objects;
create policy "admins delete question images"
on storage.objects for delete
to authenticated
using (bucket_id = 'question-images' and public.is_admin());

drop policy if exists "students view question images" on storage.objects;
create policy "students view question images"
on storage.objects for select
to public
using (bucket_id = 'question-images');
