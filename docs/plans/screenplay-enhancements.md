# Screenplay Mode Roadmap

This document outlines the planned development phases for the Screenplay Mode in the Storytime Editor.

## Phase 1: Foundation (Completed)
- Custom TipTap nodes for screenplay elements (Sluglines, Action, Character, etc.).
- Semantic HTML storage with `data-type` attributes.
- Input rule engine for automatic node conversion.
- Responsive CSS styling calibrated for industry-standard screenplay proportions.

## Phase 2: Keyboard Engine (Completed)
- **Predictive Flow**: Enter key naturally transitions between blocks (e.g., Character -> Dialogue).
- **Tab Cycling**: Standard shortcut to cycle through screenplay types (Action -> Character -> Parenthetical -> Dialogue -> Transition -> Scene Heading).
- **Isolation**: Ensuring keyboard behaviors only apply when in Screenplay Mode.

## Phase 3 – Screenplay Mode Enhancements (Deferred)

### 1. Parenthetical Auto-Insertion
- When switching to Parenthetical via Tab, optionally auto-insert: `()` with cursor placed inside.
- Must avoid double-parentheses issues.
- Should remain optional / configurable.

### 2. Smart Parenthetical Formatting
- Normalize spacing and casing inside parentheses.
- Optional enforcement of uppercase vs user-defined casing.

### 3. Dialogue Assistance (Non-intrusive)
- Optional AI suggestions for dialogue refinement.
- Must not auto-modify user text.
- Should be explicitly user-triggered only.

### 4. Enhanced Screenplay UX Polish
- Fine-tuning of spacing, margins, and alignment.
- Optional “strict screenplay formatting” toggle.

### 5. Advanced Keyboard Enhancements (Optional)
- Smarter Tab behavior based on context.
- Optional shortcuts for inserting common screenplay elements.
