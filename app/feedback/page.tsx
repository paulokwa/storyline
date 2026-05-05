'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ArrowLeft, Send, CheckCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast-shim'
import { useTheme } from '@/components/providers/ThemeProvider'
import emailjs from '@emailjs/browser'

type SelectOption = { value: string; label: string }

function FeedbackSelect({
  id,
  value,
  placeholder,
  options,
  onChange,
}: {
  id: string
  value: string
  placeholder: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  const { theme } = useTheme()
  const isMidnight = theme === 'midnight'
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id={id}
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn(
          'w-[var(--radix-dropdown-menu-trigger-width)] rounded-[1.25rem] border p-2 shadow-2xl backdrop-blur-sm',
          isMidnight
            ? 'border-slate-600/30 bg-[#1e293b]/95 shadow-[0_20px_45px_rgba(0,0,0,0.45)]'
            : 'border-slate-200 bg-white/95 shadow-[0_20px_45px_rgba(15,23,42,0.16)]'
        )}
      >
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => { onChange(option.value); setOpen(false) }}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors',
              option.value === value
                ? cn(
                    'font-medium',
                    isMidnight ? 'bg-slate-700/60 text-slate-100' : 'bg-slate-100 text-slate-900'
                  )
                : cn(
                    isMidnight ? 'text-slate-300 hover:bg-slate-700/40 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
            )}
          >
            {option.label}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || ''
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || ''
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''

function FeedbackPageFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4 py-4"
      style={{
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
      }}
    >
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">Loading feedback form...</p>
        </CardContent>
      </Card>
    </div>
  )
}

function FeedbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPath = searchParams.get('from')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    device: '',
    platform: '',
    browser: '',
    email: '',
    feedback: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.feedback.trim()) {
      toast.error('Please provide your feedback')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Please provide your email address so we can respond.')
      return
    }

    setIsSubmitting(true)

    try {
      if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        const emailBody = `
Contact email: ${formData.email?.trim() || 'Not provided'}
Device: ${formData.device || 'Not specified'}
Platform: ${formData.platform || 'Not specified'}
Browser: ${formData.browser || 'Not specified'}

Feedback:
${formData.feedback}
        `.trim()

        const subject = encodeURIComponent('Storyline Feedback')
        const body = encodeURIComponent(emailBody)
        const mailtoLink = `mailto:mwake.dev@gmail.com?subject=${subject}&body=${body}`

        window.open(mailtoLink, '_blank')
        setFeedbackStatus('Your feedback is ready in your email client. Please send it to complete submission.')
        setIsSubmitted(true)
        toast.success('Your feedback is ready to send from your email client.')
        return
      }

      const templateParams: Record<string, string> = {
        email: formData.email.trim(),
        to_email: 'mwake.dev@gmail.com',
        from_name: 'Storyline User',
        reply_to: formData.email.trim(),
        device: formData.device || 'Not specified',
        platform: formData.platform || 'Not specified',
        browser: formData.browser || 'Not specified',
        feedback: formData.feedback,
        timestamp: new Date().toLocaleString()
      }

      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      )

      console.log('Email send result:', result)
      setFeedbackStatus('Your feedback has been submitted successfully.')
      setIsSubmitted(true)
      toast.success('Thank you for your feedback! It has been submitted successfully.')
    } catch (error) {
      console.error('Error sending feedback:', error)
      const errorText = typeof error === 'object' && error !== null ? (error as { text?: string; message?: string }).text || (error as { text?: string; message?: string }).message : String(error)
      const isRecipientError = String(errorText).toLowerCase().includes('recipients address is empty')

      if (isRecipientError) {
        const emailBody = `
Contact email: ${formData.email?.trim() || 'Not provided'}
Device: ${formData.device || 'Not specified'}
Platform: ${formData.platform || 'Not specified'}
Browser: ${formData.browser || 'Not specified'}

Feedback:
${formData.feedback}
        `.trim()

        const subject = encodeURIComponent('Storyline Feedback')
        const body = encodeURIComponent(emailBody)
        const mailtoLink = `mailto:mwake.dev@gmail.com?subject=${subject}&body=${body}`

        window.open(mailtoLink, '_blank')
        setFeedbackStatus('Your feedback is ready in your email client. Please send it to complete submission.')
        setIsSubmitted(true)
        toast.success('Your feedback is ready to send from your email client.')
      } else {
        setFeedbackStatus('Failed to send your feedback. Please try again or contact support directly.')
        toast.error('Failed to send your feedback. Please try again or contact support directly.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background px-4 py-4"
        style={{
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        }}
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-[#546354] mx-auto" />
              <div>
                <h2 className="text-2xl font-serif italic text-card-foreground mb-2">Thank You!</h2>
                <p className="text-muted-foreground">
                  Your feedback has been processed.
                </p>
                {feedbackStatus ? (
                  <p className="mt-3 rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                    {feedbackStatus}
                  </p>
                ) : null}
              </div>
              <Button
                onClick={() => {
                  if (fromPath) {
                    router.push(fromPath)
                  } else {
                    router.back()
                  }
                }}
                className="w-full bg-[#546354] hover:bg-[#435243] text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Storyline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-background px-4 pb-4 pt-3 sm:py-4"
      style={{
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-3 text-foreground/70 hover:text-foreground sm:mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="rounded-[2rem] py-5 sm:py-4">
          <CardHeader className="px-5 sm:px-4">
            <CardTitle className="text-2xl font-serif italic">
              Share Your Feedback
            </CardTitle>
            <CardDescription>
              Help us improve Storyline by sharing your thoughts, bug reports, or feature requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-2 sm:px-4">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {feedbackStatus ? (
                <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                  {feedbackStatus}
                </div>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device">Device Type</Label>
                  <FeedbackSelect
                    id="device"
                    value={formData.device}
                    placeholder="Select device"
                    onChange={(v) => handleInputChange('device', v)}
                    options={[
                      { value: 'desktop', label: 'Desktop' },
                      { value: 'laptop', label: 'Laptop' },
                      { value: 'tablet', label: 'Tablet' },
                      { value: 'mobile', label: 'Mobile Phone' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <FeedbackSelect
                    id="platform"
                    value={formData.platform}
                    placeholder="Select platform"
                    onChange={(v) => handleInputChange('platform', v)}
                    options={[
                      { value: 'windows', label: 'Windows' },
                      { value: 'macos', label: 'macOS' },
                      { value: 'linux', label: 'Linux' },
                      { value: 'ios', label: 'iOS' },
                      { value: 'android', label: 'Android' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="browser">Browser</Label>
                  <FeedbackSelect
                    id="browser"
                    value={formData.browser}
                    placeholder="Select browser"
                    onChange={(v) => handleInputChange('browser', v)}
                    options={[
                      { value: 'chrome', label: 'Chrome' },
                      { value: 'firefox', label: 'Firefox' },
                      { value: 'safari', label: 'Safari' },
                      { value: 'edge', label: 'Edge' },
                      { value: 'opera', label: 'Opera' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="border-foreground/20"
                />
                <p className="text-xs text-muted-foreground">
                  We require an email address so Storyline support can follow up with you.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="Please share your thoughts, report bugs, or suggest features..."
                  value={formData.feedback}
                  onChange={(e) => handleInputChange('feedback', e.target.value)}
                  rows={6}
                  className="resize-none border-foreground/20"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 h-12 w-full rounded-2xl bg-[#546354] text-white hover:bg-[#435243]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<FeedbackPageFallback />}>
      <FeedbackPageContent />
    </Suspense>
  )
}
