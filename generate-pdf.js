const fs = require('fs')
const puppeteer = require('puppeteer')
const markdown = require('markdown-it')()

const markdownContent = fs.readFileSync('./report.md', 'utf8')
const htmlContent = `
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Business Review Report</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          padding: 40px;
          color: #333;
          max-width: 800px;
          margin: auto;
        }
        h1, h2, h3 {
          color: #2c3e50;
        }
        pre {
          background-color: #f4f4f4;
          padding: 10px;
          overflow-x: auto;
        }
        code {
          background-color: #eee;
          padding: 2px 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f8f8f8;
        }
        blockquote {
          font-style: italic;
          color: #555;
          border-left: 4px solid #ccc;
          padding-left: 10px;
          margin-left: 0;
        }
      </style>
    </head>
    <body>
      ${markdown.render(markdownContent)}
    </body>
  </html>
`

async function generatePDF() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
  await page.pdf({
    path: 'Weekly_Business_Review_Report.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  })

  await browser.close()
  console.log('✅ PDF generated: Weekly_Business_Review_Report.pdf')
}

generatePDF()
