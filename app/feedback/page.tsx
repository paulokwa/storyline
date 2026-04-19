'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { toast } from '@/lib/toast-shim'
import emailjs from '@emailjs/browser'

// EmailJS configuration - You'll need to set these up in your EmailJS account
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || ''
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || ''
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''

export default function FeedbackPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    device: '',
    platform: '',
    browser: '',
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

    setIsSubmitting(true)

    try {
      // Check if EmailJS is configured
      if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        // Fallback to mailto if EmailJS not configured
        const emailBody = `
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
        setFeedbackStatus('EmailJS is not configured in this environment; opening the email client instead.')
        setIsSubmitted(true)
        toast.success('Your email client has opened with the feedback details. Please send the email.')
        return
      }

      // Send email using EmailJS
      const templateParams = {
        to_email: 'mwake.dev@gmail.com',
        from_name: 'Storyline User',
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

      console.log('EmailJS send result:', result)
      setFeedbackStatus('Feedback email sent successfully through EmailJS.')
      setIsSubmitted(true)
      toast.success('Thank you for your feedback! It has been sent successfully.')
    } catch (error) {
      console.error('Error sending feedback:', error)
      setFeedbackStatus('Failed to send feedback through EmailJS. Please try again or contact support directly.')
      toast.error('Failed to send feedback. Please try again or contact support directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-serif italic text-slate-800 mb-2">Thank You!</h2>
                <p className="text-slate-600">
                  {feedbackStatus || 'Your feedback has been processed.'}
                </p>
                {feedbackStatus ? (
                  <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {feedbackStatus}
                  </p>
                ) : null}
              </div>
              <Button
                onClick={() => router.back()}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-serif italic text-slate-800">
              Share Your Feedback
            </CardTitle>
            <CardDescription>
              Help us improve Storyline by sharing your thoughts, bug reports, or feature requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full bg-[#546354] hover:bg-[#435243] text-white h-12"
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