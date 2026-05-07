// Smart Context entity filter.
// Accepts pre-loaded project entity arrays and returns only AI-eligible items.
// Eligible = not soft-deleted and not excluded from AI.
// Called by StoryTab when ai_context_mode === 'smart' to build the context
// arrays passed to AiHelperPanel instead of the manual scene-link filter.

type AiEligibleFields = {
    deleted_at: string | null
    exclude_from_ai: boolean
}

export function filterForSmartContext<T extends AiEligibleFields>(entities: T[]): T[] {
    return entities.filter((e) => !e.deleted_at && !e.exclude_from_ai)
}

export function buildSmartContext<
    C extends AiEligibleFields,
    I extends AiEligibleFields,
    L extends AiEligibleFields,
    O extends AiEligibleFields,
>(input: {
    characters: C[]
    ideas: I[]
    locations: L[]
    objects: O[]
}) {
    return {
        characters: filterForSmartContext(input.characters),
        ideas: filterForSmartContext(input.ideas),
        locations: filterForSmartContext(input.locations),
        objects: filterForSmartContext(input.objects),
    }
}
