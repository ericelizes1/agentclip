# Collapses the original 6-type run_type taxonomy down to 3 (walkthrough,
# guide, bug). The original split (smoke_test / onboarding_eval /
# competitive_teardown / generic) was QA-tool baggage from before the
# product wedge crystallized — every real use case maps cleanly into one
# of the three retained types. See SKILL.md for the new vocabulary.

from django.db import migrations, models


# old value -> new value. Conservative defaults: smoke_test maps to bug
# because "did it work or where did it break" is bug-shaped narration;
# the rest map to walkthrough because "show me the thing" is the safe
# default for legacy generic / onboarding / competitive clips.
RUN_TYPE_REMAP = {
    'demo': 'walkthrough',
    'bug_repro': 'bug',
    'smoke_test': 'bug',
    'onboarding_eval': 'walkthrough',
    'competitive_teardown': 'walkthrough',
    'generic': 'walkthrough',
}


def remap_forward(apps, schema_editor):
    Slideshow = apps.get_model('slideshows', 'Slideshow')
    for old, new in RUN_TYPE_REMAP.items():
        Slideshow.objects.filter(run_type=old).update(run_type=new)


def remap_backward(apps, schema_editor):
    # Reverse mapping is lossy — walkthrough could have been demo,
    # onboarding_eval, competitive_teardown, or generic; bug could have
    # been bug_repro or smoke_test. Pick the most common original so a
    # rollback at least leaves the system in a runnable state.
    Slideshow = apps.get_model('slideshows', 'Slideshow')
    Slideshow.objects.filter(run_type='walkthrough').update(run_type='demo')
    Slideshow.objects.filter(run_type='guide').update(run_type='generic')
    Slideshow.objects.filter(run_type='bug').update(run_type='bug_repro')


class Migration(migrations.Migration):

    dependencies = [
        ('slideshows', '0010_slideshow_runtype_introoutro'),
    ]

    operations = [
        # Step 1: re-map data while the field still allows old values.
        migrations.RunPython(remap_forward, remap_backward),
        # Step 2: tighten the field's choices to the new 3-value set.
        migrations.AlterField(
            model_name='slideshow',
            name='run_type',
            field=models.CharField(
                choices=[
                    ('walkthrough', 'Walkthrough'),
                    ('guide', 'Guide'),
                    ('bug', 'Bug'),
                ],
                default='walkthrough',
                help_text=(
                    'What kind of clip this is — walkthrough (feature '
                    'reveal), guide (how-to), or bug (repro/evidence). '
                    'Drives the narration voice + pacing; the agent '
                    'skill picks one heuristically from the trigger '
                    'phrase.'
                ),
                max_length=24,
            ),
        ),
    ]
