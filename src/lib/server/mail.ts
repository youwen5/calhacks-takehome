import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { demoEmailVerificationEnabled } from './demo';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export function mailConfig(env = process.env) {
  const mode = env.MAIL_MODE || (env.NODE_ENV === 'production' ? 'ses' : 'outbox');
  if (!['ses', 'outbox', 'disabled'].includes(mode))
    throw new Error('MAIL_MODE must be ses, outbox, or disabled.');
  if (mode === 'disabled' && !demoEmailVerificationEnabled(env))
    throw new Error(
      'MAIL_MODE=disabled requires DEMO_EMAIL_VERIFICATION=true so applicants can submit.',
    );
  if (env.NODE_ENV === 'production' && mode === 'outbox')
    throw new Error(
      'The local outbox is development-only. Use MAIL_MODE=ses or explicit disabled demo mode.',
    );
  if (mode === 'ses' && (!env.AWS_REGION || !env.AWS_SES_FROM))
    throw new Error(
      'Live mail requires AWS_REGION and a verified AWS_SES_FROM. See docs/providers.md.',
    );
  return {
    mode,
    region: env.AWS_REGION,
    from: env.AWS_SES_FROM,
    directory: env.OUTBOX_DIR || './data/outbox',
  };
}
export async function sendAuthEmail(to: string, url: string, kind: 'verify' | 'reset') {
  const config = mailConfig();
  if (config.mode === 'disabled') throw new Error('Email delivery is disabled for this demo.');
  const subject =
    kind === 'verify'
      ? 'Verify your Cal Hacks Portal email'
      : 'Reset your Cal Hacks Portal password';
  const text = `Cal Hacks Portal\n\n${kind === 'verify' ? 'Verify your email to submit applications.' : 'Use the link below to choose a new password.'}\n\n${url}\n\nIf you did not request this, you can ignore this message.`;
  if (config.mode === 'outbox') {
    await mkdir(config.directory, { recursive: true, mode: 0o700 });
    await writeFile(
      join(config.directory, `${Date.now()}-${crypto.randomUUID()}.json`),
      JSON.stringify({ to, subject, text, url }, null, 2),
      { mode: 0o600 },
    );
    return;
  }
  const client = new SESClient({ region: config.region });
  try {
    await client.send(
      new SendEmailCommand({
        Source: config.from!,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' } },
        },
      }),
    );
  } finally {
    client.destroy();
  }
}
