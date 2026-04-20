import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    
    // Skip proxy for API routes as they handle their own auth
    if (pathname.startsWith('/api')) {
        return NextResponse.next()
    }

    const authRoutes = ['/login', '/signup']
    const unauthenticatedPublicRoutes = ['/', '/forgot-password', '/reset-password', '/terms', '/privacy', '/ai-disclaimer']
    const isAuthRoute = authRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))
    const isUnauthenticatedPublicRoute = unauthenticatedPublicRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))

    if (isUnauthenticatedPublicRoute) {
        return NextResponse.next()
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user && !isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/library'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

export default proxy
