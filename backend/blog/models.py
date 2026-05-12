from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.utils import timezone
from tinymce.models import HTMLField
import re


# ─── Abstracts ───────────────────────────────────────────────────────────────

class DateAbstract(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ─── Category ────────────────────────────────────────────────────────────────

class BlogCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True, default='')

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Blog Categories'
        ordering = ('name',)


# ─── Tag ─────────────────────────────────────────────────────────────────────

class BlogTag(models.Model):
    title = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ('title',)


# ─── Blog ─────────────────────────────────────────────────────────────────────

class BlogStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PENDING = 'pending', 'Pending Review'
    PUBLISHED = 'published', 'Published'


class Blog(DateAbstract):
    STATUS_CHOICES = BlogStatus.choices

    tags = models.ManyToManyField(BlogTag, related_name='blogs', blank=True)
    category = models.ForeignKey(
        BlogCategory, related_name='blogs', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    title = models.CharField(max_length=225, unique=True)
    author = models.ForeignKey(
        User, related_name='created_blogs', on_delete=models.CASCADE
    )
    content = HTMLField()
    slug = models.SlugField(default='', editable=False, max_length=225)
    cover = models.ImageField(upload_to='blog_api/', default='blog_api/default.jpg')
    featured = models.BooleanField(default=False)

    # Status workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    published_at = models.DateTimeField(null=True, blank=True)  # scheduled publish
    is_deleted = models.BooleanField(default=False)

    # Metrics
    view_count = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    read_time = models.PositiveIntegerField(default=0)  # minutes, auto-calculated

    class Meta:
        ordering = ('-created_at',)

    def _calculate_read_time(self):
        """Average reading speed: 200 words per minute."""
        text = re.sub(r'<[^>]+>', '', self.content or '')
        words = len(text.split())
        return max(1, round(words / 200))

    def save(self, *args, **kwargs):
        self.slug = slugify(self.title, allow_unicode=True)
        self.read_time = self._calculate_read_time()
        
        # Ensure published_at is set for published posts so they appear in public queries
        if self.status == BlogStatus.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.title} — {self.author.username}'


# ─── Blog View Tracker (for trending — unique per IP per day) ─────────────────

class BlogView(models.Model):
    blog = models.ForeignKey(Blog, related_name='views', on_delete=models.CASCADE)
    ip = models.CharField(max_length=50)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-viewed_at',)

    def __str__(self):
        return f'{self.blog.title} — {self.ip}'


# ─── Comment (legacy — kept for backward compatibility) ───────────────────────

class BlogComment(DateAbstract):
    blog = models.ForeignKey(Blog, related_name='comments', on_delete=models.CASCADE)
    name = models.CharField(max_length=200, default='Anonymous')
    ip = models.CharField(max_length=50, blank=True, null=True)
    comment = models.TextField()

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.blog.title} — {self.name}'
