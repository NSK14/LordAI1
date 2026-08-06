-- Extend grade_band to support elementary (classes 1-5).
-- learning_concepts.grade_band has its own CHECK; learning_user_concepts has another.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conrelid::regclass::text AS tbl, conname
    FROM pg_constraint
    WHERE conrelid IN ('learning_concepts'::regclass, 'learning_user_concepts'::regclass)
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%grade_band%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;

  ALTER TABLE public.learning_concepts
    ADD CONSTRAINT learning_concepts_grade_band_check CHECK (grade_band IN ('elementary', 'middle', 'high'));
  ALTER TABLE public.learning_user_concepts
    ADD CONSTRAINT learning_user_concepts_grade_band_check CHECK (grade_band IN ('elementary', 'middle', 'high'));
END $$;

-- Seed elementary (Class 1-5) curriculum concepts so every class 1-12 has
-- at least one catalog concept. Encoding follows the existing CBSE pattern
-- (standard_code = CBSE-<class>-<subject>-<num>, id = cbse-<subj>-<class>-<slug>).
INSERT INTO public.learning_concepts (id, standard_code, framework, subject, grade_band, title, description, prerequisites, version, license, reviewed, chapter, misconception_tags, difficulty, estimated_study_minutes, keywords, learning_objectives)
VALUES
  -- Class 1
  ('cbse-math-1-numbers',    'CBSE-1-MATH-1', 'CBSE', 'Mathematics',    'elementary', 'Numbers and Counting',      'Recognize and count numbers 1-10.',                '{}', 1, 'CC-BY-4.0', true, 'Numbers',       '{}', 1, 20, ARRAY['counting','numbers'], ARRAY['Count to 10']),
  ('cbse-math-1-addition',   'CBSE-1-MATH-2', 'CBSE', 'Mathematics',    'elementary', 'Addition',                   'Add single-digit numbers.',                         '{}', 1, 'CC-BY-4.0', true, 'Addition',      '{}', 1, 20, ARRAY['addition'],            ARRAY['Add numbers']),
  ('cbse-eng-1-letters',     'CBSE-1-ENG-1',  'CBSE', 'English',        'elementary', 'Letters and Sounds',         'Identify letters and their sounds.',                '{}', 1, 'CC-BY-4.0', true, 'Phonics',       '{}', 1, 20, ARRAY['phonics','letters'],   ARRAY['Letter recognition']),
  ('cbse-hin-1-akshar',      'CBSE-1-HIN-1',  'CBSE', 'Hindi',          'elementary', 'अक्षर एवं ध्वनि',             'Identify Hindi vowels and consonants.',             '{}', 1, 'CC-BY-4.0', true, 'वर्णमाला',     '{}', 1, 20, ARRAY['hindi','vowels'],       ARRAY['Hindi letter recognition']),
  -- Class 2
  ('cbse-math-2-numbers',    'CBSE-2-MATH-1', 'CBSE', 'Mathematics',    'elementary', 'Numbers and Place Value',    'Understand tens and ones.',                         '{}', 1, 'CC-BY-4.0', true, 'Place Value',   '{}', 1, 20, ARRAY['place-value'],         ARRAY['Place value']),
  ('cbse-math-2-subtraction','CBSE-2-MATH-2', 'CBSE', 'Mathematics',    'elementary', 'Subtraction',                'Subtract single- and double-digit numbers.',        '{}', 1, 'CC-BY-4.0', true, 'Subtraction',   '{}', 1, 20, ARRAY['subtraction'],         ARRAY['Subtract numbers']),
  ('cbse-eng-2-words',       'CBSE-2-ENG-1',  'CBSE', 'English',        'elementary', 'Words and Sentences',         'Build simple sentences.',                           '{}', 1, 'CC-BY-4.0', true, 'Sentences',     '{}', 1, 20, ARRAY['sentences'],           ARRAY['Sentence building']),
  -- Class 3
  ('cbse-math-3-multiplication','CBSE-3-MATH-1','CBSE','Mathematics',   'elementary', 'Multiplication',              'Multiply single-digit numbers.',                    '{}', 1, 'CC-BY-4.0', true, 'Multiplication','{}', 1, 20, ARRAY['multiplication'],       ARRAY['Multiply']),
  ('cbse-math-3-division',   'CBSE-3-MATH-2', 'CBSE', 'Mathematics',    'elementary', 'Division',                    'Divide small numbers with remainders.',             '{}', 1, 'CC-BY-4.0', true, 'Division',      '{}', 1, 20, ARRAY['division'],            ARRAY['Divide']),
  ('cbse-sci-3-things',      'CBSE-3-SCI-1',  'CBSE', 'Science',        'elementary', 'Things We Make and Do',       'Explore materials and their uses.',                 '{}', 1, 'CC-BY-4.0', true, 'Materials',     '{}', 1, 20, ARRAY['materials'],           ARRAY['Classify materials']),
  ('cbse-ss-3-community',    'CBSE-3-SS-1',   'CBSE', 'Social Science', 'elementary', 'Our Community',               'Understand family, school, and community roles.',   '{}', 1, 'CC-BY-4.0', true, 'Community',     '{}', 1, 20, ARRAY['community'],           ARRAY['Community roles']),
  -- Class 4
  ('cbse-math-4-decimals',   'CBSE-4-MATH-1', 'CBSE', 'Mathematics',    'elementary', 'Decimals',                    'Read, write, and compare decimals.',                '{}', 1, 'CC-BY-4.0', true, 'Decimals',      '{}', 1, 20, ARRAY['decimals'],            ARRAY['Decimals']),
  ('cbse-math-4-geometry',   'CBSE-4-MATH-2', 'CBSE', 'Mathematics',    'elementary', 'Basic Geometry',              'Identify lines, angles, and shapes.',               '{}', 1, 'CC-BY-4.0', true, 'Geometry',      '{}', 1, 20, ARRAY['geometry'],            ARRAY['Shapes and angles']),
  ('cbse-sci-4-foods',       'CBSE-4-SCI-1',  'CBSE', 'Science',        'elementary', 'Food and Digestion',          'Learn where food comes from and how we digest it.', '{}', 1, 'CC-BY-4.0', true, 'Food',          '{}', 1, 20, ARRAY['food','digestion'],    ARRAY['Food sources']),
  ('cbse-ss-4-maps',         'CBSE-4-GEO-1',  'CBSE', 'Social Science', 'elementary', 'Maps and Globe',              'Read maps and locate places.',                      '{}', 1, 'CC-BY-4.0', true, 'Maps',          '{}', 1, 20, ARRAY['maps'],               ARRAY['Map skills']),
  -- Class 5
  ('cbse-math-5-fractions',  'CBSE-5-MATH-1', 'CBSE', 'Mathematics',    'elementary', 'Fractions',                   'Compare and operate on fractions.',                 '{}', 1, 'CC-BY-4.0', true, 'Fractions',     '{}', 1, 20, ARRAY['fractions'],          ARRAY['Fraction operations']),
  ('cbse-math-5-decimals',   'CBSE-5-MATH-2', 'CBSE', 'Mathematics',    'elementary', 'Decimals and Percentages',    'Convert between decimals and percentages.',         '{}', 1, 'CC-BY-4.0', true, 'Decimals',      '{}', 1, 20, ARRAY['decimals','percent'], ARRAY['Decimals and percent']),
  ('cbse-sci-5-living',       'CBSE-5-SCI-1',  'CBSE', 'Science',        'elementary', 'Living Organisms',            'Group plants and animals by characteristics.',      '{}', 1, 'CC-BY-4.0', true, 'Living Things', '{}', 1, 20, ARRAY['biology'],            ARRAY['Classification']),
  ('cbse-ss-5-physical',      'CBSE-5-SS-1',   'CBSE', 'Social Science', 'elementary', 'Physical Features of Earth',  'Describe landforms and water bodies.',              '{}', 1, 'CC-BY-4.0', true, 'Earth',         '{}', 1, 20, ARRAY['geography'],          ARRAY['Landforms'])
ON CONFLICT (id) DO NOTHING;
