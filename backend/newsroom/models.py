from django.db import models
from django.contrib.auth.models import User
from blog.models import Blog, DateAbstract


class SubmissionNotification(DateAbstract):
    blog = models.ForeignKey(Blog, related_name='notifications', on_delete=models.CASCADE)
    submitted_by = models.ForeignKey(User, related_name='submissions', on_delete=models.CASCADE)
    message = models.TextField(default='')
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f'Submission: "{self.blog.title}" by {self.submitted_by.username}'


class EditorialNote(models.Model):
    """Notes/feedback from editors on a submission (rejection reason, revision requests)."""
    notification = models.ForeignKey(SubmissionNotification, related_name='notes', on_delete=models.CASCADE)
    editor = models.ForeignKey(User, on_delete=models.CASCADE)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at',)

    def __str__(self):
        return f'Note from {self.editor.username} on "{self.notification.blog.title}"'
