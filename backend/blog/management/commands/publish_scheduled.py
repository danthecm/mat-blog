"""
Management command: publish_scheduled

Publishes blog posts whose `published_at` time has passed
but whose `status` is still 'pending' or 'draft'.

Usage (run as a cron job every minute or via CI):
    python manage.py publish_scheduled
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from blog.models import Blog


class Command(BaseCommand):
    help = 'Publish scheduled blog posts whose published_at time has passed.'

    def handle(self, *args, **options):
        now = timezone.now()
        due = Blog.objects.filter(
            published_at__lte=now,
            status__in=('draft', 'pending')
        )
        count = due.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No scheduled posts due.'))
            return

        for blog in due:
            blog.status = 'published'
            blog.save(update_fields=['status'])
            self.stdout.write(self.style.SUCCESS(f'  Published: "{blog.title}"'))

        self.stdout.write(self.style.SUCCESS(f'\nTotal published: {count}'))
