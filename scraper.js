const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;

const wait = ms => new Promise(r => setTimeout(r, ms));

class GoogleMapsReviewScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('Launching Chrome with DevTools open...');
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US,en']
    });
    this.page = await this.browser.newPage();

    // Clear cookies and force English headers
    await this.page.deleteCookie(...(await this.page.cookies()));
    await this.page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await this.page.setViewport({ width: 1366, height: 768 });

    console.log('Browser and page ready.');
  }

  async scrapeReviews(maxReviews = 10) {
    // Added &hl=en param to force English UI
    const placeUrl = 'https://www.google.com/maps?q=Hotel+Sujata+Palace,+Durga+Complex+Near+Garima+Bank,+Malangawa,+Nepal&hl=en';

    try {
      console.log('Navigating to place:', placeUrl);
      await this.page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('Page loaded');
      await wait(5000);

      // Click the reviews button with more robust selectors
      const reviewsClicked = await this.page.evaluate(() => {
        const selectors = [
          'button[jsaction="pane.reviewChart.moreReviews"]',   // Most reliable button for reviews
          'button[aria-label*="Reviews"]',                     // English fallback
          'button[aria-label*="समीक्षा"]'                      // Nepali fallback (optional)
        ];

        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            el.click();
            return true;
          }
        }

        // Fallback: try buttons containing review text
        const buttons = document.querySelectorAll('button, div[role="button"]');
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('review') || text.includes('समीक्षा')) {
            btn.click();
            return true;
          }
        }

        return false;
      });

      if (!reviewsClicked) {
        console.log('Could not find reviews button.');
        return [];
      }

      console.log('Waiting for reviews panel to load...');
      // Wait for reviews container
      await this.page.waitForSelector('div[role="region"][tabindex="0"]', { timeout: 10000 });
      await wait(3000);

      // Scroll to load more reviews
      console.log('Scrolling to load more reviews...');
      for (let i = 0; i < 5; i++) {
        await this.page.evaluate(() => {
          const scrollable = document.querySelector('div[role="region"][tabindex="0"]') || 
                             document.querySelector('div[role="dialog"]');
          if (scrollable) {
            scrollable.scrollBy(0, 1000);
          }
        });
        await wait(2000);
      }

      // Extract reviews with deduplication
      const reviews = await this.page.evaluate((max) => {
        const reviewData = [];
        const seenReviews = new Set();

        // Use stable selectors for reviews
        const reviewSelector = 'div[data-review-id], div[role="article"]';
        const reviewElements = Array.from(document.querySelectorAll(reviewSelector));

        for (const el of reviewElements) {
          if (reviewData.length >= max) break;

          try {
            const reviewerName = el.querySelector('.d4r55, .TSUbDb, [class*="author"], [class*="reviewer"]')?.textContent?.trim() || 'Anonymous';

            const ratingAttr = el.querySelector('span[aria-label*="star"], [class*="rating"], [class*="stars"]')?.getAttribute('aria-label') || '';
            const ratingMatch = ratingAttr.match(/(\d+(\.\d+)?)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

            const date = el.querySelector('.rsqaWe, [class*="date"], [class*="time"]')?.textContent?.trim() || 'Unknown';

            const reviewText = el.querySelector('.MyEned, [class*="review-text"], [class*="comment"]')?.textContent?.trim() || '';

            const reviewId = `${reviewerName}-${rating}-${date}-${reviewText.substring(0, 50)}`;

            if (!seenReviews.has(reviewId) && reviewText.length >= 10 && rating > 0) {
              seenReviews.add(reviewId);
              reviewData.push({
                reviewerName,
                rating,
                date,
                reviewText: reviewText.substring(0, 1000)
              });
            }
          } catch (e) {
            // Ignore extraction errors on individual reviews
          }
        }

        return reviewData;
      }, maxReviews);

      console.log(`Extracted ${reviews.length} reviews.`);

      // Save screenshot for debugging
      await this.page.screenshot({ path: 'reviews-screenshot.png', fullPage: true });
      console.log('Saved screenshot to reviews-screenshot.png');

      return reviews;

    } catch (error) {
      console.error('Error during scraping:', error);
      await this.page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed');
    }
  }
}

// Run the scraper
(async () => {
  const scraper = new GoogleMapsReviewScraper();

  try {
    await scraper.init();
    const reviews = await scraper.scrapeReviews(20); // Get 20 reviews

    if (reviews.length > 0) {
      await fs.writeFile('reviews.json', JSON.stringify(reviews, null, 2));
      console.log(`Successfully saved ${reviews.length} reviews to reviews.json`);

      console.log('\nSample reviews:');
      reviews.slice(0, 3).forEach((r, i) => {
        console.log(`\nReview ${i + 1}:`);
        console.log(`Name: ${r.reviewerName}`);
        console.log(`Rating: ${r.rating} stars`);
        console.log(`Date: ${r.date}`);
        console.log(`Text: ${r.reviewText.substring(0, 100)}...`);
      });
    } else {
      console.log('No reviews found. Check screenshots for debugging.');
    }
  } catch (e) {
    console.error('Scraping failed:', e);
  } finally {
    await scraper.close();
  }
})();
