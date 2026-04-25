'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cloud, Trash2, ArrowUpRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { destroyLocalProject } from '@/lib/persistence/local-projects'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface MigratedBannerProps {
    projectId: string
    cloudProjectId: string
}

export default function MigratedBanner({ projectId, cloudProjectId }: MigratedBannerProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    async function handleDelete() {
        setIsDeleting(true)
        try {
            await destroyLocalProject(projectId)
            toast.success('Local backup deleted.')
            router.push('/library')
        } catch (error) {
            console.error('Failed to delete local backup:', error)
            toast.error('Failed to delete local backup.')
            setIsDeleting(false)
        }
    }

    return (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Cloud className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-sm font-medium text-blue-900">
                        This project has been migrated to the cloud.
                    </p>
                    <p className="text-xs text-blue-700">
                        You are viewing a local backup. Changes made here will not sync.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 h-8 gap-2"
                    onClick={() => router.push(`/project/${cloudProjectId}/story`)}
                >
                    Open Cloud Version
                    <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>

                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:bg-blue-100 hover:text-blue-700 h-8 px-2"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="sr-only">Delete Local Backup</span>
                </Button>
            </div>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete local backup?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the local copy of this project from your device.
                            The cloud version will remain safe.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete Backup
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
