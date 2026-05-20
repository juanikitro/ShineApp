## CI/CD safety checklist

- [ ] This PR targets `main` only when it is ready for the full production-demo gate.
- [ ] No secrets, tokens, database URLs, Supabase keys, SMTP passwords, or `.env` values were committed.
- [ ] If this PR changes Django models, matching migrations are included and `makemigrations --check --dry-run` should pass.
- [ ] Any schema or data migration is forward-compatible with the currently deployed code.
- [ ] Destructive migrations, large backfills, renames, and unsafe non-null additions have an explicit rollout plan.
- [ ] Any Vercel or Supabase environment variable change is documented in `docs/deployment/` and configured outside the repo.
- [ ] Local validation was run where practical: `scripts/validate.ps1` and, for broad changes, `scripts/test-coverage.ps1`.

## Notes

Link relevant docs, migration notes, or operational steps here.
