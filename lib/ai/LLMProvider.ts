export interface BusinessData {
  businessName: string;
  businessType: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  brandPreferences: {
    primaryColor: string;
    style: 'modern' | 'classic' | 'minimal' | 'bold' | 'playful';
    features: string[];
  };
  contentRequirements: {
    pages: string[];
    hasLogo: boolean;
    hasImages: boolean;
    additionalInfo?: string;
  };
}

export interface GeneratedWebsite {
  html: string;
  css: string;
  js: string;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    generatedAt: string;
    provider: string;
    generationTime: number;
  };
}

export interface GenerationResult {
  success: boolean;
  website?: GeneratedWebsite;
  error?: string;
  tokensUsed?: number;
  generationTime?: number;
}

export abstract class LLMProvider {
  protected apiKey: string;
  protected providerName: string;

  constructor(apiKey: string, providerName: string) {
    this.apiKey = apiKey;
    this.providerName = providerName;
  }

  abstract generateSite(businessData: BusinessData): Promise<GenerationResult>;

  protected createPrompt(businessData: BusinessData): string {
    const {
      businessName,
      businessType,
      description,
      address,
      phone,
      email,
      brandPreferences,
      contentRequirements,
    } = businessData;

    const styleDescriptions = {
      modern: 'Clean, minimalist design with current trends, subtle animations, and contemporary typography',
      classic: 'Timeless, professional and traditional design with elegant typography and conservative layout',
      minimal: 'Simple, spacious and focused design with lots of white space and essential elements only',
      bold: 'Vibrant colors, strong typography, eye-catching design elements and confident visual hierarchy',
      playful: 'Fun, creative and engaging design with animated elements, bright colors and interactive features',
    };

    const businessTypeInstructions = {
      restaurant: 'Include menu sections, reservation system, food gallery, hours of operation, and location map',
      retail: 'Include product showcases, shopping cart, featured items, customer reviews, and contact information',
      service: 'Include service descriptions, pricing information, booking forms, testimonials, and contact details',
      professional: 'Include professional services, team information, case studies, contact forms, and credentials',
      creative: 'Include portfolio sections, project showcases, creative process, client testimonials, and contact information',
      other: 'Include relevant business information, services offered, contact details, and appropriate sections based on the business type',
    };

    return `You are a professional web developer and designer. Create a complete, responsive website for the following business:

BUSINESS INFORMATION:
- Business Name: ${businessName}
- Business Type: ${businessType}
- Description: ${description}
- Address: ${address}
- Phone: ${phone}
- Email: ${email}
- Website: ${email || 'None'}

BRAND PREFERENCES:
- Primary Color: ${brandPreferences.primaryColor}
- Design Style: ${brandPreferences.style} - ${styleDescriptions[brandPreferences.style]}
- Features to include: ${brandPreferences.features.join(', ')}

CONTENT REQUIREMENTS:
- Pages needed: ${contentRequirements.pages.join(', ')}
- Has Logo: ${contentRequirements.hasLogo ? 'Yes - include logo placeholder' : 'No - create text-based logo'}
- Has Images: ${contentRequirements.hasImages ? 'Yes - include image placeholders' : 'No - use icons and illustrations'}
- Additional Info: ${contentRequirements.additionalInfo || 'None'}

SPECIFIC REQUIREMENTS FOR ${businessType.toUpperCase()} TYPE:
${businessTypeInstructions[businessType as keyof typeof businessTypeInstructions] || businessTypeInstructions.other}

REQUIREMENTS:
1. Generate a complete, responsive single-page or multi-page website
2. Use semantic HTML5 structure
3. Include modern CSS with animations and transitions
4. Add JavaScript for interactivity (forms, animations, etc.)
5. Ensure mobile responsiveness
6. Include proper SEO meta tags
7. Use the primary color (${brandPreferences.primaryColor}) throughout the design
8. Follow the ${brandPreferences.style} design style
9. Include all requested features and pages
10. Add micro-interactions and smooth transitions

RESPONSE FORMAT:
Provide the complete website code in the following JSON format:

{
  "html": "Complete HTML structure with semantic tags, meta tags, and content",
  "css": "Complete CSS with responsive design, animations, and styling",
  "js": "Complete JavaScript for interactivity and functionality",
  "metadata": {
    "title": "Website title",
    "description": "SEO description",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "generatedAt": "timestamp",
    "provider": "${this.providerName}",
    "generationTime": 0
  }
}

The website should be production-ready, fully functional, and impressive. Make it look like a professional web developer created it.`;
  }

  protected parseAIResponse(response: string): GenerationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const websiteData = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!websiteData.html || !websiteData.css || !websiteData.js) {
        throw new Error('Missing required fields in generated website');
      }

      return {
        success: true,
        website: websiteData,
        generationTime: Date.now(),
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse AI response',
      };
    }
  }

  protected generateFallbackWebsite(businessData: BusinessData): GeneratedWebsite {
    const { businessName, description, phone, email, brandPreferences } = businessData;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${businessName}</title>
    <meta name="description" content="${description}">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <div class="logo">${businessName}</div>
            <ul class="nav-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section id="home" class="hero">
            <div class="hero-content">
                <h1>Welcome to ${businessName}</h1>
                <p>${description}</p>
                <button class="cta-button">Get Started</button>
            </div>
        </section>

        <section id="about" class="about">
            <div class="container">
                <h2>About Us</h2>
                <p>${description}</p>
            </div>
        </section>

        <section id="contact" class="contact">
            <div class="container">
                <h2>Contact Us</h2>
                <div class="contact-info">
                    <p><strong>Phone:</strong> ${phone}</p>
                    <p><strong>Email:</strong> ${email}</p>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <p>&copy; 2024 ${businessName}. All rights reserved.</p>
    </footer>

    <script src="script.js"></script>
</body>
</html>`;

    const css = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

header {
    background: ${brandPreferences.primaryColor};
    color: white;
    padding: 1rem 0;
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
}

nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
}

.nav-links {
    display: flex;
    list-style: none;
}

.nav-links li {
    margin-left: 2rem;
}

.nav-links a {
    color: white;
    text-decoration: none;
    transition: opacity 0.3s ease;
}

.nav-links a:hover {
    opacity: 0.8;
}

.hero {
    background: linear-gradient(135deg, ${brandPreferences.primaryColor}, #4a5568);
    color: white;
    padding: 150px 0 100px;
    text-align: center;
}

.hero h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.hero p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.cta-button {
    background: white;
    color: ${brandPreferences.primaryColor};
    padding: 15px 30px;
    border: none;
    border-radius: 5px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.cta-button:hover {
    transform: translateY(-2px);
}

section {
    padding: 80px 0;
}

.about {
    background: #f8f9fa;
}

.about h2, .contact h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 2rem;
    color: ${brandPreferences.primaryColor};
}

.contact-info {
    text-align: center;
    font-size: 1.1rem;
}

footer {
    background: #333;
    color: white;
    text-align: center;
    padding: 2rem 0;
}

@media (max-width: 768px) {
    .nav-links {
        display: none;
    }

    .hero h1 {
        font-size: 2rem;
    }

    .hero p {
        font-size: 1rem;
    }
}`;

    const js = `document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.innerHTML = '☰';
    mobileMenuBtn.className = 'mobile-menu-btn';
    mobileMenuBtn.style.cssText = \`
        display: none;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
    \`;

    const nav = document.querySelector('nav');
    nav.appendChild(mobileMenuBtn);

    const navLinks = document.querySelector('.nav-links');

    mobileMenuBtn.addEventListener('click', function() {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    });

    // Show mobile menu button on small screens
    function checkScreenSize() {
        if (window.innerWidth <= 768) {
            mobileMenuBtn.style.display = 'block';
            navLinks.style.cssText = \`
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: ${brandPreferences.primaryColor};
                flex-direction: column;
                padding: 1rem;
            \`;
        } else {
            mobileMenuBtn.style.display = 'none';
            navLinks.style.cssText = 'display: flex;';
        }
    }

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    // Form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your submission! We will contact you soon.');
            form.reset();
        });
    });

    // Scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
});`;

    return {
      html,
      css,
      js,
      metadata: {
        title: `${businessName} - Professional Website`,
        description,
        keywords: [businessName, businessType, 'professional', 'services'],
        generatedAt: new Date().toISOString(),
        provider: 'fallback',
        generationTime: 0,
      },
    };
  }
}