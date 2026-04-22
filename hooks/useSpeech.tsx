'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

export type SpeechMode = 'Selection' | 'Scene' | 'Chapter'
export type SpeechState = 'idle' | 'speaking' | 'paused'

interface ReaderContextValue {
    supported: boolean
    voices: SpeechSynthesisVoice[]
    selectedVoice: SpeechSynthesisVoice | null
    rate: number
    speechState: SpeechState
    currentMode: SpeechMode | null
    currentChunkText: string | null
    currentChunkIndex: number | null
    setVoice: (voice: SpeechSynthesisVoice) => void
    changeRate: (rate: number) => void
    speak: (text: string, mode: SpeechMode) => void
    speakSegments: (segments: string[], mode: SpeechMode) => void
    pause: () => void
    resume: () => void
    stop: () => void
}

const ReaderContext = createContext<ReaderContextValue | null>(null)

export function ReaderProvider({ children }: { children: React.ReactNode }) {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
    const [rate, setRate] = useState(1)
    const [speechState, setSpeechState] = useState<SpeechState>('idle')
    const [currentMode, setCurrentMode] = useState<SpeechMode | null>(null)
    const [currentChunkText, setCurrentChunkText] = useState<string | null>(null)
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null)
    const [supported, setSupported] = useState(true)

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const queueRef = useRef<{ text: string, mode: SpeechMode, index: number | null }[]>([])
    const isPlayingRef = useRef(false)

    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setSupported(false)
            return
        }

        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices()
            setVoices(availableVoices)

            const savedVoiceURI = localStorage.getItem('storyline_reader_voice')
            if (savedVoiceURI) {
                const found = availableVoices.find(v => v.voiceURI === savedVoiceURI)
                if (found) setSelectedVoice(found)
            } else if (availableVoices.length > 0) {
                const defaultVoice = availableVoices.find(v => v.lang === 'en-US' && v.name.includes('Google'))
                    || availableVoices.find(v => v.lang === 'en-US' && v.name.includes('Samantha'))
                    || availableVoices.find(v => v.lang === 'en-US')
                    || availableVoices[0]
                if (defaultVoice && !selectedVoice) setSelectedVoice(defaultVoice)
            }
        }

        loadVoices()
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices
        }

        const savedRate = localStorage.getItem('storyline_reader_rate')
        if (savedRate) {
            setRate(parseFloat(savedRate))
        }
        
        return () => {
            window.speechSynthesis.cancel()
        }
    }, [selectedVoice])

    const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice)
        localStorage.setItem('storyline_reader_voice', voice.voiceURI)
    }, [])

    const changeRate = useCallback((newRate: number) => {
        setRate(newRate)
        localStorage.setItem('storyline_reader_rate', newRate.toString())
    }, [])

    const stop = useCallback(() => {
        if (!supported) return
        queueRef.current = []
        isPlayingRef.current = false
        window.speechSynthesis.cancel()
        setSpeechState('idle')
        setCurrentMode(null)
        setCurrentChunkText(null)
        setCurrentChunkIndex(null)
    }, [supported])

    const speakNext = useCallback(function playNext() {
        if (!supported || queueRef.current.length === 0) {
            isPlayingRef.current = false
            setSpeechState('idle')
            setCurrentMode(null)
            setCurrentChunkText(null)
            setCurrentChunkIndex(null)
            return
        }

        const next = queueRef.current[0]
        const utterance = new SpeechSynthesisUtterance(next.text)
        
        // Ensure voice is re-applied correctly for each chunk
        const targetVoice = selectedVoice || window.speechSynthesis.getVoices().find(v => v.name === localStorage.getItem('storyline_reader_voice'))
        if (targetVoice) {
            utterance.voice = targetVoice
        }
        utterance.rate = rate

        utterance.onstart = () => {
            setSpeechState('speaking')
            setCurrentMode(next.mode)
            setCurrentChunkText(next.text)
            setCurrentChunkIndex(next.index)
        }
        utterance.onpause = () => setSpeechState('paused')
        utterance.onresume = () => setSpeechState('speaking')
        
        utterance.onend = () => {
            queueRef.current.shift()
            playNext()
        }

        utterance.onerror = (e) => {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.error('Speech chunk error:', e)
                // Continue to next chunk if it wasn't a deliberate cancellation
                queueRef.current.shift()
                playNext()
            }
        }

        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
    }, [supported, selectedVoice, rate])

    const startQueue = useCallback((segments: { text: string, index: number | null }[], mode: SpeechMode) => {
        if (!supported) return
        stop()

        const validSegments = segments
            .map(segment => ({ ...segment, text: segment.text.trim() }))
            .filter(segment => segment.text.length > 0)
        if (validSegments.length === 0) return

        queueRef.current = validSegments.map(segment => ({ ...segment, mode }))
        isPlayingRef.current = true
        speakNext()
    }, [speakNext, stop, supported])

    const speak = useCallback((text: string, mode: SpeechMode) => {
        if (!supported) return
        if (!text.trim()) return

        // Chunk text to prevent 15-second / length limits in some browsers
        const chunks = text.match(/[^.!?\n]+[.!?\n]*/g) || [text]
        startQueue(chunks.map((chunk, index) => ({ text: chunk, index })), mode)
    }, [startQueue, supported])

    const speakSegments = useCallback((segments: string[], mode: SpeechMode) => {
        startQueue(segments.map((segment, index) => ({ text: segment, index })), mode)
    }, [startQueue])

    const pause = useCallback(() => {
        if (!supported) return
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause()
            setSpeechState('paused')
        }
    }, [supported])

    const resume = useCallback(() => {
        if (!supported) return
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
            setSpeechState('speaking')
        }
    }, [supported])

    return (
        <ReaderContext.Provider value={{
            supported, voices, selectedVoice, rate, speechState, currentMode, currentChunkText, currentChunkIndex,
            setVoice, changeRate, speak, speakSegments, pause, resume, stop
        }}>
            {children}
        </ReaderContext.Provider>
    )
}

export function useSpeech() {
    const context = useContext(ReaderContext)
    if (!context) {
        throw new Error('useSpeech must be used within a ReaderProvider')
    }
    return context
}
