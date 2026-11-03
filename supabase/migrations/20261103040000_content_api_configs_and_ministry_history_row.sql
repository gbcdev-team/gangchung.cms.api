-- 공개 API 설정 테이블(statkit_content_api_configs) 생성 + 지난 사역 히스토리 행 등록.
-- 현재 Supabase 프로젝트에는 이 테이블이 없어 /api/v1/ministry-history가 404였다.
-- 컬럼은 src/libs/supabase/queries/content-api-configs.ts의 ContentApiConfig와 1:1.
-- 여러 번 실행해도 안전하도록 idempotent하게 작성한다.

create table if not exists public.statkit_content_api_configs (
  id uuid primary key default gen_random_uuid(),
  resource_slug text not null unique,
  label text not null,
  table_name text not null,
  is_enabled boolean not null default true,
  filter_column text,
  filter_value text,
  filter_is_bool boolean not null default false,
  identifier_column text not null,
  identifier_type text not null check (identifier_type in ('uuid', 'text')),
  order_column text not null,
  order_direction text not null default 'asc' check (order_direction in ('asc', 'desc')),
  select_columns text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 정책 없이 RLS만 켜 anon/authenticated의 PostgREST 직접 접근을 막는다(service role은 우회).
alter table public.statkit_content_api_configs enable row level security;

-- 발행된 글만, slug로 단건 조회. 이미 행이 있으면 노출 컬럼만 최신으로 맞춘다.
insert into public.statkit_content_api_configs (
  resource_slug, label, table_name, is_enabled,
  filter_column, filter_value, filter_is_bool,
  identifier_column, identifier_type,
  order_column, order_direction, select_columns
)
values (
  'ministry-history',
  '지난 사역 히스토리',
  'gangchung_ministry_histories',
  true,
  'is_published', 'true', true,
  'slug', 'text',
  'sort_order', 'asc',
  'id, title, subtitle, slug, thumbnail_url, category, date_text, summary, buttons, content, sort_order, created_at, updated_at'
)
on conflict (resource_slug) do update
set select_columns = excluded.select_columns,
    updated_at = now();
