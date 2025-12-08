import React from 'https://esm.sh/react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { render } from 'https://esm.sh/@react-email/render@0.0.12'
import { MagicLinkEmail } from './_templates/magic-link.tsx'
import { EmailChangeEmail } from './_templates/email-change.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map email action types to subject lines
function getEmailSubject(actionType: string): string {
  switch (actionType) {
    case 'email_change':
      return 'Confirm your new email address - EMMA'
    case 'recovery':
      return 'Reset your password - EMMA'
    case 'signup':
      return 'Welcome to EMMA - Confirm your email'
    case 'magiclink':
    default:
      return 'Sign in to EMMA'
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  
  console.log('Received auth email webhook')
  
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
        token_new: string
        token_hash_new: string
      }
    }

    console.log('Processing email for:', user.email, 'Action:', email_action_type)

    // Choose the right template based on action type
    let html: string
    if (email_action_type === 'email_change') {
      html = render(
        React.createElement(EmailChangeEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
        })
      )
    } else {
      html = render(
        React.createElement(MagicLinkEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
        })
      )
    }

    const subject = getEmailSubject(email_action_type)
    console.log('Sending email with subject:', subject, 'to:', user.email)

    const { error } = await resend.emails.send({
      from: 'EMMA <onboarding@resend.dev>',
      to: [user.email],
      subject,
      html,
    })
    
    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully to:', user.email)
    
  } catch (error: unknown) {
    console.error('Error processing auth email:', error)
    const err = error as { code?: string; message?: string }
    return new Response(
      JSON.stringify({
        error: {
          http_code: err.code ?? 'unknown',
          message: err.message ?? 'Unknown error',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
})
