type AuthRouter = {
  push: (href: string) => void
  refresh: () => void
}

type StartGuardedAuthRedirectOptions = {
  router: AuthRouter
  destination?: string
  timeoutMs?: number
  onStalled: () => void
}

const DEFAULT_AUTH_REDIRECT_TIMEOUT_MS = 4000

export function startGuardedAuthRedirect({
  router,
  destination = '/library',
  timeoutMs = DEFAULT_AUTH_REDIRECT_TIMEOUT_MS,
  onStalled,
}: StartGuardedAuthRedirectOptions) {
  if (typeof window === 'undefined') {
    router.push(destination)
    router.refresh()
    return
  }

  const sourceHref = window.location.href

  window.setTimeout(() => {
    if (window.location.href === sourceHref) {
      onStalled()
    }
  }, timeoutMs)

  router.push(destination)
  router.refresh()
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
