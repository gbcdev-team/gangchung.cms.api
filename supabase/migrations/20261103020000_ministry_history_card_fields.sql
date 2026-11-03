-- 지난 사역 히스토리 카드 노출용 필드 추가(부제목, 날짜 표기, 간단한 설명, 버튼 목록).
-- 여러 번 실행해도 안전하도록 idempotent하게 작성한다.
alter table public.gangchung_ministry_histories
  add column if not exists subtitle text,
  add column if not exists date_text text,
  add column if not exists summary text,
  -- [{ "label": "홀리윈", "url": "https://..." }, ...] (최대 3개는 앱에서 검증)
  add column if not exists buttons jsonb not null default '[]'::jsonb;

-- 이전에 잠깐 쓰던 단일 링크 컬럼은 buttons로 대체한다.
alter table public.gangchung_ministry_histories
  drop column if exists link_url;

-- 공개 API 설정 행이 있는 환경에서만 노출 컬럼을 갱신한다.
-- (statkit_content_api_configs는 이 레포의 마이그레이션이 만들지 않는 기존 테이블)
do $$
begin
  if to_regclass('public.statkit_content_api_configs') is null then
    return;
  end if;

  update public.statkit_content_api_configs
  set select_columns = 'id, title, subtitle, slug, thumbnail_url, category, date_text, summary, buttons, content, sort_order, created_at, updated_at'
  where resource_slug = 'ministry-history';
end;
$$;
