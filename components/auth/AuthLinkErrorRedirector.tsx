'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    getAlreadyUsedVerificationHref,
    getHashSearchParams,
    hasInvalidAuthLinkError,
} from '@/lib/auth/auth-link-errors'

const INVALID_REFRESH_TOKEN_MESSAGES = ['Invalid Refresh Token', 'Refresh Token Not Found']

function shouldIgnoreSignOutError(error: Error) {
    return (
        error.name === 'AuthSessionMissingError' ||
        INVALID_REFRESH_TOKEN_MESSAGES.some((message) => error.message.includes(message))
    )
}

export default function AuthLinkErrorRedirector() {
    const handledRef = useRef(false)

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const hashParams = getHashSearchParams(window.location.hash)

        if (handledRef.current || (!hasInvalidAuthLinkError(searchParams) && !hasInvalidAuthLinkError(hashParams))) {
            return
        }

        handledRef.current = true

        const supabase = createClient()

        void (async () => {
            const { error } = await supabase.auth.signOut({ scope: 'local' })

            if (error && !shouldIgnoreSignOutError(error)) {
                console.error('Failed to clear local session after invalid auth link:', error)
            }

            window.location.replace(getAlreadyUsedVerificationHref(window.location.origin))
        })()
    }, [])

    return null
}
