# Extends run_type with demo + qa, replacing the overloaded walkthrough
# default. walkthrough is preserved in the choices list as a deprecated
# legacy value so existing rows continue to validate -- mass-recategorizing
# them would silently overwrite operator-curated values, and the renderer
# already maps walkthrough -> demo voice for narration purposes.
#
# Why the split: walkthrough was doing three different jobs (showcase,
# QA, onboarding) with three different caption voices. The skill's Step 4
# had separate sub-styles for each, which means the type-level signal
# was ambiguous and the renderer couldn't pick a TTS voice from run_type
# alone. Splitting to demo (showcase voice) and qa (checklist voice)
# gives each type one voice and lets the renderer map cleanly.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('slideshows', '0011_slideshow_runtype_consolidate'),
    ]

    operations = [
        migrations.AlterField(
            model_name='slideshow',
            name='run_type',
            field=models.CharField(
                choices=[
                    ('demo', 'Demo'),
                    ('qa', 'QA'),
                    ('guide', 'Guide'),
                    ('bug', 'Bug'),
                    ('walkthrough', 'Walkthrough (legacy)'),
                ],
                default='demo',
                help_text=(
                    'What kind of clip this is — demo (showcase/feature '
                    'reveal), qa (smoke/regression/verification), guide '
                    '(how-to/investigation), or bug (repro/evidence). '
                    'Drives the narration voice + pacing; the agent skill '
                    'picks one heuristically from the trigger phrase. '
                    'walkthrough is a deprecated legacy value retained '
                    'for existing rows.'
                ),
                max_length=24,
            ),
        ),
    ]
