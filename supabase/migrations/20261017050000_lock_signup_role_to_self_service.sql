-- 보안 수정: 회원가입 트리거가 auth.users.raw_user_meta_data의 role을 검증 없이
-- 그대로 신뢰하고 있었다 — 누구나 가입 폼(또는 signUp API 직접 호출)에서
-- role:'목사'를 보내면 승인 없이 즉시 전체 쓰기 권한(canReplaceAllMembers 등)을
-- 획득할 수 있는 권한상승 취약점이었다(code-reviewer 2026-10-17 Critical 지적).
--
-- 수정: 자가선택 가능한 역할을 '초원지기'/'목자'로 제한한다. '목사'/'전도사'를
-- 포함해 그 외 값이 들어오면 전부 '목자'로 강제한다. 목사/전도사 승격은
-- 기존 관리자가 Supabase 대시보드에서 수동으로 gangchung_profiles.role을
-- 바꿔야만 가능하다(아직 별도 승격 UI 없음).
create or replace function public.handle_new_gangchung_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data->>'role';
  safe_role text := case
    when requested_role in ('초원지기', '목자') then requested_role
    else '목자'
  end;
begin
  insert into public.gangchung_profiles (id, email, role, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    safe_role,
    new.raw_user_meta_data->>'full_name',
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_gangchung_profile() from public, anon, authenticated;
