import {
    DEFAULT_PROSE_EDITOR_FONT_ID,
    type ProseEditorFontId,
    PROSE_EDITOR_FONTS,
} from '@/lib/editor/fonts'

export const EDITOR_VIEW_SETTINGS_STORAGE_KEY = 'storyline_editor_prefs'

export type ProseEditorTextAlign = 'left' | 'justify'

export type ProseEditorViewSettings = {
    fontSize: '16px' | '18px' | '22px'
    lineHeight: '1.5' | '1.8' | '2.2'
    paragraphSpacing: '0.9em' | '1.25em' | '1.6em'
    maxWidth: '896px' | '1152px' | '100%'
    textAlign: ProseEditorTextAlign
    fontFamily: ProseEditorFontId
    focusMode: boolean
    typewriterMode: boolean
}

export const DEFAULT_PROSE_EDITOR_VIEW_SETTINGS: ProseEditorViewSettings = {
    fontSize: '18px',
    lineHeight: '1.8',
    paragraphSpacing: '1.25em',
    maxWidth: '1152px',
    textAlign: 'left',
    fontFamily: DEFAULT_PROSE_EDITOR_FONT_ID,
    focusMode: false,
    typewriterMode: false,
}

const VALID_FONT_IDS = new Set<ProseEditorFontId>(PROSE_EDITOR_FONTS.map((font) => font.id))
const VALID_FONT_SIZES = new Set<ProseEditorViewSettings['fontSize']>(['16px', '18px', '22px'])
const VALID_LINE_HEIGHTS = new Set<ProseEditorViewSettings['lineHeight']>(['1.5', '1.8', '2.2'])
const VALID_PARAGRAPH_SPACING = new Set<ProseEditorViewSettings['paragraphSpacing']>(['0.9em', '1.25em', '1.6em'])
const VALID_WIDTHS = new Set<ProseEditorViewSettings['maxWidth']>(['896px', '1152px', '100%'])
const VALID_ALIGNMENT = new Set<ProseEditorViewSettings['textAlign']>(['left', 'justify'])

export function normalizeProseEditorViewSettings(value: unknown): ProseEditorViewSettings {
    if (!value || typeof value !== 'object') {
        return DEFAULT_PROSE_EDITOR_VIEW_SETTINGS
    }

    const candidate = value as Partial<ProseEditorViewSettings>

    return {
        fontSize: VALID_FONT_SIZES.has(candidate.fontSize as ProseEditorViewSettings['fontSize'])
            ? (candidate.fontSize as ProseEditorViewSettings['fontSize'])
            : DEFAULT_PROSE_EDITOR_VIEW_SETTINGS.fontSize,
        lineHeight: VALID_LINE_HEIGHTS.has(candidate.lineHeight as ProseEditorViewSettings['lineHeight'])
            ? (candidate.lineHeight as ProseEditorViewSettings['lineHeight'])
            : DEFAULT_PROSE_EDITOR_VIEW_SETTINGS.lineHeight,
        paragraphSpacing: VALID_PARAGRAPH_SPACING.has(candidate.paragraphSpacing as ProseEditorViewSettings['paragraphSpacing'])
            ? (candidate.paragraphSpacing as ProseEditorViewSettings['paragraphSpacing'])
            : DEFAULT_PROSE_EDITOR_VIEW_SETTINGS.paragraphSpacing,
        maxWidth: VALID_WIDTHS.has(candidate.maxWidth as ProseEditorViewSettings['maxWidth'])
            ? (candidate.maxWidth as ProseEditorViewSettings['maxWidth'])
            : DEFAULT_PROSE_EDITOR_VIEW_SETTINGS.maxWidth,
        textAlign: VALID_ALIGNMENT.has(candidate.textAlign as ProseEditorViewSettings['textAlign'])
            ? (candidate.textAlign as ProseEditorViewSettings['textAlign'])
            : DEFAULT_PROSE_EDITOR_VIEW_SETTINGS.textAlign,
        fontFamily: VALID_FONT_IDS.has(candidate.fontFamily as ProseEditorFontId)
            ? (candidate.fontFamily as ProseEditorFontId)
            : DEFAULT_PROSE_EDITOR_VIEW_SETTINGS.fontFamily,
        focusMode:
            typeof candidate.focusMode === 'boolean'
                ? candidate.focusMode
                : DEFAULT_PROSE_EDITOR_VIEW_SETTINGS.focusMode,
        typewriterMode:
            typeof candidate.typewriterMode === 'boolean'
                ? candidate.typewriterMode
                : DEFAULT_PROSE_EDITOR_VIEW_SETTINGS.typewriterMode,
    }
}
