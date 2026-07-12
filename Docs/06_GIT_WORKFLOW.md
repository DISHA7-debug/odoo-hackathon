# AssetFlow — Git Workflow

## Branches
- `main` — always deployable/demo-able
- `backend-disha` — Disha's work
- `backend-arush` — Arush's work (rename from `ml` branch — see command below)
- `frontend-drishti` — Drishti's work

Rename the old `ml` branch:
```bash
git branch -m ml backend-arush
git push origin -u backend-arush
git push origin --delete ml
```

## Workflow during the hackathon
- Commit small and often on your own branch — every meaningful chunk (a
  working endpoint, a completed screen section), not one giant commit at the end.
- Open a PR into `main` every 3-4 hours (roughly aligned with roadmap
  checkpoints), not just once at the end. This is what "version control is a
  team sport" is actually checking for — commit history with contributions
  from all 3 people, spread across the day.
- Pull `main` into your branch after each merge to avoid large conflicts at hour 20.
- Write real commit messages: `feat: add asset allocation conflict check`, not `update`.

## Commit message convention (optional but looks clean)
```
feat: ...     new functionality
fix: ...      bug fix
refactor: ... code change with no behavior change
docs: ...     documentation
chore: ...    tooling/setup
```

## Before submission
- Confirm final code lives on `main`, single branch, as their doc requires.
- Confirm `.env` / secrets are NOT committed (check `.gitignore` covers them).
- Confirm README has setup instructions (DB creation, env vars, run commands)
  so reviewers can actually run it.
