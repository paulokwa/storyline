'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { toast } from '@/lib/toast-shim'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || ''
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || ''
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''

function FeedbackPageFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-4"
      style={{
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
      }}
    >
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-sm text-slate-600">Loading feedback form...</p>
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
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-4"
        style={{
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        }}
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-serif italic text-slate-800 mb-2">Thank You!</h2>
                <p className="text-slate-600">
                  Your feedback has been processed.
                </p>
                {feedbackStatus ? (
                  <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 pb-4 pt-3 sm:py-4"
      style={{
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-3 text-slate-600 hover:text-slate-800 sm:mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="rounded-[2rem] py-5 sm:py-4">
          <CardHeader className="px-5 sm:px-4">
            <CardTitle className="text-2xl font-serif italic text-slate-800">
              Share Your Feedback
            </CardTitle>
            <CardDescription>
              Help us improve Storyline by sharing your thoughts, bug reports, or feature requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-2 sm:px-4">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {feedbackStatus ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {feedbackStatus}
                </div>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device">Device Type</Label>
                  <select
                    id="device"
                    value={formData.device}
                    onChange={(e) => handleInputChange('device', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <option value="">Select device</option>
                    <option value="desktop">Desktop</option>
                    <option value="laptop">Laptop</option>
                    <option value="tablet">Tablet</option>
                    <option value="mobile">Mobile Phone</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    value={formData.platform}
                    onChange={(e) => handleInputChange('platform', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <option value="">Select platform</option>
                    <option value="windows">Windows</option>
                    <option value="macos">macOS</option>
                    <option value="linux">Linux</option>
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="browser">Browser</Label>
                  <select
                    id="browser"
                    value={formData.browser}
                    onChange={(e) => handleInputChange('browser', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <option value="">Select browser</option>
                    <option value="chrome">Chrome</option>
                    <option value="firefox">Firefox</option>
                    <option value="safari">Safari</option>
                    <option value="edge">Edge</option>
                    <option value="opera">Opera</option>
                    <option value="other">Other</option>
                  </select>
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
                />
                <p className="text-xs text-slate-500">
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
                  className="resize-none"
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
