<!-- Brief, value-first PR description. Atomic commits with conventional
     prefixes (feat/fix/refactor/test/docs/chore). CI runs lint + Django
     check + tests on every push. -->

## What this changes

<!-- One or two sentences. Why does this PR exist? -->

## Why

<!-- The motivating issue, design pressure, or user-reported problem. -->

## How I tested

- [ ] `python manage.py test slideshows` passes
- [ ] `ruff check .` clean
- [ ] If touching templates: verified at 390x844 (mobile) AND 1280x800 (desktop)
- [ ] If touching API: verified the public OSS SDK still works against this branch end-to-end

## Migration risk (if touching models)

<!-- Note any new migration, data backfill required, or schema-breaking change. -->
