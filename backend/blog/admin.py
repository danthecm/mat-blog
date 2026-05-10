from django.contrib import admin
from .models import Blog, BlogTag, BlogComment, BlogCategory, BlogView


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'status', 'featured', 'view_count', 'read_time', 'created_at')
    list_filter = ('status', 'featured', 'category', 'tags')
    list_editable = ('status', 'featured')
    search_fields = ('title', 'author__username', 'tags__title')
    prepopulated_fields = {}
    readonly_fields = ('slug', 'view_count', 'read_time', 'created_at', 'updated_at')
    filter_horizontal = ('tags',)
    ordering = ('-created_at',)


@admin.register(BlogCategory)
class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(BlogTag)
class BlogTagAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(BlogComment)
class BlogCommentAdmin(admin.ModelAdmin):
    list_display = ('blog', 'name', 'ip', 'created_at')
    search_fields = ('name', 'comment', 'blog__title')


admin.site.register(BlogView)
