'''Add the DB-driven gallery curation flag.

Replaces the old `_GALLERY_TOKENS` code constant in views.py — that
mechanism baked specific share_tokens into source, which broke OSS
portability (the tokens only existed in one DB). Now gallery
membership is a per-row flag the operator manages via Django admin.

`is_gallery=True` puts a slideshow in the home-page gallery.
`gallery_position` controls sort order; ties broken by `-created_at`.

Defaults are `False` / `0`, so existing rows on production deploys
remain invisible until explicitly curated. The `seed_gallery`
management command sets both fields directly on the rows it creates.
'''

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('slideshows', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='slideshow',
            name='gallery_position',
            field=models.PositiveSmallIntegerField(
                db_index=True,
                default=0,
                help_text=(
                    'Sort order within the gallery (ascending). '
                    'Ties broken by -created_at.'
                ),
            ),
        ),
        migrations.AddField(
            model_name='slideshow',
            name='is_gallery',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text=(
                    'Show on the home-page gallery. Curated via the admin; '
                    'not user-controlled.'
                ),
            ),
        ),
    ]
