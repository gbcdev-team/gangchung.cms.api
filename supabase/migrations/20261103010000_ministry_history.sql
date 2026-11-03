-- 지난 사역 히스토리(블로그형 글) 테이블 + 정렬 RPC + 이미지 버킷 + 공개 API 설정.
--
-- 이 프로젝트는 RLS 정책을 쓰지 않고 서버 코드(service role)에서 권한을 판정한다.
-- 다만 anon key가 브라우저에 노출되므로, 정책 없이 RLS만 켜서 anon/authenticated의
-- PostgREST 직접 접근을 막는다(service role은 RLS를 우회).

create table if not exists public.gangchung_ministry_histories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  thumbnail_url text,
  category text,
  content text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gangchung_ministry_histories enable row level security;

create index if not exists gangchung_ministry_histories_sort_idx
  on public.gangchung_ministry_histories (sort_order);

-- 드래그 정렬 결과(id 배열의 순서)를 sort_order로 한 번에 반영한다.
-- 이 프로젝트는 WHERE 없는 UPDATE를 거부하므로 where 절을 명시한다.
create or replace function public.reorder_ministry_histories(ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gangchung_ministry_histories h
  set sort_order = o.ord::integer
  from unnest(ids) with ordinality as o(id, ord)
  where h.id = o.id;
end;
$$;

revoke all on function public.reorder_ministry_histories(uuid[])
  from public, anon, authenticated;

-- 대표 이미지 버킷(공개 읽기). 업로드는 service role 서버 코드만 수행한다.
insert into storage.buckets (id, name, public)
values ('ministry-history', 'ministry-history', true)
on conflict (id) do nothing;

-- 공개 API: /api/v1/ministry-history (발행된 글만, slug로 단건 조회)
-- statkit_content_api_configs는 이 레포의 마이그레이션이 만들지 않는 기존 테이블이다.
-- 없는 환경(새로 만든 Supabase 프로젝트 등)에서는 등록을 건너뛰어 나머지 DDL이 롤백되지 않게 한다.
do $$
begin
  if to_regclass('public.statkit_content_api_configs') is null then
    raise notice 'statkit_content_api_configs 테이블이 없어 공개 API 설정 등록을 건너뜁니다.';
    return;
  end if;

  insert into public.statkit_content_api_configs (
    resource_slug,
    label,
    table_name,
    is_enabled,
    filter_column,
    filter_value,
    filter_is_bool,
    identifier_column,
    identifier_type,
    order_column,
    order_direction,
    select_columns
  )
  select
    'ministry-history',
    '지난 사역 히스토리',
    'gangchung_ministry_histories',
    true,
    'is_published',
    'true',
    true,
    'slug',
    'text',
    'sort_order',
    'asc',
    'id, title, slug, thumbnail_url, category, content, sort_order, created_at, updated_at'
  where not exists (
    select 1
    from public.statkit_content_api_configs
    where resource_slug = 'ministry-history'
  );
end;
$$;
