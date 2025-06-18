const fs = require('fs').promises;
const path = require('path');

class WeeklyReportComposer {
  constructor() {
    this.reportDate = new Date();
    this.weekStart = new Date(this.reportDate);
    this.weekStart.setDate(this.weekStart.getDate() - 7);
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  generateTrendEmoji(current, previous) {
    if (current > previous) return '📈';
    if (current < previous) return '📉';
    return '➡️';
  }

  generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    return '⭐'.repeat(fullStars) + (halfStar ? '✨' : '') + '☆'.repeat(emptyStars);
  }

  async loadData() {
    const data = {};
    
    try {
      // Load reviews
      const reviewsContent = await fs.readFile('reviews.json', 'utf8');
      data.reviews = JSON.parse(reviewsContent);
      
      // Load sentiment analysis
      const sentimentContent = await fs.readFile('sentiment_analysis.json', 'utf8');
      data.sentiment = JSON.parse(sentimentContent);
      
      // Load suggested replies
      const repliesContent = await fs.readFile('suggested_replies.json', 'utf8');
      data.replies = JSON.parse(repliesContent);
    } catch (error) {
      console.error('Error loading data files:', error);
      throw new Error('Please ensure all required files exist: reviews.json, sentiment_analysis.json, suggested_replies.json');
    }
    
    return data;
  }

  generateMarkdownReport(data) {
    const { reviews, sentiment, replies } = data;
    
    // Calculate metrics
    const totalReviews = reviews.length;
    const avgRating = parseFloat(sentiment.averageRating);
    const ratingTrend = this.generateTrendEmoji(avgRating, 4.0); // Compare with baseline 4.0
    
    // Generate markdown content
    let markdown = `# 📊 Weekly Review Analysis Report

**Report Period:** ${this.formatDate(this.weekStart)} - ${this.formatDate(this.reportDate)}  
**Generated:** ${this.formatDate(this.reportDate)} at ${new Date().toLocaleTimeString()}

---

## 📈 Executive Summary

| Metric | Value | Trend |
|--------|-------|-------|
| **Total Reviews** | ${totalReviews} | - |
| **Average Rating** | ${avgRating}/5.0 ${this.generateRatingStars(avgRating)} | ${ratingTrend} |
| **Response Rate** | ${((replies.replies.length / totalReviews) * 100).toFixed(0)}% | ✅ |
| **Positive Sentiment** | ${sentiment.sentimentPercentages.Positive} | ${this.generateTrendEmoji(parseFloat(sentiment.sentimentPercentages.Positive), 60)} |

---

## 🎭 Sentiment Analysis

### Distribution Overview

\`\`\`
Positive: ${'█'.repeat(Math.floor(sentiment.sentimentCounts.Positive / totalReviews * 20))} ${sentiment.sentimentCounts.Positive} reviews (${sentiment.sentimentPercentages.Positive})
Neutral:  ${'█'.repeat(Math.floor(sentiment.sentimentCounts.Neutral / totalReviews * 20))} ${sentiment.sentimentCounts.Neutral} reviews (${sentiment.sentimentPercentages.Neutral})
Negative: ${'█'.repeat(Math.floor(sentiment.sentimentCounts.Negative / totalReviews * 20))} ${sentiment.sentimentCounts.Negative} reviews (${sentiment.sentimentPercentages.Negative})
\`\`\`

### Key Insights

`;

    // Add summary points
    sentiment.summaryPoints.forEach(point => {
      markdown += `- ${point}\n`;
    });

    markdown += `\n---\n\n## 💬 Common Themes\n\n`;

    // Positive themes
    markdown += `### 👍 Most Praised Aspects\n\n`;
    const positiveThemes = Object.entries(sentiment.themes.positive)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (positiveThemes.length > 0) {
      markdown += `| Aspect | Mentions | Impact |\n|--------|----------|--------|\n`;
      positiveThemes.forEach(([theme, count]) => {
        const impact = count >= 5 ? 'High' : count >= 3 ? 'Medium' : 'Low';
        const impactEmoji = count >= 5 ? '🔥' : count >= 3 ? '✨' : '💫';
        markdown += `| **${theme.charAt(0).toUpperCase() + theme.slice(1)}** | ${count} | ${impact} ${impactEmoji} |\n`;
      });
    } else {
      markdown += `*No significant positive themes identified*\n`;
    }

    // Negative themes
    markdown += `\n### 👎 Areas for Improvement\n\n`;
    const negativeThemes = Object.entries(sentiment.themes.negative)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (negativeThemes.length > 0) {
      markdown += `| Issue | Mentions | Priority |\n|-------|----------|----------|\n`;
      negativeThemes.forEach(([theme, count]) => {
        const priority = count >= 5 ? 'High' : count >= 3 ? 'Medium' : 'Low';
        const priorityEmoji = count >= 5 ? '🚨' : count >= 3 ? '⚠️' : '📌';
        markdown += `| **${theme.charAt(0).toUpperCase() + theme.slice(1)}** | ${count} | ${priority} ${priorityEmoji} |\n`;
      });
    } else {
      markdown += `*No significant issues identified*\n`;
    }

    // Rating breakdown
    markdown += `\n---\n\n## ⭐ Rating Breakdown\n\n`;
    const ratingCounts = {};
    reviews.forEach(r => {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
    });

    markdown += `| Rating | Count | Percentage | Visual |\n|--------|-------|------------|--------|\n`;
    for (let i = 5; i >= 1; i--) {
      const count = ratingCounts[i] || 0;
      const percentage = ((count / totalReviews) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / totalReviews * 20));
      markdown += `| ${this.generateRatingStars(i)} | ${count} | ${percentage}% | ${bar} |\n`;
    }

    // Sample reviews
    markdown += `\n---\n\n## 📝 Notable Reviews This Week\n\n`;

    // Best review
    const bestReview = reviews.find(r => r.rating === 5) || reviews[0];
    if (bestReview) {
      markdown += `### 🌟 Best Review\n\n`;
      markdown += `> **${bestReview.reviewerName}** (${bestReview.rating} stars) - *${bestReview.date}*\n>\n`;
      markdown += `> "${bestReview.reviewText.substring(0, 200)}${bestReview.reviewText.length > 200 ? '...' : ''}"\n\n`;
    }

    // Most critical review
    const worstReview = reviews.find(r => r.rating <= 2) || reviews[reviews.length - 1];
    if (worstReview && worstReview.rating <= 3) {
      markdown += `### ⚠️ Most Critical Review\n\n`;
      markdown += `> **${worstReview.reviewerName}** (${worstReview.rating} stars) - *${worstReview.date}*\n>\n`;
      markdown += `> "${worstReview.reviewText.substring(0, 200)}${worstReview.reviewText.length > 200 ? '...' : ''}"\n\n`;
    }

    // Action items
    markdown += `---\n\n## 🎯 Recommended Actions\n\n`;

    // Generate action items based on data
    const actions = [];
    
    if (parseFloat(sentiment.sentimentPercentages.Negative) > 30) {
      actions.push('🚨 **High Priority**: Address negative feedback trends immediately');
    }
    
    negativeThemes.slice(0, 3).forEach(([theme, count]) => {
      if (count >= 3) {
        actions.push(`📌 **${theme.charAt(0).toUpperCase() + theme.slice(1)}**: Implement improvements based on ${count} complaints`);
      }
    });
    
    if (sentiment.sentimentCounts.Negative > 0) {
      actions.push('✉️ **Customer Service**: Respond to all negative reviews with personalized messages');
    }
    
    if (avgRating < 4.0) {
      actions.push('📊 **Quality Control**: Conduct internal review of service standards');
    }

    actions.forEach((action, index) => {
      markdown += `${index + 1}. ${action}\n`;
    });

    // Response templates section
    markdown += `\n---\n\n## 💬 Sample Response Templates\n\n`;
    
    // Show 2 sample responses
    const sampleReplies = replies.replies.slice(0, 2);
    sampleReplies.forEach((reply, index) => {
      markdown += `### Response ${index + 1} (${reply.sentiment} Review)\n\n`;
      markdown += `**Original Review:** "${reply.reviewSnippet}"\n\n`;
      markdown += `**English Response:**\n> ${reply.suggestedReply.english}\n\n`;
      markdown += `**Nepali Response:**\n> ${reply.suggestedReply.nepali}\n\n`;
    });

    // Footer
    markdown += `---\n\n## 📊 Historical Comparison\n\n`;
    markdown += `*Note: For accurate week-over-week comparisons, ensure regular data collection.*\n\n`;
    markdown += `| Metric | This Week | Target | Status |\n`;
    markdown += `|--------|-----------|---------|--------|\n`;
    markdown += `| Average Rating | ${avgRating} | 4.5+ | ${avgRating >= 4.5 ? '✅' : avgRating >= 4.0 ? '⚠️' : '❌'} |\n`;
    markdown += `| Positive % | ${sentiment.sentimentPercentages.Positive} | 70%+ | ${parseFloat(sentiment.sentimentPercentages.Positive) >= 70 ? '✅' : '⚠️'} |\n`;
    markdown += `| Response Rate | 100% | 100% | ✅ |\n`;

    markdown += `\n---\n\n`;
    markdown += `*Report generated automatically by Review Analysis System*\n`;
    markdown += `*For questions or customization, contact your administrator*\n`;

    return markdown;
  }

  generateNotionFormat(data) {
    // Notion-specific formatting (can be pasted directly into Notion)
    let notion = `# Weekly Review Report - ${this.formatDate(this.reportDate)}\n\n`;
    
    notion += `/divider\n\n`;
    
    // Callout box for summary
    notion += `> 💡 **Quick Stats**: ${data.reviews.length} reviews analyzed | `;
    notion += `${data.sentiment.averageRating}⭐ average | `;
    notion += `${data.sentiment.sentimentPercentages.Positive} positive\n\n`;
    
    notion += `/divider\n\n`;
    
    // The rest follows similar structure to markdown
    // Notion will auto-format when pasted
    
    return notion;
  }

  async generateReport() {
    try {
      console.log('📊 Generating Weekly Report...\n');
      
      // Load all data
      const data = await this.loadData();
      console.log('✅ Data loaded successfully');
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport(data);
      
      // Save markdown report
      const reportFilename = `weekly_report_${this.reportDate.toISOString().split('T')[0]}.md`;
      await fs.writeFile(reportFilename, markdownReport);
      console.log(`✅ Markdown report saved as: ${reportFilename}`);
      
      // Also save a Notion-friendly version
      const notionReport = this.generateNotionFormat(data);
      const notionFilename = `notion_report_${this.reportDate.toISOString().split('T')[0]}.txt`;
      await fs.writeFile(notionFilename, markdownReport); // Using markdown as it works well in Notion
      console.log(`✅ Notion-compatible report saved as: ${notionFilename}`);
      
      // Create a simple HTML preview
      const htmlReport = this.generateHTMLReport(markdownReport);
      const htmlFilename = `weekly_report_${this.reportDate.toISOString().split('T')[0]}.html`;
      await fs.writeFile(htmlFilename, htmlReport);
      console.log(`✅ HTML preview saved as: ${htmlFilename}`);
      
      // Print summary to console
      console.log('\n📈 Report Summary:');
      console.log(`   Total Reviews: ${data.reviews.length}`);
      console.log(`   Average Rating: ${data.sentiment.averageRating} stars`);
      console.log(`   Sentiment: ${data.sentiment.sentimentPercentages.Positive} positive`);
      console.log(`   Files generated: ${reportFilename}, ${notionFilename}, ${htmlFilename}`);
      
      return {
        markdown: markdownReport,
        filename: reportFilename
      };
      
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  generateHTMLReport(markdown) {
    // Simple HTML wrapper for preview
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Review Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        blockquote {
            border-left: 4px solid #3498db;
            padding-left: 20px;
            margin: 20px 0;
            color: #555;
        }
        code {
            background: #f4f4f4;
            padding: 20px;
            display: block;
            border-radius: 5px;
            margin: 20px 0;
        }
        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        ${this.markdownToHTML(markdown)}
    </div>
</body>
</html>`;
  }

  markdownToHTML(markdown) {
    // Simple markdown to HTML converter
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/g, '<p>')
      .replace(/$/g, '</p>')
      .replace(/\|(.+)\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
      })
      .replace(/<p><tr>/g, '<table><tr>')
      .replace(/<\/tr><\/p>/g, '</tr></table>')
      .replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>')
      .replace(/```([\s\S]*?)```/g, '<code>$1</code>')
      .replace(/---/g, '<hr>');
  }
}

// Run the report generator
(async () => {
  const composer = new WeeklyReportComposer();
  
  try {
    console.log('🚀 Starting Weekly Report Generation...\n');
    
    // Generate the report
    await composer.generateReport();
    
    console.log('\n✨ Report generation complete!');
    console.log('📋 You can now:');
    console.log('   1. View the markdown report in any text editor');
    console.log('   2. Copy and paste into Notion');
    console.log('   3. Open the HTML file in a browser for a preview');
    console.log('   4. Convert to PDF using any markdown-to-PDF tool');
    
  } catch (error) {
    console.error('Failed to generate report:', error);
    console.log('\nPlease ensure you have run:');
    console.log('1. node scraper.js');
    console.log('2. node sentiment-analyzer.js');
    console.log('3. node reply-generator.js');
  }
})();