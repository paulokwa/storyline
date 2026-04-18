'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function AdminBackButton() {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push('/library')
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="h-9 w-fit gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 text-slate-600 hover:bg-white hover:text-slate-900"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase tracking-[0.14em]">Back</span>
    </Button>
  )
}
