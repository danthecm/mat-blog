import hashlib
from django.db import models
from django.contrib.auth.models import User
from blog.models import Blog, DateAbstract


# ─── Threaded Comments ───────────────────────────────────────────────────────

class Comment(DateAbstract):
    blog = models.ForeignKey(Blog, related_name='engagement_comments', on_delete=models.CASCADE)
    parent = models.ForeignKey(
        'self', null=True, blank=True, related_name='replies', on_delete=models.CASCADE
    )
    # Linked account (optional — anonymous comments allowed too)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='comments')
    author_name = models.CharField(max_length=200, default='Anonymous')
    content = models.TextField()
    ip = models.CharField(max_length=50, blank=True, default='')
    like_count = models.PositiveIntegerField(default=0)
    is_approved = models.BooleanField(default=True)  # editors can hide comments

    class Meta:
        ordering = ('created_at',)

    def __str__(self):
        return f'Comment by {self.author_name} on "{self.blog.title}"'


class CommentLike(models.Model):
    comment = models.ForeignKey(Comment, related_name='likes', on_delete=models.CASCADE)
    ip = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('comment', 'ip')

    def __str__(self):
        return f'Like on comment {self.comment_id} from {self.ip}'


# ─── Newsletter ───────────────────────────────────────────────────────────────

class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)

    def unsubscribe_token(self, secret):
        """Generate a deterministic HMAC token for unsubscribe links."""
        import hmac
        token = hmac.new(
            secret.encode(),
            self.email.encode(),
            hashlib.sha256
        ).hexdigest()
        return token

    def __str__(self):
        status = 'active' if self.is_active else 'unsubscribed'
        return f'{self.email} ({status})'

    class Meta:
        ordering = ('-subscribed_at',)


# ─── Polls ────────────────────────────────────────────────────────────────────

class Poll(DateAbstract):
    question = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.question

    class Meta:
        ordering = ('-created_at',)


class PollOption(models.Model):
    poll = models.ForeignKey(Poll, related_name='options', on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    vote_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f'{self.poll.question} — {self.text}'

    class Meta:
        ordering = ('id',)


class PollVote(models.Model):
    poll = models.ForeignKey(Poll, related_name='votes', on_delete=models.CASCADE)
    option = models.ForeignKey(PollOption, related_name='votes', on_delete=models.CASCADE)
    ip = models.CharField(max_length=50)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('poll', 'ip')  # one vote per poll per IP

    def __str__(self):
        return f'Vote for "{self.option.text}" from {self.ip}'

