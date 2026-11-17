# Project: Facescan Facial Harmony & Aesthetic Procedures

## Architecture
- Core Backend:
  - `facescan/core/harmony.py`: Harmony score (0-100) and subscores (vertical thirds, transverse fifths, lip harmony, symmetry) using Gaussian distance decay from canon targets.
  - `facescan/core/procedure_recommender.py`: Recommends Chin Augmentation, Lip Augmentation, and Rhinoplasty with intensities [0.0, 1.0] and clinical rationales from F1-F11 and P1-P5 deviations.
  - `facescan/core/assemble.py`: Attach harmony and procedure recommendations to `FrontalResult` and `Report`.
  - `facescan/core/schema.py`: Pydantic models `HarmonyScore`, `HarmonySubscores`, `ProcedureRecommendation` on `_ResultBase` and `Report`.
  - `facescan/core/locale.py` & `facescan/locales/`: Serializes new fields in `_result_view` and `_report_view`, keeping neutral non-promotional terms compliant with `test_schema_views.py`.
- Frontend Web App:
  - `web/src/api/schemas.ts`: Zod validation schemas for `HarmonyScore` and `ProcedureRecommendation` matching backend schema.
  - `web/src/components/results/HarmonyCard.tsx`: Display overall harmony score (0-100%) and 4 subscores.
  - `web/src/components/results/ProcedureRecommendationCard.tsx`: Display recommended aesthetic procedures with intensities and rationales, plus action button to open simulation drawer.
  - `web/src/screens/scan/ResultScreen.tsx`: Mount cards in right column (`lg:col-span-7`) directly below `DemographicsCard` when `view === "frontal"`.
  - `web/src/extensions/SimulationDrawer.tsx`: Preset sliders with recommended procedure intensities when "Apply AI Golden Ratio" is clicked and trigger `/v1/simulation/warp`.
- Test Suite:
  - `tests/test_harmony_procedures.py`: Unit tests for harmony calculations, subscores, procedure recommendations, intensity bounds, and rationales.
  - Verify all 152 existing pytest tests pass.
  - Verify frontend typecheck (`pnpm run typecheck`) and build (`pnpm run build`) pass cleanly.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Harmony Subscores Calculation | Calculate 4 subscores (vertical thirds, transverse fifths, lip harmony, symmetry) using Gaussian distance decay from canon targets | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Overall Harmony Score Calculation | Weighted combination scaled 0-100% of the 4 subscores | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Core Harmony Schema & Pipeline Integration | Pydantic models in `schema.py`, pipeline assembly in `assemble.py`, serialization in `locale.py` | M1 | ORIGINAL_REQUEST §R1, R3 |
| 4 | Procedure Recommendation Engine | Clinical recommendations for Chin Augmentation, Lip Augmentation, Rhinoplasty based on F1-F11 and P1-P5 deviations | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Procedure Intensity & Rationales | Bounded intensity in [0.0, 1.0] and clinical rationales for each procedure | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Procedure Schema & Serialization | Pydantic models and localization integration for recommendations | M2 | ORIGINAL_REQUEST §R2, R3 |
| 7 | SimulationDrawer AI Golden Ratio preset | "Apply AI Golden Ratio" button presetting sliders and triggering `/v1/simulation/warp` | M3 | ORIGINAL_REQUEST §R3 |
| 8 | HarmonyCard & ProcedureRecommendationCard UI | Result cards on ResultScreen displaying harmony and recommendations | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Frontend TypeScript Schemas | Type-safe Zod schemas in `web/src/api/schemas.ts` matching backend | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Harmony & Procedure Unit Tests | Comprehensive tests in `tests/test_harmony_procedures.py` | M4 | ORIGINAL_REQUEST §R4 |
| 11 | Backend Regression Verification | Ensure all 152 existing backend tests pass | M4 | ORIGINAL_REQUEST §R4 |
| 12 | Frontend Verification | Ensure TypeScript check and production build pass with 0 errors | M4 | ORIGINAL_REQUEST §R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Schemas & Facial Harmony Scoring | `facescan/core/harmony.py`, `facescan/core/schema.py`, `facescan/core/assemble.py`, `facescan/core/locale.py` | none | DONE |
| M2 | Aesthetic Procedure Recommendation Engine | `facescan/core/procedure_recommender.py`, `facescan/core/assemble.py`, `facescan/core/locale.py`, `facescan/locales/` | M1 | DONE |
| M3 | Frontend Simulation & Result UI Cards | `web/src/api/schemas.ts`, `web/src/extensions/SimulationDrawer.tsx`, `web/src/components/results/HarmonyCard.tsx`, `web/src/components/results/ProcedureRecommendationCard.tsx`, `web/src/screens/scan/ResultScreen.tsx` | M1, M2 | DONE |
| M4 | Test Suite & Full Verification | `tests/test_harmony_procedures.py`, verify 152 pytest tests, frontend typecheck & build | M1, M2, M3 | DONE |

## Interface Contracts
### Harmony Engine ↔ Result Schema
- `calculate_harmony_score(metrics: Mapping[str, Metric]) -> HarmonyScore`
- `HarmonyScore` fields:
  - `overall: float` (0.0 to 100.0)
  - `subscores: HarmonySubscores`
    - `vertical_thirds: float` (0.0 to 100.0)
    - `transverse_fifths: float` (0.0 to 100.0)
    - `lip_harmony: float` (0.0 to 100.0)
    - `symmetry: float` (0.0 to 100.0)

### Procedure Recommender ↔ Result Schema
- `recommend_procedures(frontal: FrontalResult, profile: ProfileResult | None = None) -> list[ProcedureRecommendation]`
- `ProcedureRecommendation` fields:
  - `procedure: str` ("chin_augmentation" | "lip_augmentation" | "rhinoplasty")
  - `intensity: float` (0.0 to 1.0)
  - `rationale: str`
  - `triggering_metrics: list[str]`

### Frontend UI ↔ Simulation Warp Endpoint
- "Apply AI Golden Ratio" preset button in `SimulationDrawer.tsx`
  - Takes `recommendedProcedures: ProcedureRecommendation[] | undefined`
  - Sets `rhinoplasty`, `lip_augmentation`, `chin_augmentation` sliders (0-100)
  - Calls `POST /v1/simulation/warp` with FormData `(param / 100).toString()`

## Code Layout
- Backend:
  - `facescan/core/harmony.py` (new)
  - `facescan/core/procedure_recommender.py` (new)
  - `facescan/core/schema.py`
  - `facescan/core/assemble.py`
  - `facescan/core/locale.py`
  - `facescan/locales/locale_en.yaml`
  - `facescan/locales/locale_th.yaml`
- Frontend:
  - `web/src/api/schemas.ts`
  - `web/src/components/results/HarmonyCard.tsx` (new)
  - `web/src/components/results/ProcedureRecommendationCard.tsx` (new)
  - `web/src/extensions/SimulationDrawer.tsx`
  - `web/src/screens/scan/ResultScreen.tsx`
- Tests:
  - `tests/test_harmony_procedures.py` (new)
