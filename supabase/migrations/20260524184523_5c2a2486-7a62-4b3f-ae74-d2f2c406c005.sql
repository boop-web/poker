
-- Pin search_path explicitly
alter function public.touch_updated_at() set search_path = public;

-- Revoke direct execute (policies + triggers still work since they run as the function owner / table owner)
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
