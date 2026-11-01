import { expect, test } from '@playwright/test';

test('read-aloud controls pause, resume, change rate, skip, and clean up on exit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls = { speak: 0, cancel: 0, pause: 0, resume: 0, rate: 1 };
    (window as Window & { __speechCalls?: typeof calls }).__speechCalls = calls;
    class Utterance {
      text: string;
      rate = 1;
      lang = 'en';
      voice = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: Utterance,
    });
    const engine = new EventTarget();
    Object.assign(engine, {
      getVoices: () => [
        {
          voiceURI: 'test-voice',
          name: 'Test voice',
          lang: 'en',
          localService: true,
          default: true,
        },
      ],
      speak: (utterance: Utterance) => {
        calls.speak++;
        calls.rate = utterance.rate;
      },
      cancel: () => {
        calls.cancel++;
      },
      pause: () => {
        calls.pause++;
      },
      resume: () => {
        calls.resume++;
      },
    });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: engine });
  });
  await page.goto('/read/under-a-distant-sun');
  const start = page.getByRole('button', { name: 'Start read aloud', exact: true });
  await expect(start).toBeEnabled({ timeout: 20000 });
  await start.click();
  await page.getByRole('button', { name: 'Pause read aloud', exact: true }).click();
  await page.getByRole('button', { name: 'Resume read aloud', exact: true }).click();
  await page.getByRole('combobox', { name: 'Read-aloud speed', exact: true }).selectOption('1.5');
  await page.getByRole('button', { name: 'Next text segment', exact: true }).click();
  await page.getByRole('button', { name: 'Show text', exact: true }).click();
  await expect(page.locator('.spoken-text')).not.toBeEmpty();
  const before = await page.evaluate(
    () =>
      (
        window as Window & {
          __speechCalls?: { rate: number; cancel: number; pause: number; resume: number };
        }
      ).__speechCalls!,
  );
  expect(before.rate).toBe(1.5);
  expect(before.pause).toBe(1);
  expect(before.resume).toBe(1);
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __speechCalls?: { cancel: number } }).__speechCalls!.cancel,
      ),
    )
    .toBeGreaterThan(before.cancel);
});

test('missing browser speech support has an honest fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
  });
  await page.goto('/read/under-a-distant-sun');
  await expect(page.getByText('Read-aloud isn’t supported in this browser.')).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole('button', { name: 'Start read aloud' })).toBeDisabled();
});
