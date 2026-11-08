-- Optional category link for Sprint 5 project details.
-- Existing projects keep a NULL category until a designer selects one.
BEGIN;
ALTER TABLE public.interior_design_project
  ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES public.idp_category(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idp_category_idx ON public.interior_design_project(category_id);
COMMIT;
