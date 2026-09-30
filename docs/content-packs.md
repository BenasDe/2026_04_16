# Content packs: schema version 1

`src/content-pack.js` is the executable contract. Browser startup and the Node
development command use the same validator. Level files contain data registered
with `window.GameContent.registerLevel(...)`; they require no build step or package
installation. These are trusted project scripts, not a sandbox for uploaded code.

## Manifest and loading

`src/data.js` defines `GAME_CONTENT_PACK` and publishes `GAME_LEVELS` only after
successful validation. `main.js` takes its board size from the pack and refuses
to start without validated levels.

| Pack field | Required value |
| --- | --- |
| `schemaVersion` | Integer `1` |
| `id` | Stable lowercase snake_case string, currently `data_lake` |
| `defaultLanguage` | `en`; base fields hold English text |
| `languages` | Both `en` and `lt`, each once; these are the supported UI languages |
| `gridSize` | Integer at least 2; the board is square |
| `levels` | Non-empty ordered array of registered level objects |

The list in `src/data.js` is the campaign order:

```js
levels: ['bronze', 'silver', 'gold'].map(id => window.GameContent.getLevel(id))
```

In `index.html`, load `src/content-pack.js`, then every selected level file,
then `src/data.js`, before localization and gameplay scripts. A missing selected
level or duplicate registration fails startup instead of silently dropping a level.
Other registered levels can be kept outside the active campaign by leaving their
IDs out of the manifest.

## Required content fields

| Record | Required fields |
| --- | --- |
| Level | `id`, `name`, `engine`, `description`, `fuelToPlace`, `tasks`, `translations` |
| Task | `id`, `name`, `desc`, `tableHeaders`, `tableRows`, `glitchIndices`, `skills`, `translations` |
| Answer (`skills` entry) | `id`, `code`, `label`, `correct`, `explain` |
| Level `translations.lt` | `name`, `description` |
| Task `translations.lt` | `name`, `desc`, `skills` |
| Translated answer | `label`, `explain` |

IDs must match `^[a-z][a-z0-9_]*$` and cannot be reserved object-property names
such as `constructor`. Level IDs, task IDs and answer IDs are each unique across
the whole active pack, including across levels. Use descriptive IDs, not choice
positions. Keep an ID when editing its text, code or position. When replacing an
answer with a different concept, assign a new ID and update its translation key.

All text fields in the table are non-empty strings. `correct` is a boolean,
and each task must have at least two answers and exactly one `correct: true`.
Translations can change labels and explanations only; they cannot override
IDs, executable-looking code text or correctness. Code is displayed, not executed.

`translations.lt.skills` is an object keyed by each answer's exact ID. Every
answer needs a translated label and explanation. Missing keys, extra/stale keys,
old positional translation arrays and unknown fields are rejected. English is
validated through the base fields, so there is no separate `translations.en`.
Adding another UI language requires extending the UI dictionaries and the
validator's supported-language contract together.

Preview data is shared between languages: `tableHeaders` is a non-empty array of
non-empty strings; `tableRows` is a non-empty array of equal-width rows matching
those headers. Cells can be strings, finite numbers, booleans or `null`.
`glitchIndices` contains unique integer row indexes in bounds, or is empty when
no highlighting is needed.

Each level has at least one task. `fuelToPlace` is an integer at least zero, and:

```text
fuelToPlace + tasks.length <= gridSize * gridSize - 1
```

The extra cell is reserved for the player's starting position. On a 5×5 board,
24 cells are available for tasks and fuel; overflowing content is rejected
instead of being truncated during board placement.

## Add a level

Create `src/content/example.js` with a complete definition like this:

```js
window.GameContent.registerLevel({
  id: 'example',
  name: 'Example level',
  engine: 'PySpark',
  description: 'Practice deduplicating transaction IDs.',
  fuelToPlace: 2,
  translations: {
    lt: {name: 'Pavyzdinis lygis', description: 'Pašalinkite pasikartojančius transakcijų ID.'}
  },
  tasks: [{
    id: 'example_duplicates',
    name: 'DUPLICATES',
    desc: 'Keep one row for each transaction ID.',
    tableHeaders: ['transaction_id'],
    tableRows: [['T1'], ['T1']],
    glitchIndices: [1],
    skills: [
      {
        id: 'example_deduplicate_transactions',
        code: "df.dropDuplicates(['transaction_id'])",
        label: 'Deduplicate by transaction ID',
        correct: true,
        explain: 'Keeps one row for each transaction ID.'
      },
      {
        id: 'example_select_transaction_id',
        code: "df.select('transaction_id')",
        label: 'Select the transaction ID column',
        correct: false,
        explain: 'Selecting a column keeps duplicate rows.'
      }
    ],
    translations: {
      lt: {
        name: 'DUBLIKATAI',
        desc: 'Palikite po vieną eilutę kiekvienam transakcijos ID.',
        skills: {
          example_deduplicate_transactions: {
            label: 'Pašalinti dublikatus pagal transakcijos ID',
            explain: 'Palieka po vieną eilutę kiekvienam transakcijos ID.'
          },
          example_select_transaction_id: {
            label: 'Pasirinkti transakcijos ID stulpelį',
            explain: 'Stulpelio pasirinkimas nepašalina pasikartojančių eilučių.'
          }
        }
      }
    }
  }]
});
```

Add `<script src="src/content/example.js"></script>` before `src/data.js` in
`index.html`, and append `'example'` to the level-ID list in `src/data.js`.
The engine, answer staging and pipeline progression consume the resulting array.
Menus and victory messages use the active campaign's level count and names.

Run from the repository root with Node.js 20 or later:

```bash
node scripts/validate-content.cjs
node --test tests/content.test.cjs tests/fuel.test.cjs tests/controls.test.cjs
```

The validator reports field paths and exits with a nonzero status on failure.
It validates the active HTML-registered pack, not unused files elsewhere on disk.
The content tests reorder answers and translations, exercise invalid packs and
complete four/five-level fixture campaigns. The fixtures are test data, not new
published lessons.

Validation checks structure, translation coverage and board constraints. Authors
still review SQL/PySpark correctness, translation meaning and lesson difficulty.
The current leaderboard is shared: `pack.id` does not namespace scores. Separate
campaign leaderboards should be introduced before comparing runs from campaigns
with different lengths or difficulty.
