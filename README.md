# YC Founder Scraper

Scraper extracting founders LinkedIn from the YC Startup Directory.

## 🚀 How it works

- **You provide a YC Startup Directory link**
- **The script checks all companies pages extracting company name, company website and founders LinkedIn**
- **Saves all data in CSV file**

## 📋 Prerequisites

- Node.js 18.12+ (recommended: 24.6.0)
- pnpm (or npm)

## 🛠️ Installation

### System Dependencies

Puppeteer requires additional system dependencies to run Chrome/Chromium. Install these based on your operating system.

### Project Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/ismaelmehdid/yc-founder-scraper
   cd yc-founder-scraper
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build the project**
   ```bash
   pnpm build
   ```

## 🎯 Usage

```bash
# Run the scraper with a YC companies URL
node dist/index.js 'https://www.ycombinator.com/companies?batch=Summer%202025&isHiring=true'
```

provide gif here

## 📊 Output

The scraper generates a CSV file (`output/yc_founders.csv`) with the following columns:

- **Company Name**: The name of the YC company
- **Company Website**: The company's website URL
- **Founder Profile**: LinkedIn profile URL of the founder

## 📞 Support

If you encounter any issues or have questions, please add me on LinkedIn: https://www.linkedin.com/in/ismaelmehdid/
