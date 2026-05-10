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
