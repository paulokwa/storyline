import { useState, useCallback, useRef } from 'react'

export function useStreamableText() {
    const [text, setText] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)
    const abortRef = useRef<AbortController | null>(null)

    const start = useCallback(async (url: string, body: Record<string, string>) => {
        if (abortRef.current) abortRef.current.abort()
        abortRef.current = new AbortController()
        setText('')
        setIsStreaming(true)

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: abortRef.current.signal,
            })

            if (!res.ok || !res.body) {
                setText('Something went wrong. Please try again.')
                setIsStreaming(false)
                return
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                setText(prev => prev + chunk)
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setText('Something went wrong. Please try again.')
            }
        } finally {
            setIsStreaming(false)
        }
    }, [])

    const reset = useCallback(() => {
        if (abortRef.current) abortRef.current.abort()
        setText('')
        setIsStreaming(false)
    }, [])

    return { text, isStreaming, start, reset }
}
