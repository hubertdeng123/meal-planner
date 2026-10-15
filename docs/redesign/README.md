# Hungry Helper overhaul — shared working agreement

Two contributors work in parallel in the same checkout:

- **Staff Engineer** — owns `backend/**`, `frontend/src/services/**`, `frontend/src/types/**`,
  `frontend/src/hooks/useRecipeStream.ts` (new), and `docs/api-reference.md`.
- **Staff Designer** — owns everything else under `frontend/src/**` (pages, components, styles,
  contexts other than auth), `frontend/tailwind.config.js`, `frontend/index.html`, and
  `docs/frontend-guide.md`.

Neither contributor runs mutating git commands (`commit`, `checkout`, `stash`, `reset`, `add`).
The lead integrates and commits. Read-only git (`status`, `diff`, `log`) is fine.

Coordinate through `docs/redesign/HANDOFF.md` (append-only, newest at the bottom, prefix each
note with `[engineer]` or `[designer]`). If you need something from the other side, write it
there and work around it until it lands; never edit files the other person owns.

## Design system already in place (designer extends it)

A first pass landed in commit `02ae641`:

- Tokens in `frontend/src/index.css`: basil-green primary (`--primary-rgb: 31 111 74`), tomato
  accent (`--accent-rgb: 226 87 47`), paper background `#f6f5f1`, Inter for UI, Fraunces for
  display. Tailwind supports `bg-primary/10` style opacity on `primary` and `accent`.
- Component classes: `btn-primary|secondary|danger|ghost|accent`, `btn-sm|lg`, `card`,
  `card-hover`, `surface`, `surface-muted`, `input`, `label`, `helper-text`, `chip`,
  `chip-active`, `tag`, `tag-primary`, `tag-accent`, `badge`, `eyebrow`, `segmented`,
  `segmented-item(-active)`, `icon-tile(-sm|-lg|-accent|-amber|-stone)`, `nav-item(-active)`,
  `progress-track`, `progress-bar`, `skeleton`, `stagger`.
- Shell: `components/Layout.tsx` (sidebar on desktop, top bar + drawer on mobile),
  `components/AuthLayout.tsx` (split-screen auth).
- Primitives in `components/ui/`: `PageHeader`, `SectionCard`, `EmptyState`, `StatPill`,
  `InlineStatus`, `ModalShell` (portal, bottom sheet on mobile), `ConfirmDialog`,
  `ToastContainer`, `ToolbarRow`, `Pagination`, `PageLoader`/`Spinner`, `Toggle`,
  `SearchInput`, `RecipeCover` (deterministic color + monogram, since recipes have no photos).
  `AppIcons.tsx` maps every icon export to Heroicons outline; `BrandIcons.tsx` is now unused.
- Login and Register are done. Everything else still uses the old markup.

## Recipe generation streaming contract (v2)

Endpoint: `POST /api/v1/recipes/generate/stream` (same path, same request body
`RecipeGenerationRequest`). Response is `text/event-stream`. Every frame uses a named event and
a JSON payload:

```
event: <type>
data: <json>

```

| event       | payload                                                                 | notes |
|-------------|-------------------------------------------------------------------------|-------|
| `stage`     | `{ "stage": "context" \| "thinking" \| "drafting" \| "saving", "message": str }` | Emitted when the pipeline moves to a new stage. Always starts with `context`. |
| `thinking`  | `{ "delta": str }`                                                      | Model reasoning text, streamed as it arrives (native `ThinkingPart` deltas). Zero or more. |
| `draft`     | `{ "recipe": RecipeDraft }`                                             | Partial structured output snapshot. Each frame is the full current snapshot, not a diff. Throttled server-side to at most ~10/s. |
| `complete`  | `{ "recipe": Recipe }`                                                  | Final saved recipe, same shape as `GET /recipes/{id}` (includes `id`). |
| `error`     | `{ "message": str, "retryable": bool }`                                 | Terminal. |
| `ping`      | `{}`                                                                    | Keep-alive every ~15s while idle. Clients ignore it. |

`RecipeDraft` is `RecipeLLM` with every field optional (`name`, `description`, `cuisine`,
`ingredients[]`, `instructions[]`, `prep_time_minutes`, `cook_time_minutes`, `servings`, `tags[]`,
`nutrition{}`, `source_urls[]`). Lists grow over time; the last list element may be incomplete.

Frontend consumption goes through a single hook owned by the engineer:

```ts
// frontend/src/hooks/useRecipeStream.ts
type StreamStage = 'idle' | 'context' | 'thinking' | 'drafting' | 'saving' | 'complete' | 'error';

interface RecipeStreamState {
  stage: StreamStage;
  thinking: string;            // accumulated reasoning text
  draft: RecipeDraft | null;   // latest partial recipe
  recipe: Recipe | null;       // final saved recipe
  error: { message: string; retryable: boolean } | null;
  elapsedMs: number;
}

function useRecipeStream(): RecipeStreamState & {
  start: (request: RecipeGenerationRequest) => void;
  cancel: () => void;
  reset: () => void;
};
```

`RecipeDraft` and the stream types are exported from `frontend/src/types/index.ts`.
The hook handles abort on unmount, the 90s timeout, and auth headers.

The designer builds the UI against this interface immediately. Until the hook exists, import it
anyway and let typecheck fail on that one import; do not write a parallel implementation.

## Local LLM without API keys

The engineer adds `LLM_PROVIDER=demo`: a PydanticAI `FunctionModel` that streams realistic
thinking text and a structured recipe with small delays (~6-10s end to end), with no network
calls. When no real key is configured, `auto` resolves to `demo` in development
(`ENVIRONMENT != production`). This is what both sides use for manual testing; the dev servers
run at API `http://localhost:8000` and UI `http://localhost:5173` (tmux sessions `backend`
and `frontend`).
