from django.db import migrations, models
import django.db.models.deletion
from django.utils.text import slugify


def populate_tag_slugs(apps, schema_editor):
    BlogTag = apps.get_model('blog', 'BlogTag')
    for tag in BlogTag.objects.all():
        base_slug = slugify(tag.title) or f'tag-{tag.pk}'
        slug = base_slug
        counter = 1
        while BlogTag.objects.filter(slug=slug).exclude(pk=tag.pk).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1
        tag.slug = slug
        tag.save(update_fields=['slug'])


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0007_blog_featured'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlogCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('slug', models.SlugField(blank=True, unique=True)),
                ('description', models.TextField(blank=True, default='')),
            ],
            options={
                'verbose_name_plural': 'Blog Categories',
                'ordering': ('name',),
            },
        ),
        migrations.AlterModelOptions(
            name='blogtag',
            options={'ordering': ('title',)},
        ),
        migrations.AddField(
            model_name='blog',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='blog',
            name='read_time',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='blog',
            name='status',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('pending', 'Pending Review'), ('published', 'Published')],
                default='draft',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='blog',
            name='view_count',
            field=models.PositiveIntegerField(default=0),
        ),
        # Step 1: Add slug as nullable and non-unique first
        migrations.AddField(
            model_name='blogtag',
            name='slug',
            field=models.SlugField(blank=True, null=True, db_index=False),
        ),
        migrations.AlterField(
            model_name='blog',
            name='cover',
            field=models.ImageField(default='blog_api/default.jpg', upload_to='blog_api/'),
        ),
        migrations.AlterField(
            model_name='blog',
            name='tags',
            field=models.ManyToManyField(blank=True, related_name='blogs', to='blog.blogtag'),
        ),
        migrations.AddField(
            model_name='blog',
            name='category',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='blogs',
                to='blog.blogcategory',
            ),
        ),
        migrations.CreateModel(
            name='BlogView',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip', models.CharField(max_length=50)),
                ('viewed_at', models.DateTimeField(auto_now_add=True)),
                ('blog', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='views',
                    to='blog.blog',
                )),
            ],
            options={
                'ordering': ('-viewed_at',),
            },
        ),
        # Step 2: Populate slugs for existing tags
        migrations.RunPython(populate_tag_slugs, reverse_code=migrations.RunPython.noop),
        # Step 3: Enforce uniqueness now that data is clean
        migrations.AlterField(
            model_name='blogtag',
            name='slug',
            field=models.SlugField(blank=True, unique=True),
        ),
    ]
