import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const mocks = vi.hoisted(() => ({ send: vi.fn(), destroy: vi.fn() }));
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: class {
    send = mocks.send;
    destroy = mocks.destroy;
  },
  SendEmailCommand: class {
    constructor(public input: unknown) {}
  },
}));
import { mailConfig, sendAuthEmail } from '../src/lib/server/mail';
const directories: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  for (const d of directories.splice(0)) rmSync(d, { recursive: true, force: true });
});
describe('email boundaries', () => {
  it('works locally without AWS credentials and restricts outbox file permissions', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('MAIL_MODE', '');
    const d = mkdtempSync(join(tmpdir(), 'calhacks-mail-'));
    directories.push(d);
    vi.stubEnv('OUTBOX_DIR', d);
    await sendAuthEmail(
      'person@example.com',
      'http://localhost:5173/verify?token=synthetic',
      'verify',
    );
    const file = join(d, readdirSync(d)[0]);
    const message = JSON.parse(readFileSync(file, 'utf8'));
    expect(message.to).toBe('person@example.com');
    expect(message.text).toContain('Cal Hacks Portal');
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('rejects development fallback in production and requires live configuration', () => {
    expect(() => mailConfig({ NODE_ENV: 'production', MAIL_MODE: 'outbox' })).toThrow(
      'development-only',
    );
    expect(() => mailConfig({ NODE_ENV: 'production', MAIL_MODE: 'ses' })).toThrow('AWS_REGION');
  });
  it('allows explicit email-free production demos without silently dropping messages', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MAIL_MODE', 'disabled');
    vi.stubEnv('DEMO_EMAIL_VERIFICATION', 'true');
    expect(mailConfig().mode).toBe('disabled');
    await expect(
      sendAuthEmail('person@example.com', 'https://example.test/reset', 'reset'),
    ).rejects.toThrow('disabled');
    expect(mocks.send).not.toHaveBeenCalled();
    expect(() => mailConfig({ NODE_ENV: 'production', MAIL_MODE: 'disabled' })).toThrow(
      'DEMO_EMAIL_VERIFICATION=true',
    );
  });
  it('uses the live provider and propagates failures without making an outbox', async () => {
    vi.stubEnv('MAIL_MODE', 'ses');
    vi.stubEnv('AWS_REGION', 'us-west-2');
    vi.stubEnv('AWS_SES_FROM', 'portal@example.com');
    const d = mkdtempSync(join(tmpdir(), 'calhacks-mail-'));
    directories.push(d);
    vi.stubEnv('OUTBOX_DIR', d);
    mocks.send.mockRejectedValueOnce(new Error('Provider unavailable'));
    await expect(
      sendAuthEmail('person@example.com', 'https://example.com/reset', 'reset'),
    ).rejects.toThrow('Provider unavailable');
    expect(readdirSync(d)).toHaveLength(0);
    expect(mocks.destroy).toHaveBeenCalled();
    mocks.send.mockResolvedValueOnce({ MessageId: 'synthetic' });
    await sendAuthEmail('person@example.com', 'https://example.com/reset', 'reset');
    expect(mocks.send.mock.calls[1][0].input).toMatchObject({
      Source: 'portal@example.com',
      Destination: { ToAddresses: ['person@example.com'] },
    });
  });
});
