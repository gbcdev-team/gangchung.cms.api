-- 구성원 직분(position)에 '목사'/'전도사'를 최상위 그룹으로 추가한다.
-- 기존 gangchung_members_hierarchy_chk 제약(최상위=parent_id null / 하위=parent_id non-null)의
-- 버킷 멤버만 확장하고 기존 데이터는 건드리지 않는다.
alter table gangchung_members drop constraint gangchung_members_hierarchy_chk;

alter table gangchung_members add constraint gangchung_members_hierarchy_chk
  check (
    (position in ('초원지기', '임원단', '목사', '전도사') and parent_id is null)
    or
    (position in ('목자', '목원') and parent_id is not null)
  );
