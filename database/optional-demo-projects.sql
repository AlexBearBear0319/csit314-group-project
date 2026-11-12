-- Optional demo content for CSIT314-CCB / csit314.
-- Adds six projects to the existing designer1 account. Existing rows are kept.
-- Re-running this query does not add the same demo projects again.
WITH demo(name, description, property_type, design_style, status, completion_date) AS (
  VALUES
    ('[Demo] The Olive House', 'Demo concept. An open living room with olive seating, oak joinery and soft daylight.', 'HDB apartment', 'Japandi', 'current', NULL::date),
    ('[Demo] Clay Courtyard', 'Demo concept. A warm home with clay walls, linen fabrics and a quiet reading corner.', 'Condominium', 'Warm minimalism', 'current', NULL::date),
    ('[Demo] The Light Studio', 'Demo concept. A compact workspace with light timber, flexible shelving and plants.', 'Home office', 'Scandinavian', 'current', NULL::date),
    ('[Demo] Stone & Walnut', 'Demo concept. A calm living space with stone surfaces and dark walnut details.', 'Condominium', 'Contemporary', 'past', DATE '2026-09-18'),
    ('[Demo] Garden Apartment', 'Demo concept. A bright apartment with sage accents and a small indoor garden.', 'HDB apartment', 'Biophilic', 'past', DATE '2026-08-22'),
    ('[Demo] Linen Loft', 'Demo concept. An airy loft with linen seating, rounded furniture and warm plaster walls.', 'Loft', 'Soft minimalism', 'past', DATE '2026-07-11')
)
INSERT INTO public.interior_design_project
  (name, description, property_type, design_style, status, completion_date, designer_account_id)
SELECT d.*, a.id
FROM demo d
JOIN public.user_account a ON a.username = 'designer1'
JOIN public.user_profile p ON p.id = a."profileId" AND p.name = 'Interior Designer'
WHERE NOT EXISTS (
  SELECT 1 FROM public.interior_design_project existing
  WHERE existing.designer_account_id = a.id AND existing.name = d.name
)
RETURNING id, name, status, designer_account_id;
