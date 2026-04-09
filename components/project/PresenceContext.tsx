'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export type PresenceStatus = 'viewing' | 'editing'

export interface PresenceUser {
    user_id: string
    email: string
    scene_id: string | null
    status: PresenceStatus
    last_active: number
}

interface PresenceContextType {
    presenceUsers: PresenceUser[]
    myStatus: PresenceStatus
    setMyStatus: (status: PresenceStatus) => void
    activeSceneUsers: PresenceUser[]
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined)

export function PresenceProvider({ 
    projectId, 
    children,
    currentSceneId 
}: { 
    projectId: string, 
    children: React.ReactNode,
    currentSceneId: string | null
}) {
    const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
    const [myStatus, setMyStatus] = useState<PresenceStatus>('viewing')
    const channelRef = useRef<RealtimeChannel | null>(null)
    const supabase = createClient()
    
    // Track user identity
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [])

    useEffect(() => {
        if (!user || !projectId) return

        const channel = supabase.channel(`project:${projectId}`, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        })

        channelRef.current = channel

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                
                // newState is { [key: string]: Presence[] } where key is user_id
                // We take the first presence for each user to deduplicate multiple tabs
                const deduplicated = Object.values(newState)
                    .map((presences: any) => presences[0])
                    .filter(Boolean) as PresenceUser[]
                
                setPresenceUsers(deduplicated)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        email: user.email,
                        scene_id: currentSceneId,
                        status: myStatus,
                        last_active: Date.now()
                    })
                }
            })

        return () => {
            channel.unsubscribe()
            channelRef.current = null
        }
    }, [user, projectId])

    // Update presence when my state changes
    useEffect(() => {
        if (channelRef.current && user) {
            channelRef.current.track({
                user_id: user.id,
                email: user.email,
                scene_id: currentSceneId,
                status: myStatus,
                last_active: Date.now()
            })
        }
    }, [currentSceneId, myStatus, user])

    const activeSceneUsers = presenceUsers.filter(u => u.scene_id === currentSceneId && u.user_id !== user?.id)

    return (
        <PresenceContext.Provider value={{ 
            presenceUsers, 
            myStatus, 
            setMyStatus,
            activeSceneUsers 
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
