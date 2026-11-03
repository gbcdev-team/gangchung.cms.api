-- buttons는 앱에서만 검증되므로, 대시보드/SQL 직접 편집으로 잘못된 형태가 들어가지 않게
-- DB에서도 "배열이며 최대 3개"를 강제한다. (요소별 {label,url} 검증은 앱 스키마 담당)
-- add constraint에는 if not exists가 없어서 drop 후 다시 만든다(여러 번 실행해도 안전).
alter table public.gangchung_ministry_histories
  drop constraint if exists gangchung_ministry_histories_buttons_chk;

alter table public.gangchung_ministry_histories
  add constraint gangchung_ministry_histories_buttons_chk
  check (
    jsonb_typeof(buttons) = 'array'
    and jsonb_array_length(buttons) <= 3
  );
