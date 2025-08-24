import { Page } from 'puppeteer';

// Helper function to scroll down and wait for content to load
export async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        // If we've scrolled to the bottom and no new content loaded
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  // Wait a bit more for any final content to load
  await new Promise(resolve => setTimeout(resolve, 2000));
}