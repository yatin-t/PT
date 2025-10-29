from django import template

register = template.Library()

@register.filter
def published_count(files):
    """Count published files in a queryset"""
    return files.filter(is_published=True).count()

@register.filter
def has_published_files(unit):
    """Check if unit has any published files"""
    return unit.files.filter(is_published=True).exists()
