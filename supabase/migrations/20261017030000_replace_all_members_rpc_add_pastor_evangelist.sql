-- replace_all_members RPC의 최상위 직분 버킷에 '목사'/'전도사'를 추가한다.
-- 20261011004213_replace_all_members_rpc.sql의 로직/주의사항은 그대로 유지하고
-- 삭제/삽입 WHERE 절의 최상위 직분 목록만 확장한다.
create or replace function replace_all_members(members jsonb)
returns void
language plpgsql
as $$
begin
  delete from gangchung_members where position = '목원';
  delete from gangchung_members where position = '목자';
  delete from gangchung_members where position in ('초원지기', '임원단', '목사', '전도사');

  -- 1단계: 최상위(초원지기/임원단/목사/전도사) — parent_id는 항상 null
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
  where rec->>'position' in ('초원지기', '임원단', '목사', '전도사');

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

revoke all on function replace_all_members(jsonb) from public, anon, authenticated;
grant execute on function replace_all_members(jsonb) to service_role;
