'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { getUserSafely } from '@/lib/supabase/client-auth'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

export type PresenceStatus = 'viewing' | 'editing'

export interface PresenceUser {
    user_id: string
    email: string
    display_name: string
    scene_id: string | null
    status: PresenceStatus
    last_active: number
}

interface PresenceContextType {
    presenceUsers: PresenceUser[]
    myStatus: PresenceStatus
    setMyStatus: (status: PresenceStatus) => void
    activeSceneUsers: PresenceUser[]
    currentUser: any | null
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined)

function collapsePresenceState(state: Record<string, PresenceUser[]>): PresenceUser[] {
    return Object.values(state)
        .map((presences) =>
            [...presences]
                .filter(Boolean)
                .sort((a, b) => (b.last_active ?? 0) - (a.last_active ?? 0))[0]
        )
        .filter(Boolean) as PresenceUser[]
}

export function PresenceProvider({ 
    projectId, 
    children,
    currentSceneId 
}: { 
    projectId: string, 
    children: React.ReactNode,
    currentSceneId: string | null
}) {
    const isLocalOnly = isLocalProjectId(projectId)
    const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
    const [myStatus, setMyStatus] = useState<PresenceStatus>('viewing')
    const channelRef = useRef<RealtimeChannel | null>(null)
    const supabase = createClient()
    
    // Track user identity
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        if (isLocalOnly) return

        void getUserSafely(supabase)
            .then(({ user }) => setUser(user))
            .catch((error) => {
                console.error('Failed to load presence user:', error)
                setUser(null)
            })
    }, [isLocalOnly, supabase])

    useEffect(() => {
        if (isLocalOnly || !user || !projectId) return

        const channel = supabase.channel(`project:${projectId}`, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        })

        channelRef.current = channel
        const syncPresenceState = () => {
            setPresenceUsers(collapsePresenceState(channel.presenceState() as Record<string, PresenceUser[]>))
        }

        channel
            .on('presence', { event: 'sync' }, syncPresenceState)
            .on('presence', { event: 'join' }, syncPresenceState)
            .on('presence', { event: 'leave' }, syncPresenceState)
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        email: user.email,
                        display_name: user.user_metadata?.display_name || user.email.split('@')[0],
                        scene_id: currentSceneId,
                        status: myStatus,
                        last_active: Date.now()
                    })
                    syncPresenceState()
                }
            })

        return () => {
            channel.unsubscribe()
            channelRef.current = null
            setPresenceUsers([])
        }
    }, [isLocalOnly, projectId, supabase, user])

    // Update presence when my state changes
    useEffect(() => {
        if (isLocalOnly) return
        if (channelRef.current && user) {
            channelRef.current.track({
                user_id: user.id,
                email: user.email,
                display_name: user.user_metadata?.display_name || user.email.split('@')[0],
                scene_id: currentSceneId,
                status: myStatus,
                last_active: Date.now()
            })
        }
    }, [currentSceneId, isLocalOnly, myStatus, user])

    const activeSceneUsers = presenceUsers.filter(u => u.scene_id === currentSceneId && u.user_id !== user?.id)

    return (
        <PresenceContext.Provider value={{ 
            presenceUsers, 
            myStatus, 
            setMyStatus,
            activeSceneUsers,
            currentUser: user
        }}>
            {children}
        </PresenceContext.Provider>
    )
}

export function usePresence() {
    const context = useContext(PresenceContext)
    if (context === undefined) {
        throw new Error('usePresence must be used within a PresenceProvider')
    }
    return context
}
