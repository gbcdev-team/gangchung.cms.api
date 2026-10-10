-- 구성원 엑셀 전체 교체 기능용 RPC.
-- gangchung_members_hierarchy_chk 제약: 초원지기/임원단은 parent_id가 반드시 null,
-- 목자/목원은 parent_id가 반드시 non-null이어야 한다 (실측 확인됨).
-- 이 제약 때문에 기존 행의 parent_id를 일괄로 null로 비우는 것조차 불가능하다
-- (목자/목원 행을 null로 바꾸는 순간 같은 제약 위반). 그래서 parent_id를 건드리지 않고
-- 역순(목원 → 목자 → 최상위)으로 삭제해 FK(RESTRICT)와 CHECK를 동시에 만족시킨다.
-- 삽입은 반대로 순서대로(최상위 → 목자 → 목원) 최종 parent_id를 그대로 채워 넣는다.
-- 이 프로젝트는 WHERE 없는 UPDATE/DELETE를 거부하므로(pg-safeupdate류) 전체 대상 구문에도 WHERE를 명시한다.
create or replace function replace_all_members(members jsonb)
returns void
language plpgsql
as $$
begin
  delete from gangchung_members where position = '목원';
  delete from gangchung_members where position = '목자';
  delete from gangchung_members where position in ('초원지기', '임원단');

  -- 1단계: 최상위(초원지기/임원단) — parent_id는 항상 null
  insert into gangchung_members (id, name, phone, gender, age_group, birth_date, position, parent_id)
  select
    (rec->>'id')::uuid,
    rec->>'name',
    nullif(rec->>'phone', ''),
    nullif(rec->>'gender', ''),
    nullif(rec->>'age_group', ''),
    nullif(rec->>'birth_date', '')::date,
    rec->>'position',
    null
  from jsonb_array_elements(members) as rec
  where rec->>'position' in ('초원지기', '임원단');

  -- 2단계: 목자 — parent_id(초원지기)가 1단계에서 이미 삽입되어 있음
  insert into gangchung_members (id, name, phone, gender, age_group, birth_date, position, parent_id)
  select
    (rec->>'id')::uuid,
    rec->>'name',
    nullif(rec->>'phone', ''),
    nullif(rec->>'gender', ''),
    nullif(rec->>'age_group', ''),
    nullif(rec->>'birth_date', '')::date,
    rec->>'position',
    (rec->>'parent_id')::uuid
  from jsonb_array_elements(members) as rec
  where rec->>'position' = '목자';

  -- 3단계: 목원 — parent_id(목자)가 2단계에서 이미 삽입되어 있음
  insert into gangchung_members (id, name, phone, gender, age_group, birth_date, position, parent_id)
  select
    (rec->>'id')::uuid,
    rec->>'name',
    nullif(rec->>'phone', ''),
    nullif(rec->>'gender', ''),
    nullif(rec->>'age_group', ''),
    nullif(rec->>'birth_date', '')::date,
    rec->>'position',
    (rec->>'parent_id')::uuid
  from jsonb_array_elements(members) as rec
  where rec->>'position' = '목원';
end;
$$;

-- Postgres는 함수 생성 시 기본적으로 PUBLIC(anon/authenticated 포함)에 EXECUTE를 부여한다.
-- Supabase가 public 스키마 함수를 PostgREST로 그대로 노출하므로, revoke 없이는
-- 브라우저에 박히는 anon key만으로 mock-auth를 우회해 전체 삭제가 가능해진다.
revoke all on function replace_all_members(jsonb) from public, anon, authenticated;
grant execute on function replace_all_members(jsonb) to service_role;
