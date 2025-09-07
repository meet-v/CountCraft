# CountCraft — Obsidian Note Statistics, Saved as Properties

_**CountCraft is a Notes Analytics Sidekick for Obsidian. It adds important stats to your Obsidian notes as properties whenever you want to. Configure counters once, trigger on demand, and get precise metrics saved into note properties—ready for queries, dashboards, and workflows.**_

## Supported Counters

Following are the supported counters (as of now, planning to expand the support in the future):

1. Word count !!
2. Character count (with and without spaces) !!
3. Line count !!
4. Heading count (overall)
5. Heading count (by specific level, H1–H6)

!! Counters 1, 2, and 3 also support calculation based on rendered text instead of markdown source . So, characters like heading indicators, table header separators, etc. are not counted in our calculation.

## Key Features

- Configurable calculations with feature to add/edit and enable/disable each calculation.
- Configurable property mappings (auto-created as number type if missing).
- Duplicate check on property mapping.
- Calculation preview (without editing notes, without updating any property).
- Command palette integration and optional ribbon button.
- Cache-aware and fast on large vaults through Obsidian**’**s metadata cache.
- Debug support.
- Batch calculations across vault (experimental).

## Demo Use Cases

- **Writers and bloggers**: Track word targets, character limits, and structure (H1–H6) across drafts without leaving Obsidian. Great for SEO briefs, newsletters, and posts with length constraints.
- **Students and researchers**: Verify length requirements, outline depth, and section balance before submission. Headings by level help ensure argument structure.
- **Knowledge workers and teams**: Standardize note metadata (as properties) for dashboards, dataview queries, and progress tracking—with zero manual updates.
- **Content ops/PMs**: Batch-run metrics across folders to audit content libraries, find thin pages, or validate formatting conventions.
- **Enthusiast**: Someone who likes to see their stats in the notes properties, and would like to leverage note searching, sorting, filtering based on these statistics.

## Installation

### From Obsidian (when published)

_**NOTE: Currently not available on Community Plugins. WIP.**_

1. Open Obsidian → Settings → Community Plugins.
2. Browse/Search for “CountCraft”.
3. Install and enable.

### Manual Installation (GitHub Releases)

1. Download the latest release assets:
    - manifest.json
    - main.js
2. Create a folder in the vault:
    - Vault/.obsidian/plugins/count-craft
3. Copy the files into that folder.
4. Reload Obsidian and enable CountCraft in Community Plugins.

## Getting Started

1. Open Settings → Community Plugins → CountCraft.
2. Add a new calculation:
	- Select a counter type.
	- Set a property name (must be unique).
	- Enable the calculation.
3. Run the command:
	- Command Palette → “CountCraft: Calculate Statistics for Current Note”.
4. Check Properties panel—the counts are saved and ready for Dataview or other workflows.

## Plugin Overview

### Available Commands

- CountCraft: Calculate Statistics for Current Note
- CountCraft: Preview Statistics (No Property Updates)
- CountCraft: Calculate Statistics for All Files (Experimental)
- CountCraft: Open Settings

### Settings

- Ribbon icon: Show/hide quick-access button.
- Calculations:
	- Add new calculation: Choose type, property name, optional parameter (heading level), enable/disable.
	- Edit existing calculation in a modal.
	- Delete calculation.
- Duplicate property name prevention across all calculations.
- Auto-calculate on save (experimental): Re-calculates after file changes.
- Debug logging: Enables detailed logs in the console.

### Property Naming Rules

- Property names are preserved exactly as entered (only trimmed).
- No two calculations may share the same property name.
- Property type is set to Number (automatically created if it doesn’t exist).

### Accuracy Notes

- Counts exclude YAML frontmatter/properties to avoid inflated results.
- Headings are counted from the body only.
- Dataview/Reference tables are treated as lines; each row is a line for line count.

### Performance

- Uses Obsidian’s metadata cache where possible.
- Efficient reading (cachedRead) instead of raw file I/O when available.
- Batch mode shows progress notices on large vaults.

### Compatibility

Uses only the public Obsidian plugin API and browser-safe code.
Works on desktop and mobile.

## Project Details

### Structure

- manifest.json
- main.js
- package.json
- tsconfig.json
- esbuild.config.mjs
- versions.json
- src
	- main.ts
	- settings.ts
	- counter.ts
	- interfaces.ts
	- constants.ts
	- utils.ts

### Development

Prerequisites: Node 16+

1. npm install
2. npm run dev (watch mode)
3. In Obsidian, enable Safe Mode off, and load the plugin folder via your vault’s .obsidian/plugins
4. Reload Obsidian when needed.

Production build:

- npm run build (generates main.js at the repo root)

Releasing:

- Ensure manifest.json and versions.json are updated with the new version and minAppVersion.
- Attach main.js, manifest.json, and styles.css (if present) to the GitHub release.

## Support

If you find issues or have feature requests, open an issue in the repository.

### Troubleshooting

- Property name doesn’t apply
	- Property names are preserved. Ensure a unique name is entered.
	- If a default autofilled value appears, click the field and type a custom name (it won’t be overwritten after editing).
- Calculation are looking high
	- CountCraft excludes frontmatter automatically; if counts still look high, verify that body content includes long code blocks or embedded content.
	- Go through the known issues.
- Parameter control not clickable
	- The settings UI is fully scoped and rebuilt per change; if encountering issues, reload Obsidian and re-open the settings. Ensure the latest version is installed.
- Edit doesn’t change values
	- Edits are handled via a modal; make changes and Save. The settings tab refreshes automatically.

### Known Issues

1. The counter includes all the content in the markdown note to calculate words, characters, or lines. This includes the markdown syntax as the calculation is done based on markdown note, and note rendered note.

## Roadmap

- Include a feature to calculate the rendered content only.
- Custom counters.

## Contributing

Contributions and issues are welcome!

- Fork the repo
- Create a feature branch
- Commit changes with clear messages
- Open a PR describing the change and testing steps

Please include screenshots or short clips for UI-related changes.

## License

Apache License 2.0

Licensed under the Apache License, Version 2.0 (the “License”); may not use this file except in compliance with the License. Obtain a copy at:

http://www.apache.org/licenses/LICENSE-2.0

## NOTICE

CountCraft
Copyright (c) 2025 MEET VEKARIA

Required attribution:
- “CountCraft” by [MEET VEKARIA](https://github.com/meet-v/).
- Please retain this NOTICE file in redistributions, and display attribution in documentation or “About/credits” screens where third‑party notices normally appear.

Additional notices:
- Portions may include third‑party components; see their respective licenses in the distribution (if any).
- The contents of this NOTICE file are for informational purposes only and do not modify the License.

## CREDITS

Created by [**Meet Vekaria**](https://github.com/meet-v/).
