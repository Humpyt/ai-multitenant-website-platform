'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ChevronLeft, ChevronRight, Building, Palette, FileText, Wand2 } from 'lucide-react';

// Business information schema
const businessInfoSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['restaurant', 'retail', 'service', 'professional', 'creative', 'other']),
  customBusinessType: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Valid email is required'),
  website: z.string().url().optional().or(z.literal('')),
});

// Brand preferences schema
const brandPreferencesSchema = z.object({
  primaryColor: z.string(),
  style: z.enum(['modern', 'classic', 'minimal', 'bold', 'playful']),
  features: z.array(z.string()).min(1, 'Select at least one feature'),
});

// Content requirements schema
const contentRequirementsSchema = z.object({
  pages: z.array(z.string()).min(1, 'Select at least one page'),
  hasLogo: z.boolean(),
  hasImages: z.boolean(),
  additionalInfo: z.string().optional(),
});

// LLM provider schema
const llmProviderSchema = z.object({
  provider: z.enum(['deepseek', 'kimik2', 'qwen', 'zai']),
});

const onboardingSchema = z.object({
  businessInfo: businessInfoSchema,
  brandPreferences: brandPreferencesSchema,
  contentRequirements: contentRequirementsSchema,
  llmProvider: llmProviderSchema,
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant/Food Service' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'service', label: 'Service Business' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'creative', label: 'Creative/Design' },
  { value: 'other', label: 'Other' },
];

const STYLE_OPTIONS = [
  { value: 'modern', label: 'Modern', description: 'Clean, minimalist design with current trends' },
  { value: 'classic', label: 'Classic', description: 'Timeless, professional and traditional' },
  { value: 'minimal', label: 'Minimal', description: 'Simple, spacious and focused' },
  { value: 'bold', label: 'Bold', description: 'Vibrant colors and strong typography' },
  { value: 'playful', label: 'Playful', description: 'Fun, creative and engaging' },
];

const WEBSITE_FEATURES = [
  'Contact Form',
  'Photo Gallery',
  'Menu/Services',
  'Testimonials',
  'Blog',
  'Social Media Links',
  'Location Map',
  'Online Booking',
  'E-commerce',
  'Newsletter Signup',
];

const WEBSITE_PAGES = [
  'Home',
  'About Us',
  'Services/Products',
  'Gallery',
  'Contact',
  'Blog',
  'Testimonials',
  'FAQ',
];

const LLM_PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek', description: 'Advanced AI with excellent business understanding' },
  { value: 'kimik2', label: 'KimiK2', description: 'Creative content generation specialist' },
  { value: 'qwen', label: 'Qwen', description: 'Balanced approach for business websites' },
  { value: 'zai', label: 'Z.ai', description: 'Lightning-fast generation and optimization' },
];

const STEPS = [
  { id: 'business', title: 'Business Info', icon: Building },
  { id: 'branding', title: 'Brand Style', icon: Palette },
  { id: 'content', title: 'Content', icon: FileText },
  { id: 'ai', title: 'AI Provider', icon: Wand2 },
];

export default function BusinessSetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessInfo: {
        businessType: 'service',
        website: '',
      },
      brandPreferences: {
        primaryColor: '#3B82F6',
        style: 'modern',
        features: [],
      },
      contentRequirements: {
        pages: ['Home', 'About Us', 'Contact'],
        hasLogo: false,
        hasImages: false,
      },
      llmProvider: {
        provider: 'deepseek',
      },
    },
  });

  const currentStepData = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const validateCurrentStep = async () => {
    let isValid = false;

    switch (currentStep) {
      case 0:
        isValid = await form.trigger('businessInfo');
        break;
      case 1:
        isValid = await form.trigger('brandPreferences');
        break;
      case 2:
        isValid = await form.trigger('contentRequirements');
        break;
      case 3:
        isValid = await form.trigger('llmProvider');
        break;
    }

    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();

    if (isValid) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));

      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create tenant');
      }

      const result = await response.json();

      // Redirect to dashboard after successful tenant creation
      window.location.href = `/dashboard?tenant=${result.tenant.id}`;
    } catch (error) {
      console.error('Error creating tenant:', error);
      // Handle error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBusinessInfoStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tell us about your business</h2>
        <p className="text-muted-foreground">Help us understand your business to create the perfect website</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="businessInfo.businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Your business name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessInfo.businessType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BUSINESS_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="businessInfo.description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe what your business does, what makes it unique, and who your customers are"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="businessInfo.address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, City, State" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessInfo.phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="(555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="businessInfo.email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@business.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessInfo.website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Existing Website (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://existing-site.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderBrandPreferencesStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Define your brand style</h2>
        <p className="text-muted-foreground">Choose the look and feel that represents your business</p>
      </div>

      <FormField
        control={form.control}
        name="brandPreferences.primaryColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Primary Brand Color</FormLabel>
            <FormControl>
              <div className="flex items-center space-x-3">
                <Input
                  type="color"
                  className="w-20 h-10 border-2 rounded cursor-pointer"
                  {...field}
                />
                <Input
                  placeholder="#3B82F6"
                  className="flex-1"
                  {...field}
                />
              </div>
            </FormControl>
            <FormDescription>Choose the main color for your website</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="brandPreferences.style"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Website Style</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {STYLE_OPTIONS.map(style => (
                  <FormItem key={style.value} className="space-y-2">
                    <FormLabel className="flex flex-col space-y-2 cursor-pointer rounded-lg border p-4 hover:bg-accent">
                      <FormControl>
                        <RadioGroupItem value={style.value} className="sr-only" />
                      </FormControl>
                      <div className="font-medium">{style.label}</div>
                      <div className="text-sm text-muted-foreground">{style.description}</div>
                    </FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="brandPreferences.features"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Website Features</FormLabel>
            <FormDescription>Select the features you want on your website</FormDescription>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {WEBSITE_FEATURES.map(feature => (
                <FormItem key={feature} className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value?.includes(feature)}
                      onCheckedChange={(checked) => {
                        return checked
                          ? field.onChange([...field.value, feature])
                          : field.onChange(
                              field.value?.filter((value) => value !== feature)
                            );
                      }}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    {feature}
                  </FormLabel>
                </FormItem>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderContentRequirementsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content requirements</h2>
        <p className="text-muted-foreground">Tell us what content and pages you need</p>
      </div>

      <FormField
        control={form.control}
        name="contentRequirements.pages"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Website Pages</FormLabel>
            <FormDescription>Select the pages you want on your website</FormDescription>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {WEBSITE_PAGES.map(page => (
                <FormItem key={page} className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value?.includes(page)}
                      onCheckedChange={(checked) => {
                        return checked
                          ? field.onChange([...field.value, page])
                          : field.onChange(
                              field.value?.filter((value) => value !== page)
                            );
                      }}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    {page}
                  </FormLabel>
                </FormItem>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="contentRequirements.hasLogo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I have a business logo
                </FormLabel>
                <FormDescription>
                  You'll be able to upload your logo after the website is generated
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contentRequirements.hasImages"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I have business photos/images
                </FormDescription>
                <FormDescription>
                  Product photos, team photos, location photos, etc.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="contentRequirements.additionalInfo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Information</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any specific content, features, or requirements you'd like us to know about..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Tell us about any specific content, features, or requirements that weren't covered above
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderAIProviderStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose your AI provider</h2>
        <p className="text-muted-foreground">Select the AI service that will generate your website</p>
      </div>

      <FormField
        control={form.control}
        name="llmProvider.provider"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="space-y-4"
              >
                {LLM_PROVIDERS.map(provider => (
                  <FormItem key={provider.value} className="space-y-2">
                    <FormLabel className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                      <FormControl>
                        <RadioGroupItem value={provider.value} />
                      </FormControl>
                      <div className="flex-1">
                        <div className="font-medium">{provider.label}</div>
                        <div className="text-sm text-muted-foreground">{provider.description}</div>
                      </div>
                    </FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">What happens next?</h3>
        <ol className="text-sm space-y-2 text-muted-foreground">
          <li>1. We'll create your tenant account and generate a unique subdomain</li>
          <li>2. Your chosen AI provider will analyze your business information</li>
          <li>3. A custom website will be generated and deployed to your subdomain</li>
          <li>4. You'll be able to review and edit your website through the dashboard</li>
        </ol>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderBusinessInfoStep();
      case 1:
        return renderBrandPreferencesStep();
      case 2:
        return renderContentRequirementsStep();
      case 3:
        return renderAIProviderStep();
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${index <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`
                      w-8 h-0.5 mx-2
                      ${index < currentStep ? 'bg-primary' : 'bg-muted'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Step {currentStep + 1} of {STEPS.length}
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <currentStepData.icon className="w-6 h-6 text-primary" />
            <div>
              <CardTitle>{currentStepData.title}</CardTitle>
              <CardDescription>{currentStepData.title} information</CardDescription>
            </div>
          </div>

          <Progress value={progress} className="mt-4" />
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {renderStepContent()}
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
            {currentStep === STEPS.length - 1 ? (
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Your Website...
                  </>
                ) : (
                  <>
                    Generate Website
                    <Wand2 className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}