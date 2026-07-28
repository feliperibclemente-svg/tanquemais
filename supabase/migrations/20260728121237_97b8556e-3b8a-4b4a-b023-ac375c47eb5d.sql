REVOKE EXECUTE ON FUNCTION public.recalc_statistics(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fuelings_after_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;