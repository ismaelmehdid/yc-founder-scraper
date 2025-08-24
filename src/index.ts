import * as dotenv from 'dotenv';
import puppeteer, { Page } from 'puppeteer';
import { autoScroll } from './helpers.js';

dotenv.config({ quiet: true });

type Founder = {
  company: Company;
  linkedinProfile: string;
}

type Company = {
  name: string;
  website: string;
}

async function getCompaniesLinks(root: string, page: Page): Promise<string[]> {
  try {

    // Navigate to the page
    await page.goto(root, { waitUntil: 'networkidle2' });

    // Scroll down to load all content (infinite scroll)
    console.log('Loading all companies...');
    await autoScroll(page);

    // Extract all company links
    const companiesLinks = await page.evaluate(() => {
      // Target the specific company row links
      const companyLinks = Array.from(document.querySelectorAll('a._company_i9oky_355'));

      return companyLinks.map(link => {
        const href = (link as HTMLAnchorElement).getAttribute('href');
        if (href) {
          // Convert relative URLs to absolute URLs
          return href.startsWith('http') ? href : `https://www.ycombinator.com${href}`;
        }
        return null;
      }).filter(Boolean) as string[];
    });

    console.log('Loading done!');

    return companiesLinks;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
}

async function getLinkedinProfiles(page: Page): Promise<string[]> {
  const linkedInLinks = await page.evaluate(() => {
    // Find the "Active Founders" section by looking for the specific text
    let activeFoundersSection: Element | null = null;

    // Look for sections that contain "Active Founders" text
    const sections = document.querySelectorAll('section');
    for (const section of sections) {
      const textContent = section.textContent || '';
      if (textContent.includes('Active Founders')) {
        activeFoundersSection = section;
        break;
      }
    }

    if (!activeFoundersSection) {
      return [];
    }

    // Within the Active Founders section, look for LinkedIn links
    const linkedInAnchors = Array.from(activeFoundersSection.querySelectorAll('a[href*="linkedin.com"]'));

    return linkedInAnchors.map(anchor => {
      const href = (anchor as HTMLAnchorElement).href;
      // Only return LinkedIn URLs (not other social media)
      if (href.includes('linkedin.com/in/')) {
        return href;
      }
      return null;
    }).filter(Boolean) as string[];
  });

  return linkedInLinks;
}

async function getCompanyDetails(page: Page): Promise<Company> {
  try {
    const companyData = await page.evaluate(() => {
      // Extract company name
      const nameElement = document.querySelector('h1.text-3xl.font-bold');
      const name = nameElement ? nameElement.textContent?.trim() : '';

      // Extract website link
      const websiteElement = document.querySelector('.text-linkColor a[href^="http"]');
      const website = websiteElement ? (websiteElement as HTMLAnchorElement).href : '';

      return {
        name: name || '',
        website: website || '',
      };
    });

    return companyData;
  } catch (error) {
    console.error(`Error extracting company details:`, error);
    return {
      name: '',
      website: '',
    };
  }
}

async function getFoundersDetails(companyLinks: string[], page: Page): Promise<Founder[]> {
  const founders: Founder[] = [];
  const totalCompanies = companyLinks.length;
  let skippedCompanies = 0;

  console.log(`Starting to process ${totalCompanies} companies...`);

  for (let i = 0; i < companyLinks.length; i++) {
    const companyLink = companyLinks[i];
    const currentIndex = i + 1;

    const progress = Math.round((currentIndex / totalCompanies) * 100);
    const barLength = 30;
    const filledLength = Math.round((progress / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    process.stdout.write(`\r[${bar}] ${progress}% (${currentIndex}/${totalCompanies}) - Processing company ${currentIndex}`);

    try {
      await page.goto(companyLink, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const companyDetails = await getCompanyDetails(page);
      const linkedinProfiles = await getLinkedinProfiles(page);

      for (const linkedinProfile of linkedinProfiles) {
        founders.push({
          company: companyDetails,
          linkedinProfile: linkedinProfile
        });
      }
    } catch (error) {
      skippedCompanies++;
      console.log(`\n⚠️  Skipped company ${currentIndex} due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      continue;
    }
  }

  console.log('');
  console.log(`✅ All companies processed successfully! Processed: ${founders.length}, Skipped: ${skippedCompanies}`);
  return founders;
}

// Saves founders details to a csv file
async function saveFoundersDetails(foundersDetails: Founder[]) {
  try {
    const fs = await import('fs');
    const path = await import('path');

    // Create CSV content with headers
    const csvHeaders = 'Company Name,Company Website,Founder Profile\n';
    const csvRows = foundersDetails.map(founder =>
      `"${founder.company.name}","${founder.company.website}","${founder.linkedinProfile}"`
    ).join('\n');

    const csvContent = csvHeaders + csvRows;

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write CSV file
    const csvPath = path.join(outputDir, 'yc_founders.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf8');

  } catch (error) {
    console.error('Error saving CSV file:', error);
  }
}

async function scrapeYCFounders(root: string) {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  const page = await browser.newPage();
  try {
    const companiesLinks: string[] = await getCompaniesLinks(root, page);
    console.log('Companies links loaded!', companiesLinks);
    const foundersDetails: Founder[] = await getFoundersDetails(companiesLinks, page);
    saveFoundersDetails(foundersDetails);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  const root = process.argv[2];
  if (!root) {
    console.error('ROOT parameter is required.\nUsage: node dist/index.ts \'https://www.ycombinator.com/companies?batch=Summer%202025&isHiring=true\'');
    return;
  }
  try {
    console.log('Starting to scrape YC Founders...');
    console.log('Root:', root);
    await scrapeYCFounders(root);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();