from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from .models import Blog

@receiver(pre_save, sender=Blog)
def delete_old_cover_on_change(sender, instance, **kwargs):
    """
    Deletes old cover file from Cloudinary when a new one is uploaded.
    """
    if not instance.pk:
        return False

    try:
        old_cover = Blog.objects.get(pk=instance.pk).cover
    except Blog.DoesNotExist:
        return False

    new_cover = instance.cover
    if not old_cover == new_cover:
        # Avoid deleting the default image if you have one
        if old_cover and old_cover.name != 'blog_api/default.jpg':
            old_cover.delete(save=False)

@receiver(post_delete, sender=Blog)
def delete_cover_on_delete(sender, instance, **kwargs):
    """
    Deletes cover file from Cloudinary when Blog is hard-deleted.
    """
    if instance.cover and instance.cover.name != 'blog_api/default.jpg':
        instance.cover.delete(save=False)
