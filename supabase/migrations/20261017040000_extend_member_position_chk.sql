-- gangchung_members_hierarchy_chk와 별개로 존재하던 position 값 자체의 CHECK 제약.
-- git에 CREATE TABLE이 없어 20261017010000 작성 시점엔 존재를 몰랐다 — 실측 확인(2026-10-17)으로 발견.
-- 기존 정의: check (position in ('초원지기','목자','목원','임원단')) — 목사/전도사를 추가한다.
alter table gangchung_members drop constraint gangchung_members_position_chk;

alter table gangchung_members add constraint gangchung_members_position_chk
  check (position in ('초원지기', '목자', '목원', '임원단', '목사', '전도사'));
