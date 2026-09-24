ALTER TABLE public.profiles
  ADD COLUMN age_range text,
  ADD COLUMN gender text;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_range_check CHECK (age_range IS NULL OR age_range IN ('18-24','25-34','35-44','45-54','55+','nao_informar')),
  ADD CONSTRAINT profiles_gender_check CHECK (gender IS NULL OR gender IN ('mulher','homem','nao_binario','outro','nao_informar'));