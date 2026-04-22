'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AiTrialAdjustmentForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<'adjust' | 'recalculate'>('adjust')
  const [targetUserId, setTargetUserId] = useState('')
  const [deltaUsd, setDeltaUsd] = useState('')
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)

    const isRecalculate = activeAction === 'recalculate'
    const response = await fetch(isRecalculate ? '/api/admin/ai-trial-recalculate' : '/api/admin/ai-trial-adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isRecalculate
          ? {
              targetUserId,
              note,
            }
          : {
              targetUserId,
              deltaUsd,
              status,
              note,
            }
      ),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      setError(data?.error || (isRecalculate ? 'Unable to recalculate trial usage.' : 'Unable to apply manual adjustment.'))
      return
    }

    if (isRecalculate) {
      const deltaMicros = typeof data?.result?.balance_delta_micros === 'number' ? data.result.balance_delta_micros : null
      const deltaUsdFormatted = deltaMicros === null ? null : `$${(Math.abs(deltaMicros) / 1_000_000).toFixed(2)}`
      setMessage(
        deltaMicros === null
          ? 'Trial usage recalculated.'
          : `Trial usage recalculated. ${deltaMicros >= 0 ? 'Restored' : 'Removed'} ${deltaUsdFormatted} of balance.`
      )
    } else {
      setMessage('Manual trial adjustment recorded.')
      setDeltaUsd('')
      setStatus('')
    }
    setNote('')
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="targetUserId" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Target User ID
          </label>
          <Input
            id="targetUserId"
            value={targetUserId}
            onChange={(event) => setTargetUserId(event.target.value)}
            placeholder="Supabase user UUID"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="deltaUsd" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Delta USD
          </label>
          <Input
            id="deltaUsd"
            value={deltaUsd}
            onChange={(event) => setDeltaUsd(event.target.value)}
            placeholder="0.50 or -0.25"
            disabled={activeAction === 'recalculate'}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="status" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Optional Status Override
          </label>
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={activeAction === 'recalculate'}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <option value="">Keep current</option>
            <option value="active">Active</option>
            <option value="exhausted">Exhausted</option>
            <option value="blocked">Blocked</option>
            <option value="abuse_review">Abuse Review</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="note" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Note
          </label>
          <Input
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why this adjustment was made"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {activeAction === 'recalculate'
          ? 'Recalculate mode recomputes completed sponsored requests for this user with the current pricing model and updates their trial balance automatically.'
          : 'Manual adjustment mode applies a direct balance delta and optional status override.'}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          onClick={() => setActiveAction('adjust')}
        >
          {isPending && activeAction === 'adjust' ? 'Applying...' : 'Apply Trial Adjustment'}
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          onClick={() => setActiveAction('recalculate')}
        >
          {isPending && activeAction === 'recalculate' ? 'Recalculating...' : 'Recalculate Usage'}
        </Button>
        {message ? <span className="text-sm text-green-700">{message}</span> : null}
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>
    </form>
  )
}
