from django.contrib import admin
from .models import SubmissionNotification, EditorialNote


class EditorialNoteInline(admin.TabularInline):
    model = EditorialNote
    extra = 0
    readonly_fields = ('editor', 'note', 'created_at')


@admin.register(SubmissionNotification)
class SubmissionNotificationAdmin(admin.ModelAdmin):
    list_display = ('blog', 'submitted_by', 'is_read', 'created_at')
    list_filter = ('is_read',)
    list_editable = ('is_read',)
    inlines = [EditorialNoteInline]
    readonly_fields = ('created_at', 'updated_at')
    search_fields = ('blog__title', 'submitted_by__username')


admin.site.register(EditorialNote)
