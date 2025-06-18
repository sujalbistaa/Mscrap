const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');

class EmailAutomation {
  constructor(config) {
    this.config = {
      businessName: config.businessName || 'Your Business',
      senderEmail: config.senderEmail || process.env.SENDER_EMAIL,
      senderPassword: config.senderPassword || process.env.SENDER_PASSWORD,
      recipientEmails: config.recipientEmails || ['manager@yourbusiness.com'],
      ccEmails: config.ccEmails || [],
      emailService: config.emailService || 'gmail', // gmail, outlook, yahoo, custom
      smtpHost: config.smtpHost || null,
      smtpPort: config.smtpPort || 587,
      scheduleTime: config.scheduleTime || '0 9 * * MON', // Every Monday at 9 AM
    };

    this.transporter = null;
  }

  // Initialize email transporter
  async initializeTransporter() {
    let transportConfig;

    if (this.config.emailService === 'gmail') {
      transportConfig = {
        service: 'gmail',
        auth: {
          user: this.config.senderEmail,
          pass: this.config.senderPassword
        }
      };
    } else if (this.config.emailService === 'outlook') {
      transportConfig = {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: this.config.senderEmail,
          pass: this.config.senderPassword
        }
      };
    } else if (this.config.emailService === 'custom') {
      transportConfig = {
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpPort === 465,
        auth: {
          user: this.config.senderEmail,
          pass: this.config.senderPassword
        }
      };
    }

    try {
      this.transporter = nodemailer.createTransport(transportConfig);
      
      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email transporter configured successfully');
      return true;
    } catch (error) {
      console.error('❌ Email configuration error:', error);
      throw error;
    }
  }

  // Get week date range
  getWeekDateRange() {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    };

    return {
      start: formatDate(lastWeek),
      end: formatDate(today),
      weekNumber: this.getWeekNumber(today)
    };
  }

  // Get week number
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Find the most recent report files
  async findReportFiles() {
    const files = await fs.readdir('.');
    const today = new Date().toISOString().split('T')[0];
    
    const reportFiles = {
      markdown: null,
      html: null,
      pdf: null
    };

    // Look for today's reports or most recent
    const markdownFiles = files.filter(f => f.startsWith('weekly_report_') && f.endsWith('.md'));
    const htmlFiles = files.filter(f => f.startsWith('weekly_report_') && f.endsWith('.html'));
    const pdfFiles = files.filter(f => f.startsWith('weekly_report_') && f.endsWith('.pdf'));

    if (markdownFiles.length > 0) {
      reportFiles.markdown = markdownFiles.sort().reverse()[0];
    }
    if (htmlFiles.length > 0) {
      reportFiles.html = htmlFiles.sort().reverse()[0];
    }
    if (pdfFiles.length > 0) {
      reportFiles.pdf = pdfFiles.sort().reverse()[0];
    }

    return reportFiles;
  }

  // Generate email HTML content
  async generateEmailContent(weekRange) {
    try {
      // Try to load sentiment analysis for summary
      const sentimentData = await fs.readFile('sentiment_analysis.json', 'utf8');
      const sentiment = JSON.parse(sentimentData);

      return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
        }
        .metric {
            display: inline-block;
            margin: 10px 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #3498db;
        }
        .metric-label {
            font-size: 14px;
            color: #666;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.config.businessName}</h1>
            <h2>Weekly Review Report</h2>
            <p>${weekRange.start} - ${weekRange.end}</p>
        </div>
        
        <div class="content">
            <h3>📊 Weekly Summary</h3>
            
            <div style="text-align: center; margin: 20px 0;">
                <div class="metric">
                    <div class="metric-value">${sentiment.totalReviews}</div>
                    <div class="metric-label">Total Reviews</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${sentiment.averageRating}⭐</div>
                    <div class="metric-label">Average Rating</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${sentiment.sentimentPercentages.Positive}</div>
                    <div class="metric-label">Positive Sentiment</div>
                </div>
            </div>
            
            <h3>📈 Key Insights</h3>
            <ul>
                ${sentiment.summaryPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
            
            <p style="margin-top: 30px;">
                Please find the detailed weekly report attached to this email. The report includes:
            </p>
            <ul>
                <li>Complete sentiment analysis</li>
                <li>Common themes and feedback patterns</li>
                <li>Individual review responses</li>
                <li>Actionable recommendations</li>
            </ul>
            
            <p style="margin-top: 20px;">
                <strong>Questions?</strong> Reply to this email or contact the analytics team.
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated report generated by the Review Analysis System</p>
            <p>© ${new Date().getFullYear()} ${this.config.businessName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
    } catch (error) {
      // Fallback if sentiment analysis not available
      return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.config.businessName}</h1>
            <h2>Weekly Review Report</h2>
            <p>${weekRange.start} - ${weekRange.end}</p>
        </div>
        <div class="content">
            <p>Please find this week's review analysis report attached.</p>
            <p>The report contains detailed insights about customer feedback, sentiment analysis, and recommendations for improvement.</p>
            <p>If you have any questions, please don't hesitate to reach out.</p>
        </div>
    </div>
</body>
</html>`;
    }
  }

  // Send email
  async sendWeeklyReport() {
    try {
      console.log('📧 Preparing to send weekly report...');

      // Initialize transporter if not already done
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      // Get week date range
      const weekRange = this.getWeekDateRange();

      // Find report files
      const reportFiles = await this.findReportFiles();
      
      if (!reportFiles.markdown && !reportFiles.html && !reportFiles.pdf) {
        throw new Error('No report files found. Please run the report generator first.');
      }

      // Prepare attachments
      const attachments = [];
      
      if (reportFiles.pdf) {
        attachments.push({
          filename: `${this.config.businessName}_Weekly_Report_Week${weekRange.weekNumber}.pdf`,
          path: reportFiles.pdf
        });
      } else if (reportFiles.markdown) {
        attachments.push({
          filename: `${this.config.businessName}_Weekly_Report_Week${weekRange.weekNumber}.md`,
          path: reportFiles.markdown
        });
      }
      
      if (reportFiles.html) {
        attachments.push({
          filename: `${this.config.businessName}_Weekly_Report_Week${weekRange.weekNumber}.html`,
          path: reportFiles.html
        });
      }

      // Generate email content
      const emailContent = await this.generateEmailContent(weekRange);

      // Email options
      const mailOptions = {
        from: `${this.config.businessName} Analytics <${this.config.senderEmail}>`,
        to: this.config.recipientEmails.join(', '),
        cc: this.config.ccEmails.join(', '),
        subject: `${this.config.businessName} - Weekly Review Report (Week ${weekRange.weekNumber}, ${weekRange.end})`,
        html: emailContent,
        attachments: attachments
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', info.messageId);
      console.log('   Recipients:', this.config.recipientEmails.join(', '));
      console.log('   Attachments:', attachments.map(a => a.filename).join(', '));
      
      return info;

    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  // Schedule automated emails
  scheduleWeeklyEmails() {
    console.log(`📅 Scheduling weekly emails: ${this.config.scheduleTime}`);
    
    // Validate cron expression
    if (!cron.validate(this.config.scheduleTime)) {
      console.error('❌ Invalid cron expression:', this.config.scheduleTime);
      return;
    }

    // Schedule the task
    cron.schedule(this.config.scheduleTime, async () => {
      console.log(`\n🔄 Running scheduled email task at ${new Date().toISOString()}`);
      
      try {
        // Run the complete pipeline
        await this.runCompletePipeline();
      } catch (error) {
        console.error('❌ Scheduled task failed:', error);
      }
    });

    console.log('✅ Email automation scheduled successfully');
    console.log('   Next run will be based on cron:', this.config.scheduleTime);
  }

  // Run complete pipeline (scrape, analyze, generate report, send email)
  async runCompletePipeline() {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    console.log('🚀 Running complete review analysis pipeline...\n');

    try {
      // 1. Run scraper
      console.log('1️⃣ Running review scraper...');
      await execPromise('node scraper.js');
      console.log('   ✅ Reviews scraped successfully\n');

      // 2. Run sentiment analysis
      console.log('2️⃣ Running sentiment analysis...');
      await execPromise('node sentiment-analyzer.js');
      console.log('   ✅ Sentiment analysis completed\n');

      // 3. Generate replies
      console.log('3️⃣ Generating reply suggestions...');
      await execPromise('node reply-generator.js');
      console.log('   ✅ Reply suggestions generated\n');

      // 4. Generate report
      console.log('4️⃣ Generating weekly report...');
      await execPromise('node weekly-report.js');
      console.log('   ✅ Weekly report generated\n');

      // 5. Send email
      console.log('5️⃣ Sending email report...');
      await this.sendWeeklyReport();
      
      console.log('\n🎉 Pipeline completed successfully!');

    } catch (error) {
      console.error('❌ Pipeline error:', error);
      throw error;
    }
  }
}

// Configuration
const config = {
  businessName: 'Hyatt Regency Kathmandu', // Change this
  senderEmail: 'your-email@gmail.com', // Change this
  senderPassword: 'your-app-password', // Use app password for Gmail
  recipientEmails: [
    'manager@hotel.com',
    'analytics@hotel.com'
  ],
  ccEmails: ['owner@hotel.com'],
  emailService: 'gmail', // gmail, outlook, custom
  scheduleTime: '0 9 * * MON' // Every Monday at 9 AM
};

// Main execution
(async () => {
  console.log('📧 Email Automation System\n');
  
  const emailer = new EmailAutomation(config);
  
  // Command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === 'test') {
      // Test email sending
      console.log('🧪 Running test email...');
      await emailer.initializeTransporter();
      await emailer.sendWeeklyReport();
      
    } else if (command === 'schedule') {
      // Schedule automated emails
      console.log('⏰ Setting up scheduled emails...');
      await emailer.initializeTransporter();
      emailer.scheduleWeeklyEmails();
      console.log('\n✅ Scheduler is running. Press Ctrl+C to stop.');
      
    } else if (command === 'pipeline') {
      // Run complete pipeline once
      await emailer.runCompletePipeline();
      
    } else {
      // Show usage
      console.log('Usage:');
      console.log('  node email-automation.js test      - Send test email with current reports');
      console.log('  node email-automation.js schedule  - Start scheduled weekly emails');
      console.log('  node email-automation.js pipeline  - Run complete pipeline once');
      console.log('\nConfiguration:');
      console.log('  Edit the config object in the script to set your email credentials');
      console.log('  For Gmail, use an app password: https://support.google.com/accounts/answer/185833');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

// Export for use in other scripts
module.exports = EmailAutomation;