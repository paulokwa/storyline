# Feedback Form Setup

The feedback form uses EmailJS to send emails directly to your inbox without requiring users to open their email client.

## Setup Instructions

1. **Sign up for EmailJS** at https://www.emailjs.com/

2. **Create an Email Service**:
   - Go to Email Services in your EmailJS dashboard
   - Connect your email provider (Gmail, Outlook, etc.)
   - Note the Service ID

3. **Create an Email Template**:
   - Go to Email Templates
   - Create a new template with these variables:
     ```
     Subject: Storyline Feedback from {{from_name}}

     Device: {{device}}
     Platform: {{platform}}
     Browser: {{browser}}
     Timestamp: {{timestamp}}

     Feedback:
     {{feedback}}
     ```
   - Note the Template ID

4. **Get your Public Key**:
   - Go to Account → General
   - Copy your Public Key

5. **Update your .env.local**:
   ```
   NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id_here
   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id_here
   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
   ```

## Alternative: Supabase Edge Functions

If you prefer to use Supabase instead of EmailJS:

1. Create a Supabase Edge Function for sending emails
2. Use a service like Resend (https://resend.com) or SendGrid
3. Configure SMTP in your Supabase project settings

The current implementation falls back to mailto if EmailJS is not configured, so the form will still work even without these settings.