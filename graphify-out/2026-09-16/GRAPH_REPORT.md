# Graph Report - my-portfolio  (2026-09-16)

## Corpus Check
- 324 files · ~146,696 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .log 3, .example 1, (none) 1)

## Summary
- 1747 nodes · 5116 edges · 98 communities (78 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d6842ef1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- game-provider.tsx
- math.ts
- login-form.tsx
- experience.tsx
- skill-actions.ts
- systems/index.ts
- game/types/game.ts
- drifters.tsx
- project-form.tsx
- cn
- SceneBudget
- common.ts
- experience-actions.ts
- game-store.ts
- render-registry.ts
- content.ts
- animation-toggles.tsx
- gesture-controller.ts
- corridor.tsx
- skill-galaxy.tsx
- depth-scale.tsx
- scene-signature.ts
- visitors-panel.tsx
- spawn-system.ts
- camera-rig.tsx
- scene-canvas.tsx
- hero.tsx
- use-scene-progress.ts
- world-composition.tsx
- experience-repository.ts
- config/game-config.ts
- compilerOptions
- package.json
- (site)/layout.tsx
- scene-drifters.ts
- dependencies
- tech-chain.tsx
- EntityId
- cursor-aura.tsx
- AGENTS.md
- Vec3
- CLAUDE.md
- site-settings-repository.ts
- project-actions.ts
- react
- ActionResult
- scene-scenery-store.ts
- about-form.tsx
- sitemap.ts
- constellation.tsx
- about-repository.ts
- [slug]/page.tsx
- getSiteSettings
- devDependencies
- firebase-admin.mjs
- lucide-react
- scene-palette.ts
- scripts
- settings-form.tsx
- Game Layer - Interactive World Module
- experience-form.tsx
- projects-repository.ts
- scene-root.tsx
- About Fragments
- D1 - 3D Interaction is DOM-Driven
- Firebase - Authentication & Firestore
- toast.tsx
- Pool
- Achievement System - Unlocks
- zustand
- ParticleStoreState
- ScoreStoreState
- Phases 13-20 - Transformation to Drifters
- Scenery - Garden (Organic)
- React Three Fiber
- Section-to-Section Transformation
- Performance Contract - 60fps Target
- S1 - Scenery Global State
- eslint.config.mjs
- postcss.config.mjs
- Scene Motion - Frame Loop Vocabulary
- Phase 0 - Codebase Audit
- D3 - Lenis Scroll Resolution (Deleted)
- D4 - GSAP Resolution (No Pinning)
- GSAP + ScrollTrigger
- Next Themes - Light/Dark/System
- React Hook Form + Zod
- Game Module - Public API
- Tailwind CSS v4
- skill-form.tsx
- content-actions.ts
- contact-form.tsx
- case-study-block.tsx
- use-scroll-direction.ts
- about/page.tsx
- SceneErrorBoundary
- track-schema.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 115 edges
2. `cn()` - 72 edges
3. `SceneBudget` - 45 edges
4. `lucide-react` - 42 edges
5. `useMotionPreference()` - 41 edges
6. `requireAdminDb()` - 33 edges
7. `three` - 32 edges
8. `actionSuccess` - 32 edges
9. `EntityId` - 30 edges
10. `withAdmin()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `AdminNavLink()` --calls--> `cn()`  [EXTRACTED]
  src/components/admin/admin-sidebar.tsx → src/lib/utils/cn.ts
- `HeroCoreScene()` --calls--> `useMotionPreference()`  [EXTRACTED]
  src/components/game/hero-core-scene.tsx → src/lib/hooks/use-motion-preference.ts
- `ProjectCardProps` --references--> `Project`  [EXTRACTED]
  src/components/projects/project-card.tsx → src/lib/types/content.ts
- `SkillCardProps` --references--> `Skill`  [EXTRACTED]
  src/components/skills/skill-card.tsx → src/lib/types/content.ts
- `SkillGalaxyScene()` --calls--> `useMotionPreference()`  [EXTRACTED]
  src/components/skills/skill-galaxy-scene.tsx → src/lib/hooks/use-motion-preference.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **act_i_scene_pipeline** — scene_root_canvas, use_scene_progress, scene_content_store, springs_ts_vocabulary [INFERRED 0.95]
- **game_progression_system** — game_mode_toggle, explorer_level, career_level, achievement_system, game_hud [INFERRED 0.95]
- **act_ii_section_objects** — act_i_hero_sculpture, act_i_about_fragments, act_i_skill_galaxy, act_i_experience_timeline, act_i_project_panels, act_i_contact_calm [INFERRED 0.95]

## Communities (98 total, 20 thin omitted)

### Community 0 - "game-provider.tsx"
Cohesion: 0.06
Nodes (44): WorldLayerClient, ensureContext(), primeAudio(), syncMasterVolume(), Voice, VOICES, CameraController(), CollectFlyoff() (+36 more)

### Community 1 - "math.ts"
Cohesion: 0.48
Nodes (6): clamp(), damp(), lerp(), mapRange(), smoothstep(), TAU

### Community 2 - "login-form.tsx"
Cohesion: 0.07
Nodes (40): AdminDashboardLayout(), dynamic, AdminLoginPage(), dynamic, AdminNavLink(), AdminSidebar(), renderPanel(), AdminSidebarProps (+32 more)

### Community 3 - "experience.tsx"
Cohesion: 0.15
Nodes (25): Reveal(), About(), Experience(), ExperienceProps, Projects(), headingId(), Section(), Skills() (+17 more)

### Community 4 - "skill-actions.ts"
Cohesion: 0.18
Nodes (18): EditSkillPage(), metadata, SkillForm(), actionError(), ActionFailure, revalidateSkills(), createSkillAction(), deleteSkillAction() (+10 more)

### Community 5 - "systems/index.ts"
Cohesion: 0.08
Nodes (28): playCue(), SCORE_RULES, gameBus, prefersReducedMotion(), bodyEntries(), getImpactRingMesh(), cueForReason(), ScoreReason (+20 more)

### Community 6 - "game/types/game.ts"
Cohesion: 0.10
Nodes (38): describeParts(), fusedKindFor(), fuseKinds(), isFusedKind(), partsOf(), FUSION, composeFusedDefinition(), definitionFor() (+30 more)

### Community 7 - "drifters.tsx"
Cohesion: 0.13
Nodes (31): buildDrifters(), CONTENT_MAX_PX, CONTENT_PAD_PX, contentSafeFraction(), gutterPixels(), clamp01(), clampDelta(), damp() (+23 more)

### Community 8 - "project-form.tsx"
Cohesion: 0.14
Nodes (18): react-hook-form, metadata, AboutForm(), firstMessage(), formResolver(), hoistNestedMessages(), NON_ERROR_KEYS, PROJECT_TYPES (+10 more)

### Community 9 - "cn"
Cohesion: 0.07
Nodes (29): ChartPanel(), ChartPanelProps, GameModeToggle(), MobileMenu(), MobileMenuProps, SceneryPicker(), SiteHeaderProps, Curtain() (+21 more)

### Community 10 - "SceneBudget"
Cohesion: 0.10
Nodes (33): HeroCoreScene, Core(), CoreProps, HeroCoreScene(), HeroCoreSceneProps, BUDGETS, DeviceSignals, SceneBudget (+25 more)

### Community 11 - "common.ts"
Cohesion: 0.22
Nodes (16): zod, AVAILABILITY_STATUSES, emptyToUndefined(), isoDate, optionalIsoDate, optionalText(), optionalUrl, orderIndex (+8 more)

### Community 12 - "experience-actions.ts"
Cohesion: 0.24
Nodes (15): EditExperiencePage(), metadata, ExperienceForm(), createExperienceAction(), deleteExperienceAction(), reorderExperiencesAction(), updateExperienceAction(), revalidateExperience() (+7 more)

### Community 13 - "game-store.ts"
Cohesion: 0.14
Nodes (19): GameProgressTracker(), StartAdventureLink(), SECTION_IDS, ACHIEVEMENT_LIST, ACHIEVEMENTS, evaluateAchievements(), commit(), createDefaultState() (+11 more)

### Community 14 - "render-registry.ts"
Cohesion: 0.16
Nodes (17): @react-three/rapier, ShapeMesh(), getShapeMaterial(), bodies, registerBody(), seeds, unregisterBody(), fragmentMeshes (+9 more)

### Community 15 - "content.ts"
Cohesion: 0.09
Nodes (30): ProjectsProps, Core(), CoreProps, fibonacciPoint(), PROFICIENCY_SCALE, SkillGalaxyScene(), SkillGalaxySceneProps, SkillGalaxyScene (+22 more)

### Community 16 - "animation-toggles.tsx"
Cohesion: 0.29
Nodes (9): AnimationRow, AnimationSection, AnimationToggles(), handleToggle(), AnimationTogglesProps, toggled(), setAnimationEnabledAction(), revalidateAnimationSettings() (+1 more)

### Community 17 - "gesture-controller.ts"
Cohesion: 0.13
Nodes (11): INTERACTION, emitGame(), publishCollectFlyoff(), isBlockedTarget(), GestureController, Grab, installPointerTracker(), PointerSnapshot (+3 more)

### Community 18 - "corridor.tsx"
Cohesion: 0.08
Nodes (31): CloudOptions, seededRandom(), buildShards(), HOVER_TURN, IDLE_SWING, MAX_TILT_X, MAX_TILT_Y, phase() (+23 more)

### Community 19 - "skill-galaxy.tsx"
Cohesion: 0.20
Nodes (9): HeroCore(), SceneErrorBoundary, SkillGalaxy(), normalise(), read(), sameColors(), useCssColors(), usePointer() (+1 more)

### Community 20 - "depth-scale.tsx"
Cohesion: 0.13
Nodes (17): DepthProgressContext, DepthScale(), DepthScaleList(), DepthScaleListProps, DepthScaleProps, RAKE, ScrollProgressLine(), ScrollProgressLineProps (+9 more)

### Community 21 - "scene-signature.ts"
Cohesion: 0.14
Nodes (20): COMMIT, DIM, HOLD, keyframe(), lerp(), PUSH, RELEASE, resetSignature() (+12 more)

### Community 22 - "visitors-panel.tsx"
Cohesion: 0.10
Nodes (28): AdminMessagesPage(), BreakdownBars(), BreakdownBarsProps, COLORS, ShareDonut(), ShareDonutProps, VisitorSearch(), locationOf() (+20 more)

### Community 23 - "spawn-system.ts"
Cohesion: 0.14
Nodes (15): SPAWN_RULES, WORLD_BOUNDS, SPAWNABLE_KINDS, AmbientField(), AmbientGroup(), AmbientItem, SPECIES_MIX, AmbientSpecies (+7 more)

### Community 24 - "camera-rig.tsx"
Cohesion: 0.07
Nodes (40): @react-three/fiber, sceneScroll, signature, sceneTime, tickSceneTimer(), timer, getSceneProgress(), subscribeSceneProgress() (+32 more)

### Community 25 - "scene-canvas.tsx"
Cohesion: 0.10
Nodes (24): stepDownTier(), scenePointer, setSceneDragging(), setSceneTimescale(), ATELIER, GeometryVocabularyId, getSceneryDefinition(), MaterialFamilyId (+16 more)

### Community 26 - "hero.tsx"
Cohesion: 0.20
Nodes (18): SiteFooter(), Contact(), AVAILABILITY_DOT, Hero(), SocialButtons(), SocialIcon(), ALIASES, getSocialIconPath() (+10 more)

### Community 27 - "use-scene-progress.ts"
Cohesion: 0.12
Nodes (24): AmbientBackground(), PageHeaderProps, SectionProps, DEFAULT_TONE, isSectionTone(), SECTION_TONES, SectionTone, centres (+16 more)

### Community 28 - "world-composition.tsx"
Cohesion: 0.09
Nodes (28): three, PARTICLES, FALLBACK, getServerSnapshot(), getSnapshot(), htmlClassKey(), readTonePalette(), subscribe() (+20 more)

### Community 29 - "experience-repository.ts"
Cohesion: 0.16
Nodes (27): server-only, NewExperiencePage(), AdminExperiencePage(), AdminDashboardPage(), NewSkillPage(), AdminSkillsPage(), readBoolean(), readEnum() (+19 more)

### Community 30 - "config/game-config.ts"
Cohesion: 0.15
Nodes (15): CollectRing(), ANIMATION_FEEL, BUDGET_PRESETS, CAMERA, COLLECT_FEEL, CONTAINMENT, DRAG_FEEL, getBaseEmissiveIntensity() (+7 more)

### Community 31 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+14 more)

### Community 32 - "package.json"
Cohesion: 0.09
Nodes (21): name, private, version, clsx, eslint, eslint-config-next, firebase, firebase-admin (+13 more)

### Community 33 - "(site)/layout.tsx"
Cohesion: 0.19
Nodes (11): GameHUD(), WorldLayer(), SiteHeader(), SkipLink(), JsonLd(), EXPLORER_LEVEL_THRESHOLDS, QUEST_LABELS, XP_RULES (+3 more)

### Community 34 - "scene-drifters.ts"
Cohesion: 0.20
Nodes (9): Tier, DEPTHS, DRIFTER_COUNT, DrifterForm, DrifterSpec, FORMS, LANES, SIZE_FRACS (+1 more)

### Community 35 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, clsx, firebase, firebase-admin, gsap, @hookform/resolvers, lucide-react, motion (+13 more)

### Community 36 - "tech-chain.tsx"
Cohesion: 0.18
Nodes (13): SkillCard, SkillCardProps, CardPosition, positionCard(), TechChain(), toRows(), fillRow(), TechMarquee() (+5 more)

### Community 37 - "EntityId"
Cohesion: 0.07
Nodes (18): MERGE_RULES, SPLIT_RULES, FragmentField(), ShapeField(), getFragmentMesh(), FragmentStoreState, useFragmentStore, InteractionStoreState (+10 more)

### Community 38 - "cursor-aura.tsx"
Cohesion: 0.18
Nodes (9): CursorAura(), onMove(), tick(), CursorAuraProps, Ripple, SCROLL_SUSPEND_VELOCITY, useScrollVelocity(), useFinePointer() (+1 more)

### Community 40 - "Vec3"
Cohesion: 0.16
Nodes (13): IMPACT_RINGS, ImpactField(), ImpactRingMesh(), getImpactRingGeometry(), createImpactRingMaterial(), registerImpactRingMesh(), unregisterImpactRingMesh(), ImpactKind (+5 more)

### Community 42 - "site-settings-repository.ts"
Cohesion: 0.26
Nodes (10): DEFAULT_ABOUT, DEFAULT_ANIMATION_SETTINGS, DEFAULT_SITE_SETTINGS, AdminServices, getAdminDb(), getAdminServices(), readCredentials(), COLLECTIONS (+2 more)

### Community 43 - "project-actions.ts"
Cohesion: 0.17
Nodes (29): EditProjectPage(), metadata, actionSuccess, withAdmin(), deleteMessageAction(), revalidateInbox(), setMessageReadAction(), createProjectAction() (+21 more)

### Community 44 - "react"
Cohesion: 0.11
Nodes (26): react, metadata, ProjectsPage(), revalidate, PageHeader(), AnimatedText(), AnimatedTextProps, staticVariants (+18 more)

### Community 45 - "ActionResult"
Cohesion: 0.40
Nodes (5): DeleteButtonProps, ReorderControlsProps, ToggleActionButtonProps, ActionResult, ReorderInput

### Community 46 - "scene-scenery-store.ts"
Cohesion: 0.22
Nodes (9): SceneryController(), SceneryControllerProps, select(), SCENERY_IDS, isSceneryId(), readStoredScenery(), SceneSceneryState, useSceneSceneryStore (+1 more)

### Community 47 - "about-form.tsx"
Cohesion: 0.24
Nodes (9): AboutFormProps, FormActions(), FormActionsProps, FormSection(), FormSectionProps, AboutInput, aboutSchema, AboutStatInput (+1 more)

### Community 48 - "sitemap.ts"
Cohesion: 0.21
Nodes (9): next, metadata, robots(), generateMetadata(), revalidate, sitemap(), isDemoId(), absoluteUrl() (+1 more)

### Community 49 - "constellation.tsx"
Cohesion: 0.21
Nodes (14): useSceneInteractionStore, buildEdges(), Constellation(), createFrameState(), FrameState, scratchCameraLocal, scratchDesired, scratchEdgeColor (+6 more)

### Community 50 - "about-repository.ts"
Cohesion: 0.21
Nodes (12): DEMO_ABOUT_STATS, DEMO_EXPERIENCES, DEMO_ID_PREFIX, DEMO_PROJECTS, DEMO_SKILL_SEED, DEMO_SKILLS, isDemoContentEnabled(), readObjectArray() (+4 more)

### Community 51 - "[slug]/page.tsx"
Cohesion: 0.11
Nodes (27): nextConfig, buildChapters(), Chapter, dynamicParams, ProjectDetailPage(), revalidate, ProjectViewTracker(), LAYER_DEPTH (+19 more)

### Community 52 - "getSiteSettings"
Cohesion: 0.10
Nodes (22): next-themes, AdminSettingsPage(), ANIMATION_GROUPS, metadata, geistMono, geistSans, generateMetadata(), instrumentSerif (+14 more)

### Community 53 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, dotenv, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react (+3 more)

### Community 54 - "firebase-admin.mjs"
Cohesion: 0.25
Nodes (8): dotenv, fail(), initAdmin(), root, style, args, { auth, db, projectId }, revoke

### Community 55 - "lucide-react"
Cohesion: 0.10
Nodes (28): lucide-react, metadata, metadata, metadata, metadata, metadata, AdminPageHeader(), AdminPageHeaderProps (+20 more)

### Community 56 - "scene-palette.ts"
Cohesion: 0.29
Nodes (11): atLightness(), buildScenePalette(), FALLBACK_ACCENT, FALLBACK_BG, fromHsl(), luminance(), mix(), parseHex() (+3 more)

### Community 57 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, deploy-rules, dev, lint, seed, set-admin, start (+2 more)

### Community 58 - "settings-form.tsx"
Cohesion: 0.29
Nodes (8): VisitorSearchProps, FormRow(), AVAILABILITY_LABELS, SettingsFormProps, Input(), Select(), Textarea(), SiteSettingsInput

### Community 59 - "Game Layer - Interactive World Module"
Cohesion: 0.22
Nodes (9): D2 - One Canvas with Game Mode Arbitration, Game Layer - Interactive World Module, Rapier Physics Engine, Game Systems Architecture, Gamification - Hybrid Implementation, Act II - Immersive 3D World, Act III - Scenery System, Act I - 3D Experience Foundation (+1 more)

### Community 60 - "experience-form.tsx"
Cohesion: 0.13
Nodes (15): metadata, ExperienceFormProps, COMMIT_KEYS, StringListInput(), commit(), handleKeyDown(), StringListInputProps, Field() (+7 more)

### Community 61 - "projects-repository.ts"
Cohesion: 0.21
Nodes (17): NewProjectPage(), AdminProjectsPage(), HomePage(), revalidate, generateStaticParams(), readNestedObject(), readOptionalString(), getPublicExperiences (+9 more)

### Community 62 - "scene-root.tsx"
Cohesion: 0.18
Nodes (13): budgetFor(), classify(), DEFAULT_BUDGET, detectTier(), stillBudget(), getServerSnapshot(), getSnapshot(), subscribe() (+5 more)

### Community 63 - "About Fragments"
Cohesion: 0.33
Nodes (6): About Fragments, Contact - Calm, Experience Timeline, Hero Sculpture, Project Panels - Corridor, Skill Galaxy

### Community 64 - "D1 - 3D Interaction is DOM-Driven"
Cohesion: 0.33
Nodes (6): Drifting Objects with Grab, Skill Hover Reaction System, D1 - 3D Interaction is DOM-Driven, Scene Content Store - Data Bridge, Scene Palette - Color Derivation, useSceneProgress - Scroll Hook

### Community 65 - "Firebase - Authentication & Firestore"
Cohesion: 0.33
Nodes (6): CMS Admin Interface - CRUD, Firebase - Authentication & Firestore, Motion (Framer Motion), Next.js 16 App Router, React Server Components, Portfolio + CMS - Firebase Backend

### Community 66 - "toast.tsx"
Cohesion: 0.18
Nodes (8): RippleToggle(), RippleToggleProps, ACCENTS, ICONS, Toast, ToastContext, ToastContextValue, ToastVariant

### Community 68 - "Achievement System - Unlocks"
Cohesion: 0.40
Nodes (5): Achievement System - Unlocks, Career Level - Developer Real Data, Explorer Level - Visitor Progression, Game HUD - Level XP Bar, Game Mode Toggle

### Community 69 - "zustand"
Cohesion: 0.18
Nodes (5): zustand, CameraStoreState, useCameraStore, useWorldStore, WorldStoreState

### Community 72 - "Phases 13-20 - Transformation to Drifters"
Cohesion: 0.50
Nodes (4): Phases 1-12 - Foundation to Polish, Phase 21 - Creative Direction Review, Phases 13-20 - Transformation to Drifters, Phases A-L - Scenery Plumbing to Review

### Community 73 - "Scenery - Garden (Organic)"
Cohesion: 0.50
Nodes (4): Scenery - Atelier (Default), Scenery - Blueprint (Technical), Scenery - Garden (Organic), Scenery - Observatory (Night)

### Community 74 - "React Three Fiber"
Cohesion: 0.50
Nodes (4): Drei - R3F Helpers, React Three Fiber, Scene Root - Persistent Canvas, Three.js

### Community 75 - "Section-to-Section Transformation"
Cohesion: 0.67
Nodes (3): Experience Section - Architecture, Section-to-Section Transformation, Signature Moment - Projects→Experience

### Community 76 - "Performance Contract - 60fps Target"
Cohesion: 0.67
Nodes (3): Scroll Physics - SpringStep, Device Tier - Quality Budgeting, Performance Contract - 60fps Target

### Community 90 - "skill-form.tsx"
Cohesion: 0.38
Nodes (7): metadata, SkillFormProps, PROFICIENCY_LEVELS, SKILL_CATEGORIES, skillDefaults, SkillInput, skillSchema

### Community 91 - "content-actions.ts"
Cohesion: 0.42
Nodes (8): updateAboutAction(), updateSiteSettingsAction(), revalidateAbout(), revalidateHome(), revalidateSiteSettings(), validate(), updateAbout(), updateSiteSettings()

### Community 92 - "contact-form.tsx"
Cohesion: 0.40
Nodes (7): ContactForm(), Status, submitContactMessage(), createMessage(), contactDefaults, ContactInput, contactSchema

### Community 93 - "case-study-block.tsx"
Cohesion: 0.38
Nodes (5): CaseStudyBlock(), CaseStudyBlockProps, RichText(), RichTextProps, toBlocks()

### Community 94 - "use-scroll-direction.ts"
Cohesion: 0.33
Nodes (6): Options, ScrollDirection, ScrollState, useScrollDirection(), onScroll(), update()

### Community 95 - "about/page.tsx"
Cohesion: 0.67
Nodes (3): AdminAboutPage(), metadata, aboutToInput()

## Knowledge Gaps
- **360 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+355 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 492 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `game-provider.tsx`, `login-form.tsx`, `experience.tsx`, `game/types/game.ts`, `drifters.tsx`, `project-form.tsx`, `cn`, `SceneBudget`, `game-store.ts`, `render-registry.ts`, `content.ts`, `animation-toggles.tsx`, `gesture-controller.ts`, `corridor.tsx`, `skill-galaxy.tsx`, `depth-scale.tsx`, `scene-signature.ts`, `visitors-panel.tsx`, `spawn-system.ts`, `camera-rig.tsx`, `scene-canvas.tsx`, `use-scene-progress.ts`, `world-composition.tsx`, `experience-repository.ts`, `package.json`, `(site)/layout.tsx`, `tech-chain.tsx`, `cursor-aura.tsx`, `Vec3`, `site-settings-repository.ts`, `scene-scenery-store.ts`, `about-form.tsx`, `constellation.tsx`, `about-repository.ts`, `[slug]/page.tsx`, `getSiteSettings`, `lucide-react`, `settings-form.tsx`, `experience-form.tsx`, `projects-repository.ts`, `scene-root.tsx`, `toast.tsx`, `contact-form.tsx`, `case-study-block.tsx`, `use-scroll-direction.ts`?**
  _High betweenness centrality (0.443) - this node is a cross-community bridge._
- **Why does `three` connect `world-composition.tsx` to `package.json`, `systems/index.ts`, `game/types/game.ts`, `drifters.tsx`, `Vec3`, `SceneBudget`, `render-registry.ts`, `content.ts`, `gesture-controller.ts`, `corridor.tsx`, `constellation.tsx`, `spawn-system.ts`, `camera-rig.tsx`, `scene-canvas.tsx`, `config/game-config.ts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `package.json`, `login-form.tsx`, `experience.tsx`, `hero.tsx`, `tech-chain.tsx`, `toast.tsx`, `cn`, `react`, `about-form.tsx`, `contact-form.tsx`, `[slug]/page.tsx`, `skill-galaxy.tsx`, `visitors-panel.tsx`, `settings-form.tsx`, `experience-form.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useMotionPreference()` (e.g. with `getServerSnapshot()` and `getSnapshot()`) actually correct?**
  _`useMotionPreference()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _360 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `game-provider.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.056692242114237 - nodes in this community are weakly interconnected._
- **Should `login-form.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07402031930333818 - nodes in this community are weakly interconnected._