REVOKE INSERT, UPDATE ON public.stations, public.station_prices, public.price_history FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.posts, public.comments, public.likes, public.clubs, public.club_members, public.followers, public.user_badges, public.station_reviews, public.station_photos FROM authenticated;
REVOKE SELECT ON public.posts, public.comments, public.likes, public.user_badges, public.station_reviews, public.station_photos FROM anon;
ALTER TABLE public.profiles ALTER COLUMN visibility SET DEFAULT 'private';
UPDATE public.profiles SET visibility = 'private' WHERE visibility IS DISTINCT FROM 'private';