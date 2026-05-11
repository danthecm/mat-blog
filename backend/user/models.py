from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('contributor', 'Contributor'),
        ('editor', 'Editor'),
        ('admin', 'Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='contributor')
    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    website = models.URLField(blank=True, default='')
    is_approved = models.BooleanField(default=True)  # editors can approve/suspend contributors

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    class Meta:
        ordering = ('user__username',)

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import Group

@receiver(post_save, sender=UserProfile)
def sync_user_group(sender, instance, **kwargs):
    """Ensure user group membership stays in sync with profile.role."""
    if instance.role:
        group, _ = Group.objects.get_or_create(name=instance.role)
        # Remove old role groups and add the current one
        role_groups = Group.objects.filter(name__in=['contributor', 'editor', 'admin'])
        instance.user.groups.remove(*role_groups)
        instance.user.groups.add(group)

