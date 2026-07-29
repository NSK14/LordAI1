-- CBSE-first concept catalog expansion.
-- Adds realistic NCERT-aligned concepts for classes 6–12 across Mathematics, Science, Social Science, English, and Hindi.
-- Duplicate IDs bump the version so existing student mastery rows remain valid.

INSERT INTO public.learning_concepts (id, standard_code, framework, subject, grade_band, title, description, prerequisites, chapter, misconception_tags, version) VALUES
-- Mathematics — Class 6
('cbse-math-6-knowing-numbers','CBSE-6-MATH-1','CBSE','Mathematics','middle','Knowing our numbers','Compare, order and estimate numbers up to 1 crore; Indian and International place value systems.', '{}', 'Number System', ARRAY['place-value','estimation'], 1),
('cbse-math-6-fractions','CBSE-6-MATH-7','CBSE','Mathematics','middle','Fractions and decimals','Proper, improper and mixed fractions; decimal operations and real-life estimation.', ARRAY['cbse-math-6-knowing-numbers'], 'Fractions', ARRAY['fraction-equivalence','decimal-shift'], 1),
('cbse-math-6-ratio','CBSE-6-MATH-12','CBSE','Mathematics','middle','Ratio and proportion','Unitary method, equivalent ratios and direct proportion in daily contexts.', ARRAY['cbse-math-6-fractions'], 'Ratio and Proportion', ARRAY['ratio-vs-rate'], 1),
-- Mathematics — Class 7
('cbse-math-7-integers','CBSE-7-MATH-1','CBSE','Mathematics','middle','Integers','Properties of addition, subtraction, multiplication and division on integers; number-line sense.', '{}', 'Integers', ARRAY['negative-numbers','sign-rules'], 1),
('cbse-math-7-fractions-decimals','CBSE-7-MATH-2','CBSE','Mathematics','middle','Fractions and decimals','Multiply/divide fractions and decimals; convert between forms and apply to word problems.', ARRAY['cbse-math-6-fractions'], 'Fractions and Decimals', ARRAY['fraction-equivalence','decimal-shift'], 1),
('cbse-math-7-data','CBSE-7-MATH-3','CBSE','Mathematics','middle','Data handling','Mean, median, mode and bar charts; probability vocabulary.', '{}', 'Data Handling', ARRAY['mean-vs-medium'], 1),
('cbse-math-7-simple-equations','CBSE-7-MATH-4','CBSE','Mathematics','middle','Simple equations','Form and solve linear equations with one variable; verify solutions by substitution.', ARRAY['cbse-math-7-integers'], 'Simple Equations', ARRAY['equation-balance'], 1),
-- Mathematics — Class 8
('cbse-math-8-rational','CBSE-8-MATH-1','CBSE','Mathematics','middle','Rational numbers','Closure, commutative and associative properties; representation on number line.', '{}', 'Rational Numbers', ARRAY['closure-misconception'], 1),
('cbse-math-8-linear-equations','CBSE-8-MATH-2','CBSE','Mathematics','middle','Linear equations in one variable','Solve equations with variables on both sides; reduce to linear form and contextual problems.', ARRAY['cbse-math-7-simple-equations'], 'Linear Equations in One Variable', ARRAY['equation-balance'], 1),
('cbse-math-8-quadrilaterals','CBSE-8-MATH-3','CBSE','Mathematics','middle','Understanding quadrilaterals','Properties of parallelograms, rectangles, rhombus and square; angle sums.', '{}', 'Understanding Quadrilaterals', ARRAY['rectangle-vs-square'], 1),
('cbse-math-8-data','CBSE-8-MATH-4','CBSE','Mathematics','middle','Data handling','Organising data; pie charts; probability of everyday events.', ARRAY['cbse-math-7-data'], 'Data Handling', ARRAY['mean-vs-medium'], 1),
('cbse-math-8-squares-roots','CBSE-8-MATH-6','CBSE','Mathematics','middle','Squares and square roots','Prime factorisation method, long-division method and estimation of square roots.', ARRAY['cbse-math-8-rational'], 'Squares and Square Roots', ARRAY['square-root-estimate'], 1),
-- Mathematics — Class 9
('cbse-math-9-real-numbers','CBSE-9-MATH-1','CBSE','Mathematics','high','Real numbers','Euclid division lemma, fundamental theorem of arithmetic and irrational numbers.', '{}', 'Number Systems', ARRAY['irrational-proof'], 1),
('cbse-math-9-polynomials','CBSE-9-MATH-2','CBSE','Mathematics','high','Polynomials in one variable','Degree, zeroes, remainder theorem, factor theorem and algebraic identities.', '{}', 'Polynomials', ARRAY['degree-confusion'], 1),
('cbse-math-9-coordinate','CBSE-9-MATH-3','CBSE','Mathematics','high','Coordinate geometry','Cartesian plane, plotting points, abscissa and ordinate in first quadrant and all quadrants.', '{}', 'Coordinate Geometry', ARRAY['quadrant-flip'], 1),
-- Mathematics — Class 10
('cbse-math-10-real','CBSE-10-MATH-1','CBSE','Mathematics','high','Real numbers','Euclid division lemma; fundamental theorem; decimal expansions; HCF and LCM.', ARRAY['cbse-math-9-real-numbers'], 'Real Numbers', ARRAY['irrational-proof'], 1),
('cbse-math-10-polynomials','CBSE-10-MATH-2','CBSE','Mathematics','high','Polynomials','Zeroes of a polynomial, relationship between zeroes and coefficients, division algorithm.', ARRAY['cbse-math-9-polynomials'], 'Polynomials', ARRAY['zeroes-count'], 1),
('cbse-math-10-linear-2','CBSE-10-MATH-3','CBSE','Mathematics','high','Pair of linear equations','Graphical, substitution, elimination and cross-multiplication methods; consistency.', ARRAY['cbse-math-8-linear-equations'], 'Pair of Linear Equations in Two Variables', ARRAY['parallel-vs-coincident'], 1),
('cbse-math-10-quadratic','CBSE-10-MATH-4','CBSE','Mathematics','high','Quadratic equations','Factorisation, completing the square and quadratic formula; nature of roots.', ARRAY['cbse-math-10-linear-2','cbse-math-9-real-numbers'], 'Quadratic Equations', ARRAY['discriminant-meaning'], 1),
('cbse-math-10-triangles','CBSE-10-MATH-6','CBSE','Mathematics','high','Triangles','Similarity criteria, area of similar triangles and Pythagoras theorem with applications.', '{}', 'Triangles', ARRAY['similar-vs-congruent'], 1),
('cbse-math-10-circles','CBSE-10-MATH-10','CBSE','Mathematics','high','Circles','Tangent properties, number of tangents from a point and chord contact theorem.', ARRAY['cbse-math-10-triangles'], 'Circles', ARRAY['tangent-meets-radius'], 1),
-- Science — Class 6
('cbse-sci-6-food','CBSE-6-SCI-1','CBSE','Science','middle','Food: where does it come from?','Sources of food, plant and animal products, parts of plants we eat.', '{}', 'Food: Where Does It Come From?', ARRAY['omnivore-category'], 1),
('cbse-sci-6-materials','CBSE-6-SCI-2','CBSE','Science','middle','Sorting materials into groups','Properties of materials: appearance, hardness, solubility, buoyancy and transparency.', '{}', 'Sorting Materials into Groups', ARRAY['transparent-vs-translucent'], 1),
('cbse-sci-6-separation','CBSE-6-SCI-3','CBSE','Science','middle','Separation of substances','Handpicking, winnowing, sieving, filtration, evaporation and condensation.', '{}', 'Separation of Substances', ARRAY['condensation-vs-evaporation'], 1),
-- Science — Class 7
('cbse-sci-7-nutrition','CBSE-7-SCI-1','CBSE','Science','middle','Nutrition in plants','Photosynthesis, saprotrophs and nutrients in soil; mode of nutrition in heterotrophs.', '{}', 'Nutrition in Plants', ARRAY['photosynthesis-only-food'], 1),
('cbse-sci-7-heat','CBSE-7-SCI-3','CBSE','Science','middle','Heat','Conduction, convection, radiation; sea breeze and land breeze.', '{}', 'Heat', ARRAY['conduction-vs-convection'], 1),
('cbse-sci-7-weather','CBSE-7-SCI-7','CBSE','Science','middle','Weather, climate and adaptations','Climate zones, factors affecting climate and animal/plant adaptations.', '{}', 'Weather, Climate and Adaptations of Animals to Climate', ARRAY['weather-vs-climate'], 1),
-- Science — Class 8
('cbse-sci-8-crop-production','CBSE-8-SCI-1','CBSE','Science','middle','Crop production and management','Soil preparation, sowing, irrigation, weeding, harvesting and storage.', '{}', 'Crop Production and Management', ARRAY['irrigation-methods'], 1),
('cbse-sci-8-microorganisms','CBSE-8-SCI-2','CBSE','Science','middle','Microorganisms','Useful and harmful microbes; nitrogen cycle and pasteurisation.', '{}', 'Microorganisms: Friend and Foe', ARRAY['all-microbes-harmful'], 1),
('cbse-sci-8-force','CBSE-8-SCI-11','CBSE','Science','middle','Force and pressure','Push, pull, contact and non-contact forces; pressure and its applications.', '{}', 'Force and Pressure', ARRAY['force-needs-contact'], 1),
('cbse-sci-8-sound','CBSE-8-SCI-13','CBSE','Science','middle','Sound','Vibrations, amplitude, frequency, audible range and noise pollution.', '{}', 'Sound', ARRAY['loudness-vs-pitch'], 1),
-- Science — Class 9
('cbse-sci-9-matter','CBSE-9-SCI-1','CBSE','Science','high','Matter in our surroundings','States of matter, diffusion, Brownian motion and change of state.', '{}', 'Matter in Our Surroundings', ARRAY['solid-fastest-diffusion'], 1),
('cbse-sci-9-motion','CBSE-9-SCI-8','CBSE','Science','high','Motion','Distance, displacement, speed, velocity, acceleration; equations of motion.', '{}', 'Motion', ARRAY['speed-vs-velocity'], 1),
('cbse-sci-9-gravity','CBSE-9-SCI-10','CBSE','Science','high','Gravitation','Universal law of gravitation, free fall, mass, weight and buoyancy.', ARRAY['cbse-sci-9-motion'], 'Gravitation', ARRAY['weight-vs-mass'], 1),
-- Science — Class 10
('cbse-sci-10-chemical-reactions','CBSE-10-SCI-1','CBSE','Science','high','Chemical reactions and equations','Balancing equations, types of reactions and corrosion prevention.', '{}', 'Chemical Reactions and Equations', ARRAY['mass-destroyed'], 1),
('cbse-sci-10-acids-bases','CBSE-10-SCI-2','CBSE','Science','high','Acids, bases and salts','pH scale, indicators and salts: washing soda, baking soda and bleaching powder.', '{}', 'Acids, Bases and Salts', ARRAY['all-indicators-same'], 1),
('cbse-sci-10-electricity','CBSE-10-SCI-12','CBSE','Science','high','Electricity','Ohm law, series and parallel circuits, heating effect and electric power.', '{}', 'Electricity', ARRAY['current-vs-voltage'], 1),
('cbse-sci-10-light','CBSE-10-SCI-10','CBSE','Science','high','Light – reflection and refraction','Spherical mirrors, lens formula, magnification and defect of vision.', ARRAY['cbse-sci-8-materials'], 'Light – Reflection and Refraction', ARRAY['mirror-lens-formula'], 1),
('cbse-sci-10-life-processes','CBSE-10-SCI-6','CBSE','Science','high','Life processes','Nutrition, respiration, transport and excretion in plants and animals.', '{}', 'Life Processes', ARRAY['respiration-only-lungs'], 1),
-- Social Science — Class 6
('cbse-ss-6-what-where','CBSE-6-SS-1','CBSE','Social Science','middle','What, where, how and when?','Sources for reconstructing history; earliest cities and dating methods.', '{}', 'What, Where, How and When?', '{}', 1),
('cbse-ss-6-new-kings','CBSE-6-SS-2','CBSE','Social Science','middle','New kings and kingdoms','Emergence of royal states, armies, taxes and the role of temples.', ARRAY['cbse-ss-6-what-where'], 'New Kings and Kingdoms', '{}', 1),
('cbse-ss-6-earth','CBSE-6-GEO-1','CBSE','Social Science','middle','The Earth in the solar system','Globe, latitudes, longitudes, time zones and motions of the Earth.', '{}', 'The Earth in the Solar System', ARRAY['rotation-causes-seasons'], 1),
('cbse-ss-6-climate','CBSE-6-GEO-2','CBSE','Social Science','middle','Climate','Atmospheric conditions, factors affecting climate and Indian seasons.', ARRAY['cbse-ss-6-earth'], 'Climate', ARRAY['weather-vs-climate'], 1),
-- Social Science — Class 8
('cbse-ss-8-resources','CBSE-8-GEO-1','CBSE','Social Science','middle','Resources','Natural, human-made and human resources; conservation and sustainable development.', '{}', 'Resources', ARRAY['all-resources-renewable'], 1),
('cbse-ss-8-people','CBSE-8-GEO-2','CBSE','Social Science','middle','Human resources','Population distribution, density, growth and composition; literacy and unemployment.', ARRAY['cbse-ss-8-resources'], 'Human Resources', ARRAY['density-vs-growth'], 1),
-- English — Class 8
('cbse-eng-8-grammar','CBSE-8-ENG-1','CBSE','English','middle','Grammar and composition','Nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions and sentence structure.', '{}', 'Grammar', ARRAY['parts-of-speech'], 1),
('cbse-eng-8-writing','CBSE-8-ENG-2','CBSE','English','middle','Writing skills','Letters, diaries, story writing and paragraph writing with coherence.', ARRAY['cbse-eng-8-grammar'], 'Writing Skills', '{}', 1),
-- Hindi — Class 8
('cbse-hin-8-vyakaran','CBSE-8-HIN-1','CBSE','Hindi','middle','Vyaakaran','Sandhi, samaas, tatsam-tadbhava, muhavare and ling vidyaan.', '{}', 'Vyaakaran', ARRAY['sandhi-types'], 1)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  prerequisites = EXCLUDED.prerequisites,
  chapter = EXCLUDED.chapter,
  misconception_tags = EXCLUDED.misconception_tags,
  version = public.learning_concepts.version + 1;
