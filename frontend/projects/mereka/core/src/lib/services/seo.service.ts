import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Meta data configuration for SEO
 */
export interface SeoMetaData {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  url: string;
  type?: 'website' | 'article' | 'product' | 'event';
  siteName?: string;
  locale?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  twitterHandle?: string;
  noIndex?: boolean;
}

/**
 * Location data for meta tags
 */
export interface SeoLocationData {
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

/**
 * Event-specific meta data
 */
export interface SeoEventData {
  startDate?: string;
  endDate?: string;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'SoldOut' | 'PreOrder';
  attendanceMode?: 'offline' | 'online' | 'mixed';
  organizerName?: string;
  organizerUrl?: string;
  rating?: number;
  reviewCount?: number;
  location?: SeoLocationData;
}

/**
 * JSON-LD structured data types
 */
export type JsonLdType = 'Event' | 'VirtualEvent' | 'Product' | 'Article' | 'Organization' | 'LocalBusiness' | 'Course';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private jsonLdScript: HTMLScriptElement | null = null;
  private readonly defaultSiteName = 'Mereka';
  private readonly defaultTwitterHandle = '@mereka_io';
  private readonly defaultLocale = 'en_US';

  /**
   * Update all meta tags for a page
   */
  updateMetaTags(data: SeoMetaData): void {
    const siteName = data.siteName || this.defaultSiteName;
    const pageTitle = data.title.includes(siteName) ? data.title : `${data.title} | ${siteName}`;

    // Set page title
    this.title.setTitle(pageTitle);

    // Standard SEO meta tags
    this.meta.updateTag({ name: 'description', content: data.description });
    if (data.keywords?.length) {
      this.meta.updateTag({ name: 'keywords', content: data.keywords.join(', ') });
    }
    if (data.author) {
      this.meta.updateTag({ name: 'author', content: data.author });
    }
    this.meta.updateTag({
      name: 'robots',
      content: data.noIndex ? 'noindex, nofollow' : 'index, follow',
    });

    // Canonical URL
    this.updateCanonicalLink(data.url);

    // Open Graph (Facebook, LinkedIn, Instagram, WhatsApp)
    this.updateOpenGraphTags(data, siteName);

    // Twitter Card
    this.updateTwitterTags(data);

    // Additional meta for mobile/apps
    this.meta.updateTag({ name: 'apple-mobile-web-app-title', content: data.title });
    this.meta.updateTag({ name: 'application-name', content: siteName });

    // Pinterest
    this.meta.updateTag({ name: 'pinterest:description', content: data.description });
  }

  /**
   * Update Open Graph meta tags
   */
  private updateOpenGraphTags(data: SeoMetaData, siteName: string): void {
    this.meta.updateTag({ property: 'og:type', content: data.type || 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: siteName });
    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: data.description });
    this.meta.updateTag({ property: 'og:url', content: data.url });
    this.meta.updateTag({ property: 'og:locale', content: data.locale || this.defaultLocale });

    if (data.image) {
      this.meta.updateTag({ property: 'og:image', content: data.image });
      this.meta.updateTag({ property: 'og:image:alt', content: data.imageAlt || data.title });
      this.meta.updateTag({ property: 'og:image:width', content: '1200' });
      this.meta.updateTag({ property: 'og:image:height', content: '630' });
    }

    // Article-specific tags
    if (data.type === 'article') {
      if (data.publishedTime) {
        this.meta.updateTag({ property: 'article:published_time', content: data.publishedTime });
      }
      if (data.modifiedTime) {
        this.meta.updateTag({ property: 'article:modified_time', content: data.modifiedTime });
      }
      if (data.author) {
        this.meta.updateTag({ property: 'article:author', content: data.author });
      }
    }
  }

  /**
   * Update Twitter Card meta tags
   */
  private updateTwitterTags(data: SeoMetaData): void {
    this.meta.updateTag({ name: 'twitter:card', content: data.image ? 'summary_large_image' : 'summary' });
    this.meta.updateTag({ name: 'twitter:site', content: data.twitterHandle || this.defaultTwitterHandle });
    this.meta.updateTag({ name: 'twitter:title', content: data.title });
    this.meta.updateTag({ name: 'twitter:description', content: data.description });

    if (data.image) {
      this.meta.updateTag({ name: 'twitter:image', content: data.image });
      this.meta.updateTag({ name: 'twitter:image:alt', content: data.imageAlt || data.title });
    }
  }

  /**
   * Update or create canonical link
   */
  private updateCanonicalLink(url: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      // For SSR, use meta tag
      this.meta.updateTag({ name: 'canonical', content: url });
      return;
    }

    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Add JSON-LD structured data for an Event
   */
  addEventJsonLd(
    meta: SeoMetaData,
    event: SeoEventData
  ): void {
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': event.attendanceMode === 'online' ? 'VirtualEvent' : 'Event',
      name: meta.title,
      description: meta.description,
      url: meta.url,
      image: meta.image,
    };

    // Organizer
    if (event.organizerName) {
      jsonLd['organizer'] = {
        '@type': 'Organization',
        name: event.organizerName,
        url: event.organizerUrl || meta.url,
      };
    }

    // Attendance mode
    jsonLd['eventAttendanceMode'] = this.getAttendanceMode(event.attendanceMode);

    // Location
    if (event.attendanceMode !== 'online' && event.location) {
      jsonLd['location'] = this.buildLocationJsonLd(event.location);
    } else if (event.attendanceMode === 'online' || event.attendanceMode === 'mixed') {
      jsonLd['location'] = {
        '@type': 'VirtualLocation',
        url: meta.url,
      };
    }

    // Dates
    if (event.startDate) {
      jsonLd['startDate'] = event.startDate;
    }
    if (event.endDate) {
      jsonLd['endDate'] = event.endDate;
    }

    // Offers/pricing
    if (event.price !== undefined) {
      jsonLd['offers'] = {
        '@type': 'Offer',
        price: event.price,
        priceCurrency: event.currency || 'MYR',
        availability: `https://schema.org/${event.availability || 'InStock'}`,
        url: meta.url,
      };
    }

    // Rating
    if (event.rating && event.reviewCount && event.reviewCount > 0) {
      jsonLd['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: event.rating,
        reviewCount: event.reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }

    this.setJsonLd(jsonLd);
  }

  /**
   * Add JSON-LD structured data for a Product
   */
  addProductJsonLd(
    meta: SeoMetaData,
    product: {
      price: number;
      currency?: string;
      availability?: 'InStock' | 'SoldOut' | 'PreOrder';
      brand?: string;
      rating?: number;
      reviewCount?: number;
    }
  ): void {
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: meta.title,
      description: meta.description,
      url: meta.url,
      image: meta.image,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency || 'MYR',
        availability: `https://schema.org/${product.availability || 'InStock'}`,
        url: meta.url,
      },
    };

    if (product.brand) {
      jsonLd['brand'] = {
        '@type': 'Brand',
        name: product.brand,
      };
    }

    if (product.rating && product.reviewCount && product.reviewCount > 0) {
      jsonLd['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }

    this.setJsonLd(jsonLd);
  }

  /**
   * Add JSON-LD structured data for an Organization
   */
  addOrganizationJsonLd(org: {
    name: string;
    url: string;
    logo?: string;
    description?: string;
    sameAs?: string[];
    address?: SeoLocationData;
  }): void {
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: org.name,
      url: org.url,
    };

    if (org.logo) {
      jsonLd['logo'] = org.logo;
    }
    if (org.description) {
      jsonLd['description'] = org.description;
    }
    if (org.sameAs?.length) {
      jsonLd['sameAs'] = org.sameAs;
    }
    if (org.address) {
      jsonLd['address'] = {
        '@type': 'PostalAddress',
        addressLocality: org.address.city,
        addressRegion: org.address.state,
        addressCountry: org.address.country,
      };
    }

    this.setJsonLd(jsonLd);
  }

  /**
   * Add JSON-LD structured data for a Course
   */
  addCourseJsonLd(
    meta: SeoMetaData,
    course: {
      providerName: string;
      providerUrl?: string;
      price?: number;
      currency?: string;
      duration?: string;
      level?: string;
    }
  ): void {
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: meta.title,
      description: meta.description,
      url: meta.url,
      image: meta.image,
      provider: {
        '@type': 'Organization',
        name: course.providerName,
        url: course.providerUrl || meta.url,
      },
    };

    if (course.price !== undefined) {
      jsonLd['offers'] = {
        '@type': 'Offer',
        price: course.price,
        priceCurrency: course.currency || 'MYR',
      };
    }

    if (course.duration) {
      jsonLd['timeRequired'] = course.duration;
    }

    if (course.level) {
      jsonLd['educationalLevel'] = course.level;
    }

    this.setJsonLd(jsonLd);
  }

  /**
   * Add JSON-LD structured data for a Service (e.g., consultation, coaching)
   */
  addServiceJsonLd(
    meta: { title: string; description: string; url: string; image?: string },
    service: {
      price?: number;
      currency?: string;
      providerName: string;
      providerUrl?: string;
      rating?: number;
      reviewCount?: number;
      serviceType?: string;
      areaServed?: string;
    }
  ): void {
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: meta.title,
      description: meta.description,
      url: meta.url,
      image: meta.image,
      provider: {
        '@type': 'Organization',
        name: service.providerName,
        url: service.providerUrl || meta.url,
      },
    };

    if (service.serviceType) {
      jsonLd['serviceType'] = service.serviceType;
    }

    if (service.areaServed) {
      jsonLd['areaServed'] = service.areaServed;
    }

    if (service.price !== undefined) {
      jsonLd['offers'] = {
        '@type': 'Offer',
        price: service.price,
        priceCurrency: service.currency || 'MYR',
        availability: 'https://schema.org/InStock',
        url: meta.url,
      };
    }

    if (service.rating && service.reviewCount && service.reviewCount > 0) {
      jsonLd['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: service.rating,
        reviewCount: service.reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }

    this.setJsonLd(jsonLd);
  }

  /**
   * Add custom JSON-LD structured data
   */
  addCustomJsonLd(jsonLd: Record<string, unknown>): void {
    this.setJsonLd({
      '@context': 'https://schema.org',
      ...jsonLd,
    });
  }

  /**
   * Remove JSON-LD script from head
   */
  removeJsonLd(): void {
    if (this.jsonLdScript && isPlatformBrowser(this.platformId)) {
      this.jsonLdScript.remove();
      this.jsonLdScript = null;
    }
  }

  /**
   * Reset all meta tags to defaults
   */
  resetMetaTags(): void {
    this.title.setTitle(this.defaultSiteName);
    this.removeJsonLd();

    // Remove dynamic meta tags
    const tagsToRemove = [
      'description',
      'keywords',
      'author',
      'og:title',
      'og:description',
      'og:image',
      'og:url',
      'twitter:title',
      'twitter:description',
      'twitter:image',
    ];

    tagsToRemove.forEach((tag) => {
      if (tag.startsWith('og:')) {
        this.meta.removeTag(`property="${tag}"`);
      } else {
        this.meta.removeTag(`name="${tag}"`);
      }
    });
  }

  /**
   * Helper: Truncate text for meta descriptions
   */
  truncateText(text: string, maxLength: number = 160): string {
    if (!text) return '';
    // Strip HTML tags
    const stripped = text.replace(/<[^>]*>/g, '');
    if (stripped.length <= maxLength) return stripped;
    return stripped.substring(0, maxLength - 3) + '...';
  }

  /**
   * Helper: Generate keywords from an array of strings
   */
  generateKeywords(...keywords: (string | undefined | null)[]): string[] {
    return keywords.filter((k): k is string => !!k && k.trim() !== '');
  }

  private setJsonLd(jsonLd: Record<string, unknown>): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Remove existing script if any
    if (this.jsonLdScript) {
      this.jsonLdScript.remove();
    }

    // Create and append script element
    this.jsonLdScript = this.document.createElement('script');
    this.jsonLdScript.type = 'application/ld+json';
    this.jsonLdScript.text = JSON.stringify(jsonLd);
    this.document.head.appendChild(this.jsonLdScript);
  }

  private getAttendanceMode(mode?: 'offline' | 'online' | 'mixed'): string {
    switch (mode) {
      case 'online':
        return 'https://schema.org/OnlineEventAttendanceMode';
      case 'mixed':
        return 'https://schema.org/MixedEventAttendanceMode';
      default:
        return 'https://schema.org/OfflineEventAttendanceMode';
    }
  }

  private buildLocationJsonLd(location: SeoLocationData): Record<string, unknown> {
    const locationText = [location.city, location.country].filter(Boolean).join(', ');

    const result: Record<string, unknown> = {
      '@type': 'Place',
      name: locationText,
      address: {
        '@type': 'PostalAddress',
        addressLocality: location.city,
        addressRegion: location.state,
        addressCountry: location.country,
      },
    };

    if (location.lat && location.lng) {
      result['geo'] = {
        '@type': 'GeoCoordinates',
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    return result;
  }
}
