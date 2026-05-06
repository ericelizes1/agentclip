'''Add edit_token + created_by_token_hash for the edit-URL flow.

Adding a unique field with a callable default is a 3-step dance:
existing rows would otherwise share a single computed default value
and violate the unique constraint at index-build time.

1. Add `edit_token` as nullable (no unique constraint yet)
2. Run Python to populate every existing row with its own random
   token via `secrets.token_urlsafe(32)`
3. Alter the column to NOT NULL + UNIQUE

Fresh databases skip step 2 (no rows to populate). Production DBs
with seeded gallery rows get fresh edit_tokens generated per-row.

The companion `created_by_token_hash` field is straightforward —
it's allowed blank, so existing rows just inherit `''` and lose the
ability to recover their edit URL via the recovery endpoint. Those
rows must be re-seeded or the operator can flip them via Django
admin's hash-utility (TODO if it ever matters; legacy rows are seed
data only).
'''

import secrets

import slideshows.models
from django.db import migrations, models


def _populate_edit_tokens(apps, schema_editor):
    Slideshow = apps.get_model('slideshows', 'Slideshow')
    # Iterate over the historical model so this works even if the
    # current model gains/loses fields after this migration ships.
    for row in Slideshow.objects.all():
        row.edit_token = secrets.token_urlsafe(32)
        row.save(update_fields=['edit_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('slideshows', '0002_gallery_flag'),
    ]

    operations = [
        # Step 1a: created_by_token_hash is allowed blank, no special handling.
        migrations.AddField(
            model_name='slideshow',
            name='created_by_token_hash',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                editable=False,
                help_text=(
                    'SHA-256 of the write_token that created this row. '
                    'Used as the ownership check for edit-token recovery + '
                    'rotation. Blank on legacy rows created before the field '
                    'existed; those rows can never recover a lost edit URL via '
                    'the API.'
                ),
                max_length=64,
            ),
        ),
        # Step 1b: add edit_token nullable, no unique constraint yet.
        migrations.AddField(
            model_name='slideshow',
            name='edit_token',
            field=models.CharField(
                editable=False,
                help_text=(
                    'Per-slideshow secret used in the public edit URL '
                    '(/s/<share_token>/edit?t=<edit_token>).'
                ),
                max_length=64,
                null=True,
            ),
        ),
        # Step 2: populate existing rows with unique tokens.
        migrations.RunPython(_populate_edit_tokens, reverse_code=migrations.RunPython.noop),
        # Step 3: enforce NOT NULL + UNIQUE + the real default for new rows.
        migrations.AlterField(
            model_name='slideshow',
            name='edit_token',
            field=models.CharField(
                default=slideshows.models._edit_token,
                editable=False,
                help_text=(
                    'Per-slideshow secret used in the public edit URL '
                    '(/s/<share_token>/edit?t=<edit_token>). Distinct from '
                    'write_token; rotatable; recoverable by the creator via '
                    'the edit-token recovery endpoint.'
                ),
                max_length=64,
                unique=True,
            ),
        ),
    ]
