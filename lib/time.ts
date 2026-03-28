export function formatDistanceToNow(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 30) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (diffDays >= 1) {
        return `${diffDays}d ago`
    } else if (diffHours >= 1) {
        return `${diffHours}h ago`
    } else if (diffMins >= 1) {
        return `${diffMins}m ago`
    } else {
        return 'just now'
    }
}
