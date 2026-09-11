import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';

async function login(page: Page, email: string, password = 'CalHacks-demo-2026!') {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/auth/sign-in/email')),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
  if (response.status() === 429) {
    // Separate browser accounts still share loopback IP. Honor the real server
    // cooldown rather than disabling production rate limits for the test suite.
    await expect(page.getByRole('status')).toContainText('Too many requests');
    const seconds = Number(
      response.headers()['retry-after'] ?? response.headers()['x-retry-after'],
    );
    expect(seconds).toBeGreaterThan(0);
    await page.waitForTimeout((seconds + 1) * 1000);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await page.waitForURL('**/events');
}
function emailLink(email: string, subject: string) {
  const directory = './data/e2e/outbox';
  return readdirSync(directory)
    .sort()
    .reverse()
    .map((f) => JSON.parse(readFileSync(`${directory}/${f}`, 'utf8')))
    .find((m) => m.to === email && m.subject.includes(subject))?.url as string;
}
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`page content flies between events and login; motion preference: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/events');
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeEnabled();
    const motion = await page.evaluate(async () => {
      const started = performance.now();
      let exit = false,
        entrance = false;
      document.querySelector<HTMLAnchorElement>('a[href="/login"]')!.click();
      while (performance.now() - started < 800) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const main = document.querySelector('main')!;
        const matrix = new DOMMatrix(getComputedStyle(main).transform);
        exit ||= matrix.m42 < -0.1;
        entrance ||= matrix.m41 < -0.1;
      }
      return { exit, entrance };
    });
    expect(motion).toEqual({
      exit: reducedMotion === 'no-preference',
      entrance: reducedMotion === 'no-preference',
    });
    await expect(page.getByRole('heading', { name: 'Log In to Cal Hacks' })).toBeVisible();
  });
}
test('Storke typography, theme persistence, and responsive auth layout', async ({ page }) => {
  await page.goto('/register');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(
    'Source Serif 4',
  );
  await expect(page.getByLabel('First name')).toBeEnabled();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.auth-art')).toBeHidden();
});
test('loopback visits use the auth origin and slow navigation shows the loading bar', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:5174/login');
  await expect(page).toHaveURL('http://localhost:5174/login');
  await expect(page.getByLabel('Email address')).toBeEnabled();
  await page.getByLabel('Email address').fill('unfinished@example.com');
  const marker = './data/e2e/outbox/watch-regression.json';
  try {
    writeFileSync(marker, JSON.stringify({ message: 'A runtime write must not reload the form.' }));
    await page.waitForTimeout(750);
    await expect(page.getByLabel('Email address')).toHaveValue('unfinished@example.com');
  } finally {
    rmSync(marker, { force: true });
  }
  await page.getByRole('link', { name: 'Colmena', exact: true }).click();
  await page.waitForURL('**/events');
  await page.route('**/__data.json*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.getByRole('link', { name: 'Explore event ↗', exact: true }).first().click();
  await expect(page.getByRole('progressbar', { name: 'Loading page' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Loading page' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
});
test('registration, local verification, two forms, organizer review, gated waitlist and promotion', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const applicant = await context.newPage();
  const email = `browser-${Date.now()}@example.com`,
    name = `Browser Builder ${Date.now()}`;
  await applicant.goto('/register');
  await applicant.getByLabel('First name').fill('Browser');
  await applicant.getByLabel('Last name').fill(name.slice('Browser '.length));
  await applicant.getByLabel('Email address').fill(email);
  await applicant.getByLabel('Password', { exact: true }).fill('Browser-demo-password!');
  await applicant.getByRole('button', { name: 'Create account' }).click();
  await applicant.waitForURL('**/events');
  const verify = emailLink(email, 'Verify');
  expect(verify).toBeTruthy();
  await applicant.goto(verify);
  await applicant.waitForURL('**/events');
  await applicant.goto('/events/cal-hacks-fall/applications/hacker');
  await applicant.getByLabel('School or organization').fill('Browser University');
  await applicant
    .getByLabel('A short introduction')
    .fill('I am here to learn and build alongside others.');
  await applicant
    .getByLabel('What are you curious about?')
    .fill('Accessible software for community gardens.');
  await applicant
    .getByLabel('Tell us about something you tried')
    .fill('A small sensor experiment with friends.');
  await applicant
    .getByLabel('What would you like to build or learn?')
    .fill('Learn to design a welcoming interface.');
  await applicant.getByLabel('Resume PDF (optional)').setInputFiles('tests/fixtures/resume.pdf');
  await applicant.getByRole('button', { name: 'Save draft' }).click();
  await expect(applicant.getByRole('status')).toContainText('saved');
  await expect(applicant.getByTitle('Your resume PDF')).toBeVisible();
  const resumeUrl = await applicant
    .getByRole('link', { name: 'Open resume PDF' })
    .getAttribute('href');
  const resumeResponse = await applicant.request.get(resumeUrl!);
  expect(resumeResponse.status()).toBe(200);
  expect(await resumeResponse.body()).toEqual(readFileSync('tests/fixtures/resume.pdf'));
  await applicant.reload();
  await expect(applicant.getByLabel('School or organization')).toHaveValue('Browser University');
  await applicant.getByRole('button', { name: 'Submit application' }).click();
  await expect(applicant.getByText('Your submitted answers are locked')).toBeVisible();
  await applicant.goto('/events/cal-hacks-fall/applications/mentor');
  await applicant.getByLabel('School or organization').fill('Browser University');
  await applicant.getByLabel('A short introduction').fill('I also enjoy teaching.');
  await applicant.getByLabel('Where can you help?').fill('Web applications and design.');
  await applicant
    .getByLabel('How do you help someone get unstuck?')
    .fill('Ask questions and break the problem down together.');
  await applicant.getByLabel('When can you join us?').fill('Saturday afternoon Pacific time.');
  await applicant.getByRole('button', { name: 'Submit application' }).click();
  await expect(applicant.getByText('Your submitted answers are locked')).toBeVisible();

  const reviewerContext = await browser.newContext();
  const reviewer = await reviewerContext.newPage();
  await login(reviewer, 'reviewer@example.com');
  await reviewer.goto(`/organizer/cal-hacks-fall?search=${encodeURIComponent(email)}&type=hacker`);
  await reviewer.getByRole('link', { name, exact: true }).click();
  await expect(reviewer.getByTitle('Applicant resume PDF')).toBeVisible();
  expect((await reviewer.request.get(resumeUrl!)).status()).toBe(200);
  expect(
    (await reviewer.request.get(resumeUrl!.replace('cal-hacks-fall', 'cal-hacks-spring'))).status(),
  ).toBe(404);
  await reviewer.waitForURL('**/applications/*');
  const reviewURL = reviewer.url();
  await reviewer.getByRole('button', { name: 'Claim application', exact: true }).click();
  for (const criterion of ['Motivation', 'Initiative', 'Collaboration'])
    await reviewer.getByLabel(criterion, { exact: true }).selectOption('4');
  await reviewer.getByLabel('Internal notes').fill('Private browser-test note.');
  await reviewer.getByRole('button', { name: 'Complete review', exact: true }).click();
  await expect(reviewer.getByText('Completed · 12 / 15')).toBeVisible();

  const managerContext = await browser.newContext();
  const manager = await managerContext.newPage();
  await login(manager, 'manager@example.com');
  await manager.goto(reviewURL);
  await manager.getByLabel('Decision', { exact: true }).selectOption('waitlisted');
  await manager.getByRole('button', { name: 'Prepare decision', exact: true }).click();
  await applicant.goto('/events/cal-hacks-fall/applications/hacker');
  await expect(applicant.locator('.badge').filter({ hasText: /^submitted$/ })).toBeVisible();
  expect(await applicant.content()).not.toContain('Private browser-test note');
  await manager.goto('/organizer/cal-hacks-fall/releases');
  await manager.getByRole('checkbox', { name: `Release decision for ${name}, hacker` }).check();
  await manager.getByRole('button', { name: 'Create release preview' }).click();
  await manager.getByRole('button', { name: 'Publish 1 decisions' }).click();
  await expect(manager.getByText('Applicants can now see these decisions.')).toBeVisible();
  await applicant.reload();
  await expect(applicant.getByText('You’re on the waitlist.')).toBeVisible();
  await manager.goto(reviewURL);
  await manager.getByLabel('Decision', { exact: true }).selectOption('accepted');
  await manager.getByLabel('Reason', { exact: true }).fill('A place has become available.');
  await manager.getByRole('button', { name: 'Prepare decision', exact: true }).click();
  await applicant.reload();
  await expect(applicant.getByText('You’re on the waitlist.')).toBeVisible();
  await manager.goto('/organizer/cal-hacks-fall/releases');
  await manager.getByRole('checkbox', { name: `Release decision for ${name}, hacker` }).check();
  await manager.getByRole('button', { name: 'Create release preview' }).click();
  await manager.getByRole('button', { name: 'Publish 1 decisions' }).click();
  await applicant.reload();
  await expect(applicant.getByText('You’re accepted as a hacker!')).toBeVisible();
  await applicant.goto('/events/cal-hacks-fall/applications/mentor');
  await expect(applicant.locator('.badge').filter({ hasText: /^submitted$/ })).toBeVisible();
  await context.close();
  await reviewerContext.close();
  await managerContext.close();
});

test('mobile event directory and private organizer boundaries', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Upcoming events' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/events-mobile.png', fullPage: true });
  await login(page, 'applicant@example.com');
  await page.goto('/organizer/cal-hacks-fall');
  await expect(page.getByText('Event organizer access required.')).toBeVisible();
});

test('password reset through local outbox', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `reset-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('First name').fill('Reset');
  await page.getByLabel('Last name').fill('Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Original-demo-password!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/events');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/login');
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If that account exists');
  await page.goto(emailLink(email, 'Reset'));
  await page.getByLabel('Password', { exact: true }).fill('Changed-demo-password!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toContainText('Password updated');
  await login(page, email, 'Changed-demo-password!');
  await context.close();
});

test('a stale browser tab preserves its input without overwriting the saved draft', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  await login(first, 'applicant@example.com');
  const url = '/events/cal-hacks-spring/applications/hacker';
  await first.goto(url);
  await second.goto(url);
  await first.getByLabel('School or organization').fill('Saved by first tab');
  await second.getByLabel('School or organization').fill('Unsaved second tab');
  await first.getByRole('button', { name: 'Save draft' }).click();
  await expect(first.getByRole('status')).toContainText('saved');
  await second.getByRole('button', { name: 'Save draft' }).click();
  await expect(second.getByRole('alert')).toContainText('another tab');
  await expect(second.getByLabel('School or organization')).toHaveValue('Unsaved second tab');
  await first.reload();
  await expect(first.getByLabel('School or organization')).toHaveValue('Saved by first tab');
  await context.close();
});

test('organizers create and publish a new event, offer both types, and assign a reviewer', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, 'manager@example.com');
  await page.goto('/organizer');
  await expect(page.getByLabel('Event name', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create event', exact: true }).click();
  const slug = `browser-event-${Date.now()}`;
  await page.getByLabel('Event name', { exact: true }).fill('Browser community weekend');
  await page.getByLabel('URL slug').fill(slug);
  await page
    .getByLabel('Description', { exact: true })
    .fill('A hypothetical event created entirely through the organizer interface.');
  await page.getByLabel('Venue', { exact: true }).fill('Berkeley · Synthetic venue');
  const now = Date.now(),
    day = 86_400_000;
  for (const [label, timestamp] of [
    ['Applications open', now - day],
    ['Applications close', now + day],
    ['Event starts', now + 2 * day],
    ['Event ends', now + 3 * day],
  ] as const)
    await page.getByLabel(label, { exact: true }).fill(new Date(timestamp).toISOString());
  await page.getByLabel('Initial manager email').fill('manager@example.com');
  await page.getByRole('button', { name: 'Create draft event' }).click();
  await page.waitForURL(`**/${slug}/settings`);
  await page.getByRole('checkbox', { name: 'hacker', exact: true }).check();
  await page.getByRole('checkbox', { name: 'mentor', exact: true }).check();
  await page.getByLabel('Event lifecycle').selectOption('published');
  await page.getByRole('button', { name: 'Save event' }).click();
  await expect(page.getByRole('status')).toContainText('saved');
  await page.getByLabel('Existing account email').fill('reviewer@example.com');
  await page.getByRole('button', { name: 'Update membership' }).click();
  await expect(page.getByRole('cell', { name: 'reviewer@example.com', exact: true })).toBeVisible();
  await page.goto(`/events/${slug}`);
  await expect(page.getByRole('heading', { name: 'Hacker', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mentor', exact: true })).toBeVisible();
  const reviewerContext = await browser.newContext();
  const reviewer = await reviewerContext.newPage();
  await login(reviewer, 'reviewer@example.com');
  await reviewer.goto(`/organizer/${slug}`);
  await expect(reviewer.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
  await reviewer.goto(`/organizer/${slug}/settings`);
  await expect(reviewer.locator('main')).toContainText('permission');
  await context.close();
  await reviewerContext.close();
});

test('public header stays in content flow and the banner spans the dated timeline', async ({
  page,
}) => {
  await page.goto('/events');
  await expect(page.locator('main > header').getByRole('link', { name: 'Colmena' })).toBeVisible();
  const main = await page.locator('main').boundingBox();
  expect(main!.width).toBeLessThanOrEqual(816);
  await page.getByRole('link', { name: 'Explore event' }).first().click();
  for (const title of ['Decisions released', 'Check in', 'Opening Ceremony']) {
    const step = page
      .locator('.timeline li')
      .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(step.locator('time')).toHaveAttribute('datetime', /T/);
  }
  await page.waitForTimeout(350);
  const poster = await page.locator('.event-poster').boundingBox();
  const timeline = await page.locator('.timeline').boundingBox();
  expect(poster!.y).toBeLessThan(timeline!.y);
  expect(poster!.y + poster!.height).toBeGreaterThanOrEqual(timeline!.y + timeline!.height);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobilePoster = await page.locator('.event-poster').boundingBox();
  const mobileTimeline = await page.locator('.timeline').boundingBox();
  expect(mobilePoster!.y + mobilePoster!.height).toBeLessThan(mobileTimeline!.y);
});

test('organizer analytics, reviewer leaderboard, exports, and aligned filters', async ({
  page,
}) => {
  await login(page, 'manager@example.com');
  await page.goto('/organizer/cal-hacks-fall');
  const field = await page.getByRole('textbox', { name: 'Search', exact: true }).boundingBox();
  const button = await page.getByRole('button', { name: 'Filter', exact: true }).boundingBox();
  expect(Math.abs(field!.y + field!.height - button!.y - button!.height)).toBeLessThan(2);
  await page.getByRole('link', { name: 'Application analytics', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Application analytics', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('list', { name: 'Published statuses' })).toBeVisible();
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reviewer leaderboard' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Riley Reviewer', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Data warehouse', exact: true }).click();
  const response = await page.request.get(
    '/organizer/cal-hacks-fall/data-warehouse/applications?format=json',
  );
  expect(response.status()).toBe(200);
  const records = await response.json();
  expect(records.length).toBeGreaterThan(0);
  expect(records[0]).toHaveProperty('resumeFilename');
  expect(records[0]).not.toHaveProperty('password');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export CSV', exact: true }).first().click();
  expect((await download).suggestedFilename()).toBe('participants.csv');
});

test('application card titles stay aligned when only one has a decision badge', async ({
  page,
}) => {
  await login(page, 'applicant@example.com');
  await page.goto('/events/cal-hacks-fall');
  const titles = await page.locator('.application-card h2').all();
  const first = await titles[0].boundingBox(),
    second = await titles[1].boundingBox();
  expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
  await expect(
    page.locator('.application-card').first().getByText('waitlisted', { exact: true }),
  ).toBeVisible();
});

test('sidebar picks an event and keeps destinations scoped when switching', async ({ page }) => {
  await login(page, 'manager@example.com');
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await nav.getByRole('link', { name: 'Application analytics', exact: true }).click();
  await expect(page).toHaveURL(/select-event\?for=analytics/);
  await page.getByRole('link', { name: 'Select Cal Hacks 12.0', exact: false }).click();
  await expect(page).toHaveURL(/organizer\/cal-hacks-fall\/analytics$/);
  await expect(
    nav.getByRole('link', { name: 'Application analytics', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('navigation', { name: 'Event organizer navigation' })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Change event', exact: true }).click();
  await page.getByRole('link', { name: 'Select UC Berkeley AI Hackathon', exact: false }).click();
  await expect(page).toHaveURL(/organizer\/cal-hacks-spring\/analytics$/);
  await nav.getByRole('link', { name: 'My applications', exact: true }).click();
  await expect(page).toHaveURL(/events\/cal-hacks-spring\/applications$/);
  await expect(page.getByRole('heading', { name: 'Hacker', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mentor', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await nav.getByRole('link', { name: 'Applications', exact: true }).click();
  await expect(page).toHaveURL(/organizer\/cal-hacks-spring$/);
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeVisible();
});

test('applicant sidebar does not expose organizer sections or arbitrary picker redirects', async ({
  page,
}) => {
  await login(page, 'applicant@example.com');
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await expect(nav.getByRole('link', { name: 'Application analytics', exact: true })).toHaveCount(
    0,
  );
  await nav.getByRole('link', { name: 'My applications', exact: true }).click();
  await page.getByRole('link', { name: 'Select Cal Hacks 12.0', exact: false }).click();
  await expect(page).toHaveURL(/events\/cal-hacks-fall\/applications$/);
  await expect(page.getByRole('link', { name: 'View application' })).toBeVisible();
  await page.goto('/select-event?for=analytics');
  await expect(page.getByText('No events are available for this section.')).toBeVisible();
  const invalid = await page.goto('/select-event?for=https://example.com');
  expect(invalid?.status()).toBe(400);
});
