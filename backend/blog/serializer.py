from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
from .models import BlogTag, BlogComment, Blog, BlogCategory, BlogView
from user.serializer import UserSerializer


class BlogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogCategory
        fields = ('id', 'name', 'slug', 'description')


class BlogTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogTag
        fields = ('id', 'title', 'slug')


class BlogSerializer(serializers.ModelSerializer):
    tags = BlogTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=BlogTag.objects.all(), many=True, write_only=True, source='tags', required=False
    )
    author = UserSerializer(read_only=True)
    category = BlogCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=BlogCategory.objects.all(), write_only=True, source='category', required=False, allow_null=True
    )
    og_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = (
            'id', 'title', 'slug', 'content', 'cover',
            'author', 'tags', 'tag_ids', 'category', 'category_id',
            'featured', 'status', 'published_at', 'is_deleted',
            'view_count', 'read_time', 'created_at', 'updated_at',
            'og_image_url',
        )
        read_only_fields = ('slug', 'view_count', 'read_time', 'published_at', 'og_image_url', 'is_deleted')

    @extend_schema_field(OpenApiTypes.URI)
    def get_og_image_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/blogs/{obj.slug}/og-image/')
        return f'/blogs/{obj.slug}/og-image/'

    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        blog = Blog.objects.create(**validated_data)
        blog.tags.set(tags)
        return blog

    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if tags is not None:
            instance.tags.set(tags)
        return instance


class BlogListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no full content)."""
    author = UserSerializer(read_only=True)
    tags = BlogTagSerializer(many=True, read_only=True)
    category = BlogCategorySerializer(read_only=True)

    class Meta:
        model = Blog
        fields = (
            'id', 'title', 'slug', 'cover', 'author', 'tags', 'category',
            'featured', 'status', 'view_count', 'read_time', 'created_at',
        )


class BlogCommentSerializer(serializers.ModelSerializer):
    blog = BlogListSerializer(read_only=True)
    blog_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = BlogComment
        fields = '__all__'
