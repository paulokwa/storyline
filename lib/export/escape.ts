const MARKUP_ESCAPE_LOOKUP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}

export function escapeMarkupText(value: unknown, fallback = ''): string {
    return String(value ?? fallback).replace(/[&<>"']/g, (char) => MARKUP_ESCAPE_LOOKUP[char])
}

export function escapeMarkupAttribute(value: unknown, fallback = ''): string {
    return escapeMarkupText(value, fallback)
}
