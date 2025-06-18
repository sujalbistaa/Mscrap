const fs = require('fs').promises;

class ReviewReplyGenerator {
  constructor() {
    // Response templates based on sentiment and topics
    this.templates = {
      positive: {
        english: [
          "Thank you so much for your wonderful review, {name}! We're thrilled to hear that you had a great experience with us. Your kind words mean a lot to our team, and we look forward to serving you again soon!",
          "Dear {name}, we're delighted to receive your {rating}-star review! It's wonderful to know that {positive_aspect}. We truly appreciate your feedback and can't wait to welcome you back!",
          "Thank you for taking the time to share your positive experience, {name}! We're so happy that you enjoyed {positive_aspect}. Your satisfaction is our top priority!"
        ],
        nepali: [
          "धन्यवाद {name}! तपाईंको राम्रो समीक्षाको लागि हामी आभारी छौं। तपाईंको अनुभव राम्रो भएकोमा हामी खुसी छौं। फेरि भेट्ने आशामा!",
          "प्रिय {name}, तपाईंको {rating}-तारे समीक्षाको लागि धन्यवाद! तपाईंलाई {positive_aspect} मन परेकोमा हामी खुसी छौं। तपाईंलाई फेरि स्वागत गर्न पाउँदा खुसी हुनेछौं!",
          "तपाईंको सकारात्मक अनुभव साझा गर्नुभएकोमा धन्यवाद {name}! हामी खुसी छौं कि तपाईंले {positive_aspect} रमाइलो गर्नुभयो।"
        ]
      },
      negative: {
        english: [
          "Dear {name}, we sincerely apologize for your disappointing experience. Your feedback about {negative_aspect} is very concerning to us. We take this seriously and would like to make things right. Please contact us directly so we can address your concerns properly.",
          "Thank you for your honest feedback, {name}. We're truly sorry that {negative_aspect}. This is not the standard we aim for. We're already working on improvements and would appreciate the opportunity to serve you better next time.",
          "We apologize for falling short of your expectations, {name}. Your concerns about {negative_aspect} have been shared with our management team. We value your feedback as it helps us improve. Please give us another chance to provide you with the excellent service you deserve."
        ],
        nepali: [
          "प्रिय {name}, तपाईंको निराशाजनक अनुभवको लागि हामी साँच्चै माफी चाहन्छौं। {negative_aspect} बारे तपाईंको प्रतिक्रिया हाम्रो लागि चिन्ताको विषय हो। कृपया हामीलाई सम्पर्क गर्नुहोस् ताकि हामी यसलाई सुधार्न सकौं।",
          "तपाईंको इमानदार प्रतिक्रियाको लागि धन्यवाद {name}। {negative_aspect} को लागि हामी साँच्चै दुःखी छौं। हामी सुधारमा काम गरिरहेका छौं र अर्को पटक राम्रो सेवा दिने अवसर पाउने आशा गर्दछौं।",
          "तपाईंको अपेक्षा पूरा गर्न नसकेकोमा माफी चाहन्छौं {name}। {negative_aspect} बारे तपाईंको चिन्तालाई हामीले गम्भीरतापूर्वक लिएका छौं। कृपया हामीलाई अर्को अवसर दिनुहोस्।"
        ]
      },
      neutral: {
        english: [
          "Thank you for your feedback, {name}! We appreciate you taking the time to share your experience. We're always looking for ways to improve, and your insights help us serve our customers better.",
          "Dear {name}, thank you for your {rating}-star review. We value all feedback and are constantly working to enhance our services. We hope to exceed your expectations on your next visit!",
          "We appreciate your honest review, {name}. Your feedback helps us understand what we're doing well and where we can improve. We'd love to welcome you back soon!"
        ],
        nepali: [
          "तपाईंको प्रतिक्रियाको लागि धन्यवाद {name}! तपाईंले आफ्नो अनुभव साझा गर्न समय निकाल्नुभएकोमा हामी आभारी छौं। तपाईंको सुझावले हामीलाई सुधार गर्न मद्दत गर्छ।",
          "प्रिय {name}, तपाईंको {rating}-तारे समीक्षाको लागि धन्यवाद। हामी सबै प्रतिक्रियाको कदर गर्छौं र निरन्तर सुधारमा काम गरिरहेका छौं।",
          "तपाईंको इमानदार समीक्षाको लागि धन्यवाद {name}। तपाईंको प्रतिक्रियाले हामीलाई राम्रो सेवा दिन मद्दत गर्छ। फेरि भेट्ने आशामा!"
        ]
      }
    };

    // Common issues and their responses
    this.issueResponses = {
      wifi: {
        english: "the Wi-Fi connectivity issues",
        nepali: "Wi-Fi कनेक्टिविटी समस्या"
      },
      staff: {
        english: "our staff's behavior",
        nepali: "हाम्रो कर्मचारीको व्यवहार"
      },
      food: {
        english: "the food quality",
        nepali: "खानाको गुणस्तर"
      },
      service: {
        english: "the service",
        nepali: "सेवा"
      },
      cleanliness: {
        english: "the cleanliness standards",
        nepali: "सफाइको मापदण्ड"
      },
      wait: {
        english: "the wait time",
        nepali: "प्रतीक्षा समय"
      },
      price: {
        english: "the pricing concerns",
        nepali: "मूल्य सम्बन्धी चिन्ता"
      }
    };

    // Positive aspects
    this.positiveAspects = {
      english: [
        "our service met your expectations",
        "you enjoyed your experience",
        "everything was to your satisfaction",
        "you had a pleasant visit"
      ],
      nepali: [
        "हाम्रो सेवाले तपाईंको अपेक्षा पूरा गर्यो",
        "तपाईंले आफ्नो अनुभव रमाइलो गर्नुभयो",
        "सबै कुरा तपाईंको सन्तुष्टि अनुसार थियो",
        "तपाईंको भ्रमण रमाइलो थियो"
      ]
    };
  }

  detectIssues(reviewText) {
    const text = reviewText.toLowerCase();
    const issues = [];

    if (text.includes('wifi') || text.includes('wi-fi') || text.includes('internet')) {
      issues.push('wifi');
    }
    if (text.includes('staff') || text.includes('rude') || text.includes('employee') || text.includes('waiter')) {
      issues.push('staff');
    }
    if (text.includes('food') || text.includes('meal') || text.includes('dish') || text.includes('taste')) {
      issues.push('food');
    }
    if (text.includes('service') || text.includes('slow')) {
      issues.push('service');
    }
    if (text.includes('clean') || text.includes('dirty') || text.includes('hygiene')) {
      issues.push('cleanliness');
    }
    if (text.includes('wait') || text.includes('long') || text.includes('time')) {
      issues.push('wait');
    }
    if (text.includes('expensive') || text.includes('price') || text.includes('cost')) {
      issues.push('price');
    }

    return issues;
  }

  generateReply(review, sentiment) {
    const name = review.reviewerName === 'Anonymous' ? 'valued customer' : review.reviewerName;
    const rating = review.rating;
    const issues = this.detectIssues(review.reviewText);
    
    let englishReply, nepaliReply;
    
    // Select appropriate template based on sentiment
    const templates = this.templates[sentiment.toLowerCase()];
    
    if (!templates) {
      return {
        english: "Thank you for your feedback!",
        nepali: "तपाईंको प्रतिक्रियाको लागि धन्यवाद!"
      };
    }

    // Random template selection
    const templateIndex = Math.floor(Math.random() * templates.english.length);
    englishReply = templates.english[templateIndex];
    nepaliReply = templates.nepali[templateIndex];

    // Replace placeholders
    englishReply = englishReply.replace(/{name}/g, name);
    nepaliReply = nepaliReply.replace(/{name}/g, name);
    
    englishReply = englishReply.replace(/{rating}/g, rating);
    nepaliReply = nepaliReply.replace(/{rating}/g, rating);

    // Handle negative aspects
    if (sentiment === 'Negative' && issues.length > 0) {
      const mainIssue = issues[0];
      const issueTextEn = this.issueResponses[mainIssue]?.english || 'the issues you mentioned';
      const issueTextNp = this.issueResponses[mainIssue]?.nepali || 'तपाईंले उल्लेख गर्नुभएका समस्याहरू';
      
      englishReply = englishReply.replace(/{negative_aspect}/g, issueTextEn);
      nepaliReply = nepaliReply.replace(/{negative_aspect}/g, issueTextNp);
    }

    // Handle positive aspects
    if (sentiment === 'Positive') {
      const randomPositiveEn = this.positiveAspects.english[Math.floor(Math.random() * this.positiveAspects.english.length)];
      const randomPositiveNp = this.positiveAspects.nepali[Math.floor(Math.random() * this.positiveAspects.nepali.length)];
      
      englishReply = englishReply.replace(/{positive_aspect}/g, randomPositiveEn);
      nepaliReply = nepaliReply.replace(/{positive_aspect}/g, randomPositiveNp);
    }

    // Add personalization based on specific mentions
    if (review.reviewText.length > 100) {
      if (sentiment === 'Positive') {
        englishReply += " Thank you for the detailed feedback!";
        nepaliReply += " विस्तृत प्रतिक्रियाको लागि धन्यवाद!";
      } else if (sentiment === 'Negative') {
        englishReply += " Your detailed feedback helps us improve.";
        nepaliReply += " तपाईंको विस्तृत प्रतिक्रियाले हामीलाई सुधार गर्न मद्दत गर्छ।";
      }
    }

    return {
      english: englishReply,
      nepali: nepaliReply
    };
  }

  async generateReplies(reviewsFile = 'reviews.json', sentimentFile = 'sentiment_analysis.json') {
    try {
      // Load reviews and sentiment analysis
      const reviewsData = await fs.readFile(reviewsFile, 'utf8');
      const reviews = JSON.parse(reviewsData);
      
      let sentimentData = null;
      try {
        const sentimentContent = await fs.readFile(sentimentFile, 'utf8');
        sentimentData = JSON.parse(sentimentContent);
      } catch (e) {
        console.log('Sentiment analysis file not found. Using basic sentiment detection based on ratings.');
      }

      console.log(`\n📝 Generating replies for ${reviews.length} reviews...\n`);

      const repliesData = [];

      reviews.forEach((review, index) => {
        // Determine sentiment
        let sentiment = 'Neutral';
        
        if (sentimentData && sentimentData.analyzedReviews) {
          // Use sentiment from analysis if available
          const analyzedReview = sentimentData.analyzedReviews.find(
            r => r.reviewerName === review.reviewerName && r.rating === review.rating
          );
          if (analyzedReview) {
            sentiment = analyzedReview.analyzedSentiment;
          }
        } else {
          // Fall back to rating-based sentiment
          if (review.rating >= 4) sentiment = 'Positive';
          else if (review.rating <= 2) sentiment = 'Negative';
          else sentiment = 'Neutral';
        }

        // Generate reply
        const reply = this.generateReply(review, sentiment);
        
        const replyData = {
          reviewIndex: index + 1,
          reviewerName: review.reviewerName,
          rating: review.rating,
          sentiment: sentiment,
          reviewSnippet: review.reviewText.substring(0, 100) + '...',
          suggestedReply: reply
        };

        repliesData.push(replyData);

        // Print to console
        console.log(`--- Review ${index + 1} ---`);
        console.log(`Reviewer: ${review.reviewerName} (${review.rating} stars, ${sentiment})`);
        console.log(`Review: "${review.reviewText.substring(0, 80)}..."`);
        console.log(`\n📌 Suggested Reply (English):`);
        console.log(`"${reply.english}"`);
        console.log(`\n📌 Suggested Reply (Nepali):`);
        console.log(`"${reply.nepali}"`);
        console.log('\n' + '='.repeat(80) + '\n');
      });

      // Save all replies to file
      const outputData = {
        generatedAt: new Date().toISOString(),
        totalReplies: repliesData.length,
        replies: repliesData
      };

      await fs.writeFile('suggested_replies.json', JSON.stringify(outputData, null, 2));
      console.log(`✅ Generated ${repliesData.length} replies and saved to suggested_replies.json`);

      // Summary statistics
      const stats = {
        positive: repliesData.filter(r => r.sentiment === 'Positive').length,
        negative: repliesData.filter(r => r.sentiment === 'Negative').length,
        neutral: repliesData.filter(r => r.sentiment === 'Neutral').length
      };

      console.log('\n📊 Reply Statistics:');
      console.log(`   Positive replies: ${stats.positive}`);
      console.log(`   Negative replies: ${stats.negative}`);
      console.log(`   Neutral replies: ${stats.neutral}`);

      return outputData;

    } catch (error) {
      console.error('Error generating replies:', error);
      throw error;
    }
  }
}

// Example usage for a single review
async function generateSingleReply() {
  const generator = new ReviewReplyGenerator();
  
  // Example review
  const exampleReview = {
    reviewerName: "John Doe",
    rating: 2,
    reviewText: "The Wi-Fi was slow and staff were rude. Food took forever to arrive."
  };
  
  const reply = generator.generateReply(exampleReview, 'Negative');
  
  console.log('\n🔍 Example Single Review Reply:');
  console.log('Review:', exampleReview.reviewText);
  console.log('\nEnglish Reply:', reply.english);
  console.log('\nNepali Reply:', reply.nepali);
}

// Run the generator
(async () => {
  const generator = new ReviewReplyGenerator();
  
  try {
    // Generate replies for all reviews
    await generator.generateReplies();
    
    // Uncomment to see single review example
    // await generateSingleReply();
    
  } catch (error) {
    console.error('Failed to generate replies:', error);
    console.log('\nMake sure reviews.json exists. Run your scraper first!');
  }
})();