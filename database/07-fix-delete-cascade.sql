-- =============================================================================
-- FIX: deleting a project fails with "This record is still in use"
--
-- When an Interior Designer deletes a project (stories #23 and #28), our code
-- deletes only the project row. It expects the database to remove the rows that
-- belong to the project at the same time: its photos, its photo upload records
-- and the shortlist rows of the Customers who saved it (ON DELETE CASCADE).
-- Files 02 and 06 create those links with ON DELETE CASCADE, but some databases
-- were built in a different way and have plain links. In those databases the
-- delete is refused as soon as a project has a photo or a shortlist row.
--
-- This script rebuilds those three links with ON DELETE CASCADE. It changes no
-- data. It is safe to run more than once, and safe on a database that already
-- has CASCADE.
--
-- HOW TO RUN: open the Supabase SQL Editor, paste this file and click Run.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  link   RECORD;   -- one (table, column) pair we want to fix
  old_fk RECORD;   -- an existing foreign key on that column
BEGIN
  FOR link IN
    SELECT * FROM (VALUES
      ('project_image', 'project_id'),
      ('idp_image_upload_intent', 'project_id'),
      ('shortlist_item', 'project_id')
    ) AS t(tbl, col)
    -- skip a table that does not exist in this database
    WHERE to_regclass('public.' || t.tbl) IS NOT NULL
  LOOP
    -- drop every existing foreign key on this column, whatever it is called
    FOR old_fk IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
      WHERE con.contype = 'f'
        AND con.conrelid = ('public.' || link.tbl)::regclass
        AND att.attname = link.col
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', link.tbl, old_fk.conname);
    END LOOP;

    -- add it back, this time with ON DELETE CASCADE
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.interior_design_project(id) ON DELETE CASCADE',
      link.tbl, link.tbl || '_' || link.col || '_fkey', link.col
    );
  END LOOP;
END
$$;

COMMIT;

-- Check: the delete rule of each link should now say CASCADE.
SELECT con.conrelid::regclass AS table_name,
       con.conname            AS foreign_key,
       CASE con.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' ELSE con.confdeltype::text END AS on_delete
FROM pg_constraint con
WHERE con.contype = 'f'
  AND con.confrelid = 'public.interior_design_project'::regclass
ORDER BY 1;
