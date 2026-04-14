import { useRef, useState, useCallback, useEffect } from 'react'

export function useDragScroll() {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [scrollLeft, setScrollLeft] = useState(0)

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (!scrollRef.current) return
        setIsDragging(true)
        setStartX(e.pageX - scrollRef.current.offsetLeft)
        setScrollLeft(scrollRef.current.scrollLeft)
    }, [])

    const onMouseLeave = useCallback(() => {
        setIsDragging(false)
    }, [])

    const onMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return
        e.preventDefault()
        const x = e.pageX - scrollRef.current.offsetLeft
        const walk = (x - startX) * 2 // Scroll speed multiplier
        scrollRef.current.scrollLeft = scrollLeft - walk
    }, [isDragging, startX, scrollLeft])

    return {
        scrollRef,
        isDragging,
        onMouseDown,
        onMouseLeave,
        onMouseUp,
        onMouseMove
    }
}
