import LoginForm from '@/components/auth/LoginForm'

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
    const verificationStatus = getFirstParamValue(resolvedSearchParams.verification)

    return <LoginForm verificationStatus={verificationStatus} />
}
