const fs = require('fs').promises;

class ReviewSentimentAnalyzer {
  constructor() {
    // Keywords for sentiment analysis
    this.positiveKeywords = [
      'excellent', 'amazing', 'wonderful', 'fantastic', 'great', 'love', 'loved',
      'perfect', 'best', 'outstanding', 'awesome', 'beautiful', 'delicious',
      'friendly', 'helpful', 'clean', 'recommended', 'worth', 'good', 'nice',
      'enjoyed', 'impressive', 'satisfied', 'happy', 'pleasant', 'comfortable',
      'professional', 'quality', 'fresh', 'tasty', 'quick', 'fast', 'efficient'
    ];
    
    this.negativeKeywords = [
      'bad', 'worst', 'terrible', 'horrible', 'awful', 'disappointing', 'disappointed',
      'poor', 'slow', 'cold', 'rude', 'dirty', 'expensive', 'overpriced', 'waste',
      'never', 'avoid', 'hate', 'hated', 'disgusting', 'unacceptable', 'pathetic',
      'unprofessional', 'unhelpful', 'long wait', 'not worth', 'mediocre', 'bland',
      'stale', 'uncomfortable', 'noisy', 'crowded', 'unfriendly', 'incompetent'
    ];
  }

  // Analyze sentiment of a single review
  analyzeSentiment(review) {
    const text = review.reviewText.toLowerCase();
    const rating = review.rating;
    
    // Count positive and negative keywords
    let positiveCount = 0;
    let negativeCount = 0;
    
    this.positiveKeywords.forEach(keyword => {
      if (text.includes(keyword)) positiveCount++;
    });
    
    this.negativeKeywords.forEach(keyword => {
      if (text.includes(keyword)) negativeCount++;
    });
    
    // Determine sentiment based on keywords and rating
    let sentiment = 'Neutral';
    
    // Rating-based initial classification
    if (rating >= 4) {
      sentiment = 'Positive';
    } else if (rating <= 2) {
      sentiment = 'Negative';
    } else {
      sentiment = 'Neutral';
    }
    
    // Adjust based on keyword analysis
    if (positiveCount > negativeCount * 2) {
      sentiment = 'Positive';
    } else if (negativeCount > positiveCount * 2) {
      sentiment = 'Negative';
    } else if (rating === 3 && positiveCount === negativeCount) {
      sentiment = 'Neutral';
    }
    
    return {
      sentiment,
      positiveKeywords: positiveCount,
      negativeKeywords: negativeCount
    };
  }

  // Extract themes from reviews
  extractThemes(reviews) {
    const themes = {
      positive: {},
      negative: {}
    };
    
    // Common theme patterns
    const themePatterns = {
      service: /\b(service|staff|employee|waiter|waitress|server|helpful|friendly|rude|attentive)\b/i,
      food: /\b(food|meal|dish|taste|flavor|delicious|fresh|cold|stale|quality|portion)\b/i,
      atmosphere: /\b(atmosphere|ambience|decor|music|noise|comfortable|cozy|crowded|clean|dirty)\b/i,
      price: /\b(price|expensive|cheap|value|worth|overpriced|affordable|cost|money)\b/i,
      wait: /\b(wait|slow|fast|quick|time|long|delay|prompt|efficient)\b/i,
      location: /\b(location|parking|access|convenient|far|near|easy to find)\b/i,
      overall: /\b(experience|visit|recommend|return|again|never|definitely)\b/i
    };
    
    reviews.forEach(review => {
      const text = review.reviewText.toLowerCase();
      const sentiment = review.analyzedSentiment;
      
      Object.entries(themePatterns).forEach(([theme, pattern]) => {
        if (pattern.test(text)) {
          if (sentiment === 'Positive') {
            themes.positive[theme] = (themes.positive[theme] || 0) + 1;
          } else if (sentiment === 'Negative') {
            themes.negative[theme] = (themes.negative[theme] || 0) + 1;
          }
        }
      });
    });
    
    return themes;
  }

  // Generate summary points
  generateSummary(reviews, themes) {
    const summaryPoints = [];
    
    // Sort themes by frequency
    const positiveThemes = Object.entries(themes.positive)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    const negativeThemes = Object.entries(themes.negative)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // Generate positive summary points
    if (positiveThemes.length > 0) {
      const topPositive = positiveThemes[0][0];
      const count = positiveThemes[0][1];
      summaryPoints.push(`✅ ${count} reviewers praised the ${topPositive}`);
    }
    
    // Generate negative summary points
    if (negativeThemes.length > 0) {
      const topNegative = negativeThemes[0][0];
      const count = negativeThemes[0][1];
      summaryPoints.push(`❌ ${count} reviewers complained about the ${topNegative}`);
    }
    
    // Add rating-based summary
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    summaryPoints.push(`⭐ Average rating: ${avgRating.toFixed(1)} out of 5 stars`);
    
    // Add recommendation summary
    const positivePercentage = (reviews.filter(r => r.analyzedSentiment === 'Positive').length / reviews.length * 100);
    if (positivePercentage >= 70) {
      summaryPoints.push(`👍 ${positivePercentage.toFixed(0)}% positive sentiment - Highly recommended`);
    } else if (positivePercentage >= 50) {
      summaryPoints.push(`👌 ${positivePercentage.toFixed(0)}% positive sentiment - Generally good reviews`);
    } else {
      summaryPoints.push(`⚠️ ${positivePercentage.toFixed(0)}% positive sentiment - Mixed reviews`);
    }
    
    return summaryPoints;
  }

  // Main analysis function
  async analyzeReviews(inputFile = 'reviews.json') {
    try {
      // Read the reviews from file
      const reviewsData = await fs.readFile(inputFile, 'utf8');
      const reviews = JSON.parse(reviewsData);
      
      console.log(`\n📊 Analyzing ${reviews.length} reviews...\n`);
      
      // Analyze each review
      const analyzedReviews = reviews.map(review => {
        const analysis = this.analyzeSentiment(review);
        return {
          ...review,
          analyzedSentiment: analysis.sentiment,
          positiveKeywords: analysis.positiveKeywords,
          negativeKeywords: analysis.negativeKeywords
        };
      });
      
      // Count sentiments
      const sentimentCounts = {
        Positive: 0,
        Neutral: 0,
        Negative: 0
      };
      
      analyzedReviews.forEach(review => {
        sentimentCounts[review.analyzedSentiment]++;
      });
      
      // Extract themes
      const themes = this.extractThemes(analyzedReviews);
      
      // Generate summary
      const summaryPoints = this.generateSummary(analyzedReviews, themes);
      
      // Create analysis report
      const analysisReport = {
        totalReviews: reviews.length,
        sentimentCounts,
        sentimentPercentages: {
          Positive: ((sentimentCounts.Positive / reviews.length) * 100).toFixed(1) + '%',
          Neutral: ((sentimentCounts.Neutral / reviews.length) * 100).toFixed(1) + '%',
          Negative: ((sentimentCounts.Negative / reviews.length) * 100).toFixed(1) + '%'
        },
        averageRating: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
        themes,
        summaryPoints,
        analyzedReviews
      };
      
      // Save analysis report
      await fs.writeFile('sentiment_analysis.json', JSON.stringify(analysisReport, null, 2));
      
      // Print results
      console.log('=== SENTIMENT ANALYSIS RESULTS ===\n');
      
      console.log('📈 Sentiment Distribution:');
      console.log(`   Positive: ${sentimentCounts.Positive} reviews (${analysisReport.sentimentPercentages.Positive})`);
      console.log(`   Neutral:  ${sentimentCounts.Neutral} reviews (${analysisReport.sentimentPercentages.Neutral})`);
      console.log(`   Negative: ${sentimentCounts.Negative} reviews (${analysisReport.sentimentPercentages.Negative})`);
      
      console.log('\n📋 Summary:');
      summaryPoints.forEach(point => console.log(`   ${point}`));
      
      console.log('\n📊 Top Themes:');
      console.log('   Positive mentions:');
      Object.entries(themes.positive)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([theme, count]) => {
          console.log(`     • ${theme}: ${count} mentions`);
        });
      
      console.log('   Negative mentions:');
      Object.entries(themes.negative)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([theme, count]) => {
          console.log(`     • ${theme}: ${count} mentions`);
        });
      
      console.log('\n📝 Sample Reviews by Sentiment:');
      
      // Show sample positive review
      const positiveReview = analyzedReviews.find(r => r.analyzedSentiment === 'Positive');
      if (positiveReview) {
        console.log('\n   POSITIVE Example:');
        console.log(`   "${positiveReview.reviewText.substring(0, 150)}..."`);
        console.log(`   - ${positiveReview.reviewerName}, ${positiveReview.rating} stars`);
      }
      
      // Show sample negative review
      const negativeReview = analyzedReviews.find(r => r.analyzedSentiment === 'Negative');
      if (negativeReview) {
        console.log('\n   NEGATIVE Example:');
        console.log(`   "${negativeReview.reviewText.substring(0, 150)}..."`);
        console.log(`   - ${negativeReview.reviewerName}, ${negativeReview.rating} stars`);
      }
      
      console.log('\n✅ Analysis complete! Full report saved to sentiment_analysis.json\n');
      
      return analysisReport;
      
    } catch (error) {
      console.error('Error analyzing reviews:', error);
      throw error;
    }
  }
}

// Example usage with custom reviews
async function analyzeCustomReviews() {
  const analyzer = new ReviewSentimentAnalyzer();
  
  // Example: Analyze custom reviews (if you want to test with different data)
  const customReviews = [
    {
      reviewerName: "John Doe",
      rating: 2,
      date: "1 week ago",
      reviewText: "The food was cold and took too long. Service was terrible and the staff was rude."
    },
    {
      reviewerName: "Jane Smith",
      rating: 5,
      date: "2 days ago",
      reviewText: "Excellent service and ambience! The food was delicious and fresh. Highly recommend!"
    },
    {
      reviewerName: "Bob Wilson",
      rating: 3,
      date: "1 month ago",
      reviewText: "It was okay. Nothing special but not bad either. Average experience overall."
    }
  ];
  
  // Save custom reviews to test
  // await fs.writeFile('custom_reviews.json', JSON.stringify(customReviews, null, 2));
  // await analyzer.analyzeReviews('custom_reviews.json');
}

// Run the analyzer
(async () => {
  const analyzer = new ReviewSentimentAnalyzer();
  
  try {
    // Analyze reviews from your scraper output
    await analyzer.analyzeReviews('reviews.json');
    
    // Uncomment to test with custom reviews
    // await analyzeCustomReviews();
    
  } catch (error) {
    console.error('Analysis failed:', error);
    console.log('\nMake sure reviews.json exists in the current directory.');
    console.log('Run your Google Maps scraper first to generate reviews.json');
  }
})();