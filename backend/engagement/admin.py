from django.contrib import admin
from .models import Comment, CommentLike, NewsletterSubscriber, Poll, PollOption, PollVote


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author_name', 'blog', 'parent', 'like_count', 'is_approved', 'created_at')
    list_filter = ('is_approved',)
    list_editable = ('is_approved',)
    search_fields = ('author_name', 'content', 'blog__title')
    ordering = ('-created_at',)


@admin.register(CommentLike)
class CommentLikeAdmin(admin.ModelAdmin):
    list_display = ('comment', 'ip', 'created_at')


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ('email', 'is_active', 'subscribed_at')
    list_filter = ('is_active',)
    list_editable = ('is_active',)
    search_fields = ('email',)
    actions = ['send_test_email']

    def send_test_email(self, request, queryset):
        from django.core.mail import send_mail
        emails = list(queryset.filter(is_active=True).values_list('email', flat=True))
        if emails:
            send_mail(
                subject='CMBlog — Test Newsletter',
                message='This is a test newsletter from CMBlog.',
                from_email=None,
                recipient_list=emails,
            )
            self.message_user(request, f'Test email sent to {len(emails)} subscriber(s).')
    send_test_email.short_description = 'Send test email to selected subscribers'


class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 3
    readonly_fields = ('vote_count',)


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ('question', 'is_active', 'expires_at', 'created_at')
    list_editable = ('is_active',)
    inlines = [PollOptionInline]


admin.site.register(PollVote)
