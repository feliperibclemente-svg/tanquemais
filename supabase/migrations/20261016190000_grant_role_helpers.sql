-- As funções usadas nas regras de acesso precisam poder ser executadas por quem está logado.
-- Em projetos Supabase novos isso não vem por padrão depois do REVOKE ... FROM PUBLIC,
-- e sem isso o app não reconhece administradores (has_role sempre "falso").
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_club_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_following(uuid, uuid) TO authenticated, service_role;
