import AuthLinkErrorRedirector from '@/components/auth/AuthLinkErrorRedirector'
import LoginForm from '@/components/auth/LoginForm'
import { getAlreadyUsedVerificationHref, hasInvalidAuthLinkError } from '@/lib/auth/auth-link-errors'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

type LoginPageProps = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function getFirstParamValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
        return value[0] ?? ''
    }

    return value ?? ''
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const resolvedSearchParams = await searchParams

    if (hasInvalidAuthLinkError(resolvedSearchParams)) {
        const requestHeaders = await headers()
        const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
        const protocol = requestHeaders.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
        const supabase = await createClient()
        await supabase.auth.signOut({ scope: 'local' })
        redirect(getAlreadyUsedVerificationHref(host ? `${protocol}://${host}` : undefined))
    }

    const verificationStatus = getFirstParamValue(resolvedSearchParams.verification)

    return (
        <>
            <AuthLinkErrorRedirector />
            <LoginForm verificationStatus={verificationStatus} />
        </>
    )
}
