'use client'

/**
 * Phase 2 – File System Access Utility
 *
 * Provides a unified API for interacting with the local file system
 * using the File System Access API with graceful fallback to 
 * traditional browser downloads.
 *
 * Rules:
 * - Feature detect showSaveFilePicker/showOpenFilePicker.
 * - Handle permissions and user rejections.
 * - Provide fallback for Firefox/Safari/Mobile.
 */

import { BACKUP_FILE_EXTENSION, BACKUP_MIME_TYPE } from './backup-format'

/**
 * Checks if the File System Access API is supported by the current browser.
 * Primarily Chrome/Edge/Opera (Chromium).
 */
export function isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

/**
 * Requests a file handle from the user for opening an existing .storyline file.
 */
export async function pickStorylineFile(): Promise<FileSystemFileHandle | null> {
    if (!isFileSystemAccessSupported()) return null

    try {
        const [handle] = await window.showOpenFilePicker({
            types: [
                {
                    description: 'Storyline Project File',
                    accept: { 'application/json': [BACKUP_FILE_EXTENSION] },
                },
            ],
            multiple: false,
        })
        return handle || null
    } catch (err) {
        // User cancelled or permission denied
        if ((err as Error).name === 'AbortError') return null
        throw err
    }
}

/**
 * Requests a new file handle from the user for "Save As".
 */
export async function getNewStorylineFileHandle(suggestedName: string): Promise<FileSystemFileHandle | null> {
    if (!isFileSystemAccessSupported()) return null

    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: suggestedName.endsWith(BACKUP_FILE_EXTENSION) 
                ? suggestedName 
                : `${suggestedName}${BACKUP_FILE_EXTENSION}`,
            types: [
                {
                    description: 'Storyline Project File',
                    accept: { 'application/json': [BACKUP_FILE_EXTENSION] },
                },
            ],
        })
        return handle
    } catch (err) {
        if ((err as Error).name === 'AbortError') return null
        throw err
    }
}

/**
 * Verifies if we still have read/write permission for a stored handle.
 * Browsers often revoke permissions on page reload.
 */
export async function verifyHandlePermission(
    handle: FileSystemFileHandle,
    mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
    // Check current permission
    const currentStatus = await handle.queryPermission({ mode })
    if (currentStatus === 'granted') return true

    // Request permission if not granted
    const requestStatus = await handle.requestPermission({ mode })
    return requestStatus === 'granted'
}

/**
 * Writes content to a FileSystemFileHandle.
 */
export async function writeToFileHandle(handle: FileSystemFileHandle, content: string): Promise<void> {
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
}

/**
 * Fallback: Triggers a traditional browser download for unsupported browsers
 * or when the user doesn't want to link a file.
 */
export function triggerDownload(fileName: string, content: string) {
    const blob = new Blob([content], { type: BACKUP_MIME_TYPE })
    const url = URL.createObjectURL(blob)
    
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName.endsWith(BACKUP_FILE_EXTENSION) 
        ? fileName 
        : `${fileName}${BACKUP_FILE_EXTENSION}`
    
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * High-level Save helper that attempts to write to a handle if available,
 * otherwise falls back to a download.
 * 
 * @returns true if saved via handle, false if saved via download, null if aborted.
 */
export async function saveProjectContent(
    content: string,
    options: {
        fileName: string
        handle?: FileSystemFileHandle | null
    }
): Promise<{ ok: boolean; savedToHandle: boolean; handle?: FileSystemFileHandle; fileName: string; reason?: string } | null> {
    const { fileName, handle } = options

    // 1. Try to use existing handle
    if (handle && isFileSystemAccessSupported()) {
        try {
            const hasPermission = await verifyHandlePermission(handle, 'readwrite')
            if (hasPermission) {
                await writeToFileHandle(handle, content)
                return { ok: true, savedToHandle: true, handle, fileName: handle.name }
            }
            return { ok: false, savedToHandle: false, reason: 'permission_denied', fileName }
        } catch (err) {
            console.warn('[saveProjectContent] Failed to write to handle, falling back to picker/download', err)
            // Fall through to picker
        }
    }

    // 2. If no handle or handle failed, and API is supported, use picker
    if (isFileSystemAccessSupported()) {
        try {
            const newHandle = await getNewStorylineFileHandle(fileName)
            if (newHandle) {
                await writeToFileHandle(newHandle, content)
                return { ok: true, savedToHandle: true, handle: newHandle, fileName: newHandle.name }
            }
            // If user aborted picker, return null
            return { ok: false, savedToHandle: false, reason: 'cancelled', fileName }
        } catch (err) {
            console.error('[saveProjectContent] Picker failed', err)
            // Final fallback to download
        }
    }

    // 3. Fallback to download
    const finalFileName = fileName.endsWith(BACKUP_FILE_EXTENSION) ? fileName : `${fileName}${BACKUP_FILE_EXTENSION}`
    triggerDownload(finalFileName, content)
    return { ok: true, savedToHandle: false, fileName: finalFileName }
}
