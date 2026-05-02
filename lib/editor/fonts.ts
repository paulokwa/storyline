export type ProseEditorFontId =
    | 'Newsreader'
    | 'Lora'
    | 'Inter'
    | 'Atkinson Hyperlegible'
    | 'Source Serif 4'
    | 'Merriweather'

export type ProseEditorFontOption = {
    id: ProseEditorFontId
    label: string
    family: string
    category: 'serif' | 'sans'
}

export const PROSE_EDITOR_FONTS: ProseEditorFontOption[] = [
    {
        id: 'Newsreader',
        label: 'Newsreader',
        family: "var(--font-newsreader), var(--font-lora), Georgia, serif",
        category: 'serif',
    },
    {
        id: 'Lora',
        label: 'Lora',
        family: "var(--font-lora), Georgia, serif",
        category: 'serif',
    },
    {
        id: 'Source Serif 4',
        label: 'Source Serif 4',
        family: "var(--font-source-serif-4), Georgia, serif",
        category: 'serif',
    },
    {
        id: 'Merriweather',
        label: 'Merriweather',
        family: "var(--font-merriweather), Georgia, serif",
        category: 'serif',
    },
    {
        id: 'Inter',
        label: 'Inter',
        family: "var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        category: 'sans',
    },
    {
        id: 'Atkinson Hyperlegible',
        label: 'Atkinson',
        family: "var(--font-atkinson), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        category: 'sans',
    },
]

export const DEFAULT_PROSE_EDITOR_FONT_ID: ProseEditorFontId = 'Newsreader'

export const PROSE_EDITOR_FONT_STACKS = PROSE_EDITOR_FONTS.reduce<Record<ProseEditorFontId, string>>(
    (accumulator, font) => {
        accumulator[font.id] = font.family
        return accumulator
    },
    {} as Record<ProseEditorFontId, string>
)
