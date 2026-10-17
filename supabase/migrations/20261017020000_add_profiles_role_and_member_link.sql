-- gangchung_profiles에 구성원 트리 연결(member_id)을 추가하고, 기존 role 컬럼의
-- 허용값을 mock-auth 시절의 ('user','admin')에서 새 직분 체계로 교체한다.
-- 실측 확인(2026-10-17): role 컬럼/gangchung_profiles_role_check 제약은 이미 존재하며
-- 값은 'admin' 1건뿐이다. email/created_at/updated_at은 전부 NOT NULL.
alter table gangchung_profiles add column member_id uuid references gangchung_members(id) on delete set null;

-- 새 허용값을 걸기 전에 기존 제약부터 제거해야 'admin' -> '목사' 업데이트가 통과한다.
alter table gangchung_profiles drop constraint gangchung_profiles_role_check;

-- 기존 mock-auth 시절 레거시 값('admin' 등 새 체계에 없는 값)을 최상위 권한으로 백필.
update gangchung_profiles set role = '목사'
where role not in ('초원지기', '목자', '목사', '전도사');

alter table gangchung_profiles add constraint gangchung_profiles_role_chk
  check (role in ('초원지기', '목자', '목사', '전도사'));

-- auth.users에 신규 가입이 생기면 gangchung_profiles row를 자동 생성한다.
-- 가입 경로가 이메일 확인 링크/OAuth 등 여러 개라 "가입 폼 제출 시 서버 액션에서 insert"로는
-- 누락 위험이 있으므로, auth.users insert 시점에 한 곳에서 보장되는 Supabase 표준 트리거 패턴을 쓴다.
-- email/created_at이 NOT NULL이므로 auth.users의 값을 그대로 채워 넣는다.
create or replace function public.handle_new_gangchung_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gangchung_profiles (id, email, role, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', '목자'),
    new.raw_user_meta_data->>'full_name',
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_gangchung_profile();

-- 이 함수는 트리거 전용이지만, 이 레포의 RPC 규칙(모든 함수는 public/anon/authenticated에서
-- EXECUTE를 revoke한다)을 동일하게 적용한다.
revoke all on function public.handle_new_gangchung_profile() from public, anon, authenticated;
