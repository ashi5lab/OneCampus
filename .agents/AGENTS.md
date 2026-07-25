# Agent Guidelines for OneCampus

## Mandatory Prerequisites
Before starting any new coding task, you MUST read and cross-reference the following files in the project root:
1. `OneCampus_PRD_v2.md`: Contains the source of truth for all product features, layouts, and system structure. Update this file whenever we make architectural or feature additions.
2. `Rules.md`: Contains the UI/UX rules, reusable components (like Topbar, DataTable, PageHeader), and layout guidelines for web vs mobile views.
3. `Future_Features.md`: Contains deferred features and enhancements. If you are asked to implement something that feels out of scope, check here first or add it to this file for later.
4. `AGENT_LOG.md`: The running history of all agent-made changes. Read the last entry to understand recent context before starting work.

## Agent Log Rule
After completing any significant change (bug fix, feature addition, DB migration, schema change, or refactor), you MUST append a new entry to `AGENT_LOG.md` in the project root. Follow the Logging Rules defined at the top of that file:
- Entries are numbered sequentially: Entry 001, Entry 002, Entry 003, ...
- Always append — never edit or remove past entries.
- Include the user's exact request, all files changed, any SQL/DB operations with their exact output, and the expected outcome.

Always adhere strictly to these guidelines to ensure consistency across the OneCampus application.
