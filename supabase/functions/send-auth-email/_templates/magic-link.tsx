import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface MagicLinkEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const MagicLinkEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Your EMMA sign-in link</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo/Brand Section */}
        <Section style={logoSection}>
          <div style={logoContainer}>
            <Text style={logoEmoji}>🏆</Text>
          </div>
          <Heading style={brandHeading}>EMMA</Heading>
          <Text style={tagline}>Fantasy Playoff League</Text>
        </Section>

        {/* Main Content */}
        <Section style={contentSection}>
          <Heading style={h1}>Sign in to your account</Heading>
          <Text style={text}>
            Click the button below to securely sign in to EMMA. This link will expire in 24 hours.
          </Text>
          
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            target="_blank"
            style={button}
          >
            Sign in to EMMA
          </Link>

          <Text style={codeLabel}>
            Or use this code to sign in:
          </Text>
          <code style={code}>{token}</code>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            If you didn't request this email, you can safely ignore it.
          </Text>
          <Text style={footerText}>
            © 2024 EMMA Fantasy League
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = {
  backgroundColor: '#0E0F11',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '480px',
}

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logoContainer = {
  display: 'inline-block',
  backgroundColor: '#22C55E',
  borderRadius: '16px',
  padding: '16px',
  marginBottom: '16px',
}

const logoEmoji = {
  fontSize: '32px',
  margin: '0',
  lineHeight: '1',
}

const brandHeading = {
  color: '#22C55E',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
  letterSpacing: '-0.5px',
}

const tagline = {
  color: '#AEB3BA',
  fontSize: '14px',
  margin: '0',
}

const contentSection = {
  backgroundColor: '#1A1C1F',
  borderRadius: '12px',
  border: '1px solid #2A2D31',
  padding: '32px',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#FFFFFF',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const text = {
  color: '#AEB3BA',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px 0',
}

const button = {
  display: 'inline-block',
  backgroundColor: '#22C55E',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 32px',
  borderRadius: '8px',
  marginBottom: '24px',
}

const codeLabel = {
  color: '#7C8289',
  fontSize: '13px',
  margin: '0 0 8px 0',
}

const code = {
  display: 'inline-block',
  backgroundColor: '#0E0F11',
  border: '1px solid #2A2D31',
  borderRadius: '8px',
  padding: '12px 24px',
  color: '#FFFFFF',
  fontSize: '18px',
  fontWeight: '600',
  letterSpacing: '2px',
}

const footer = {
  marginTop: '32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#7C8289',
  fontSize: '12px',
  margin: '0 0 8px 0',
}
