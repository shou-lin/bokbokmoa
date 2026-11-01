-- 복복모아: 로그인한 사람의 생년월일시와 제작자 피드백.
-- focusdrop과 같은 Supabase 프로젝트를 쓰므로 테이블 이름 앞에 bokbok_ 를 붙인다.
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 한 번 실행한다. 다시 실행해도 안전하다.

create table if not exists public.bokbok_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birth_date text not null,
  calendar text not null check (calendar in ('solar', 'lunar')),
  is_leap_month boolean not null default false,
  birth_time text,
  updated_at timestamptz not null default now()
);

create table if not exists public.bokbok_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null default (auth.jwt() ->> 'email'),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.bokbok_profiles enable row level security;
alter table public.bokbok_feedback enable row level security;

-- 내 정보: 본인 것만 읽고 쓴다
drop policy if exists "bokbok profiles: own row" on public.bokbok_profiles;
create policy "bokbok profiles: own row" on public.bokbok_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 피드백: 로그인한 사람은 보낼 수만 있고, 읽기는 제작자 이메일만
drop policy if exists "bokbok feedback: signed-in users send" on public.bokbok_feedback;
create policy "bokbok feedback: signed-in users send" on public.bokbok_feedback
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "bokbok feedback: creator reads" on public.bokbok_feedback;
create policy "bokbok feedback: creator reads" on public.bokbok_feedback
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'shourim01@korea.ac.kr');
