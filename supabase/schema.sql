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
  question_text text,
  image_path text,
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

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
for insert to authenticated
with check (id = auth.uid() and role = 'student');

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


-- Prevent authenticated clients (including students) from reading answer keys.
-- Scoring is performed by the trusted RPC below.
revoke select on public.question_options from authenticated;
grant select (id, question_id, option_text, sort_order) on public.question_options to authenticated;

-- Secure server-side submission/scoring.
create or replace function public.submit_attempt(
  p_exam_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
  v_total numeric := 0;
  v_score numeric := 0;
  v_percentage numeric := 0;
  v_pass numeric;
  v_passed boolean;
  v_item jsonb;
  v_question_id uuid;
  v_option_id uuid;
  v_points numeric;
  v_correct boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.exams
    where id = p_exam_id and is_published = true
  ) then
    raise exception 'Exam is not available';
  end if;

  select pass_percentage into v_pass
  from public.exams where id = p_exam_id;

  insert into public.attempts (exam_id, student_id, started_at)
  values (p_exam_id, auth.uid(), now())
  returning id into v_attempt_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_question_id := (v_item->>'question_id')::uuid;
    v_option_id := nullif(v_item->>'option_id','')::uuid;

    select q.points, exists (
      select 1
      from public.question_options qo
      where qo.id = v_option_id
        and qo.question_id = q.id
        and qo.is_correct = true
    )
    into v_points, v_correct
    from public.questions q
    where q.id = v_question_id
      and q.exam_id = p_exam_id;

    if v_points is null then
      continue;
    end if;

    v_total := v_total + v_points;
    if v_correct then
      v_score := v_score + v_points;
    end if;

    insert into public.attempt_answers
      (attempt_id, question_id, selected_option_id, is_correct, points_awarded)
    values
      (v_attempt_id, v_question_id, v_option_id, v_correct, case when v_correct then v_points else 0 end);
  end loop;

  if v_total > 0 then
    v_percentage := round((v_score / v_total) * 100, 2);
  end if;

  v_passed := v_percentage >= v_pass;

  update public.attempts
  set submitted_at = now(),
      score = v_score,
      total_points = v_total,
      percentage = v_percentage,
      passed = v_passed
  where id = v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score', v_score,
    'total_points', v_total,
    'percentage', v_percentage,
    'passed', v_passed,
    'pass_percentage', v_pass
  );
end;
$$;

revoke all on function public.submit_attempt(uuid, jsonb) from public;
grant execute on function public.submit_attempt(uuid, jsonb) to authenticated;


-- Automatically create a student profile whenever a Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email,''), '@', 1), 'Student'),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- Simple username/password admin account used by the app's low-friction admin login.
-- Student access remains anonymous; the browser session identifies the student.
create table if not exists public.admin_accounts (
  id boolean primary key default true check (id = true),
  username text not null unique,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_accounts enable row level security;
revoke all on public.admin_accounts from anon, authenticated;

insert into public.admin_accounts (id, username, password_hash)
values (true, 'eng.wael', crypt('12345', gen_salt('bf')))
on conflict (id) do nothing;

create or replace function public.admin_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_ok boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select exists(
    select 1 from public.admin_accounts
    where lower(username)=lower(trim(p_username))
      and password_hash = crypt(p_password, password_hash)
  ) into v_ok;

  if not v_ok then
    return jsonb_build_object('ok', false);
  end if;

  update public.profiles
  set role='admin'
  where id=auth.uid();

  return jsonb_build_object('ok', true, 'role', 'admin');
end;
$$;

create or replace function public.admin_change_password(p_current_password text, p_new_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_ok boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then
    raise exception 'Admin access required';
  end if;
  if length(coalesce(p_new_password,'')) < 5 then
    raise exception 'Password must be at least 5 characters';
  end if;

  select exists(
    select 1 from public.admin_accounts
    where lower(username)='eng.wael'
      and password_hash = crypt(p_current_password, password_hash)
  ) into v_ok;

  if not v_ok then
    return jsonb_build_object('ok', false);
  end if;

  update public.admin_accounts
  set password_hash=crypt(p_new_password, gen_salt('bf')), updated_at=now()
  where lower(username)='eng.wael';

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_login(text,text) from public;
grant execute on function public.admin_login(text,text) to anon, authenticated;
revoke all on function public.admin_change_password(text,text) from public;
grant execute on function public.admin_change_password(text,text) to authenticated;
