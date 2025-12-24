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
} from "https://esm.sh/@react-email/components@0.0.12";
import * as React from "https://esm.sh/react@18.3.1";

interface RecoveryEmailProps {
  supabase_url: string;
  redirect_to: string;
  token_hash: string;
}

export const RecoveryEmail = ({
  supabase_url,
  redirect_to,
  token_hash,
}: RecoveryEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Emma password</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Heading style={logoText}>Emma</Heading>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset the password for your Emma account.
            Click the button below to choose a new password.
          </Text>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=recovery&redirect_to=${redirect_to}`}
            target="_blank"
            style={button}
          >
            Reset Password
          </Link>
          <Text style={textMuted}>
            If you didn't request a password reset, you can safely ignore this email.
            Your password will remain unchanged.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} Emma. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default RecoveryEmail;

// Styles
const main = {
  backgroundColor: "#0a0a0a",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const header = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logoText = {
  color: "#c2ff00",
  fontSize: "32px",
  fontWeight: "700",
  margin: "0",
  letterSpacing: "-0.5px",
};

const content = {
  backgroundColor: "#141414",
  borderRadius: "12px",
  padding: "40px 32px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0 0 16px 0",
};

const text = {
  color: "#d4d4d4",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px 0",
};

const textMuted = {
  color: "#737373",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "24px 0 0 0",
};

const button = {
  backgroundColor: "#c2ff00",
  borderRadius: "8px",
  color: "#0a0a0a",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
};

const footer = {
  marginTop: "32px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#525252",
  fontSize: "12px",
  margin: "0",
};
