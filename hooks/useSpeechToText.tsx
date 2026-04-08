'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface SpeechToTextOptions {
    onTranscript?: (text: string, isFinal: boolean) => void
    onStatusChange?: (isRecording: boolean) => void
    lang?: string
}

export function useSpeechToText({ onTranscript, onStatusChange, lang = 'en-US' }: SpeechToTextOptions = {}) {
    const [isRecording, setIsRecording] = useState(false)
    const [supported, setSupported] = useState(false)
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
            setSupported(true)
            const recognition = new SpeechRecognition()
            recognition.continuous = true
            recognition.interimResults = true
            recognition.lang = lang

            recognition.onresult = (event: any) => {
                let interimTranscript = ''
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript
                    } else {
                        interimTranscript += event.results[i][0].transcript
                    }
                }

                if (finalTranscript) {
                    onTranscript?.(finalTranscript, true)
                } else if (interimTranscript) {
                    onTranscript?.(interimTranscript, false)
                }
            }

            recognition.onstart = () => {
                setIsRecording(true)
                onStatusChange?.(true)
            }

            recognition.onend = () => {
                setIsRecording(false)
                onStatusChange?.(false)
            }

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error)
                // 'aborted' is fired when stop() is called, we handle that as normal
                if (event.error !== 'aborted') {
                    setIsRecording(false)
                    onStatusChange?.(false)
                } else {
                    // even if aborted, the onend event will handle resetting the state
                }
            }

            recognitionRef.current = recognition
        }
    }, [lang]) // Minimal dependencies for stable recognition instance

    // We use refs for callbacks to avoid re-initializing recognition on every prop change
    const onTranscriptRef = useRef(onTranscript)
    const onStatusChangeRef = useRef(onStatusChange)
    
    useEffect(() => {
        onTranscriptRef.current = onTranscript
        onStatusChangeRef.current = onStatusChange
    }, [onTranscript, onStatusChange])

    // Re-bind recognition handlers if the instance exists
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = ''
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript
                    } else {
                        interimTranscript += event.results[i][0].transcript
                    }
                }

                if (finalTranscript) {
                    onTranscriptRef.current?.(finalTranscript, true)
                } else if (interimTranscript) {
                    onTranscriptRef.current?.(interimTranscript, false)
                }
            }
        }
    }, [])

    const start = useCallback(() => {
        if (recognitionRef.current && !isRecording) {
            try {
                recognitionRef.current.start()
            } catch (e) {
                console.error('Failed to start recognition', e)
            }
        }
    }, [isRecording])

    const stop = useCallback(() => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop()
        }
    }, [isRecording])

    const toggle = useCallback(() => {
        if (isRecording) {
            stop()
        } else {
            start()
        }
    }, [isRecording, start, stop])

    return {
        isRecording,
        supported,
        start,
        stop,
        toggle
    }
}
