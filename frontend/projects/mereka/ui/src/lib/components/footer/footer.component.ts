import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-footer',
  imports: [CommonModule],
  templateUrl: './footer.component.html',
})
export class UiFooterComponent {
  currentYear = new Date().getFullYear();

  socialLinks = [
    { name: 'TikTok', url: 'https://www.tiktok.com/@mereka.io', icon: 'tiktok' },
    { name: 'Instagram', url: 'https://www.instagram.com/mereka.io/', icon: 'instagram' },
    { name: 'Facebook', url: 'https://www.facebook.com/mereka.io', icon: 'facebook' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/company/mereka/', icon: 'linkedin' },
    { name: 'YouTube', url: 'https://www.youtube.com/channel/UCCyMH5KIZeCMchjMKl7RWxg', icon: 'youtube' },
  ];

  navLinks = [
    { label: 'About', url: 'https://corporate.mereka.io/about-us' },
    { label: 'Andragogy', url: 'https://corporate.mereka.io/andragogy' },
    { label: 'Portfolio', url: 'https://corporate.mereka.io/portfolio' },
    { label: 'Team', url: 'https://corporate.mereka.io/our-team' },
    { label: 'Careers', url: 'https://corporate.mereka.io/work-with-us' },
    { label: 'Ecosystem', url: 'https://corporate.mereka.io/ecosystem' },
    { label: 'Blog', url: 'https://corporate.mereka.io/blog' },
    { label: 'Help Centre', url: 'https://help.mereka.io/' },
  ];

  corporateLinks = [
    { label: 'Accelerate Talent', url: 'https://corporate.mereka.io/academy/funders' },
    { label: 'Create Online Course', url: 'https://corporate.mereka.io/academy/create-online-courses' },
    { label: 'Build a Makerspace', url: 'https://corporate.mereka.io/academy/makerspace' },
  ];

  marketplaceUserLinks = [
    { label: 'Experiences', url: '/experiences' },
    { label: 'Experts', url: '/experts' },
    { label: 'Expertise', url: '/expertise' },
    { label: 'Hubs', url: '/hubs' },
    { label: 'Spaces', url: 'https://corporate.mereka.io/space' },
  ];

  marketplaceBusinessLinks = [
    { label: 'Pricing', url: 'https://hubs.mereka.io/pricing' },
    { label: 'Solutions', url: 'https://hubs.mereka.io/howitworks' },
  ];

  academyLinks = [
    { label: 'Future of Work', url: 'https://corporate.mereka.io/academy/future-of-work' },
    { label: 'Become a Digital Entrepreneur', url: 'https://corporate.mereka.io/academy/digital-entrepreneur' },
    { label: 'All Courses', url: 'https://corporate.mereka.io/academy/all-courses' },
  ];

  spaceLinks = [
    { label: 'Mereka @ Publika', url: 'https://corporate.mereka.io/publika' },
    { label: 'Our Labs', url: 'https://corporate.mereka.io/space#labs' },
    { label: 'Bespoke Design Services', url: 'https://corporate.mereka.io/space/innovate#products' },
    { label: 'Co-host Creative Events / Talks / Workshops', url: 'https://corporate.mereka.io/space#event-cta' },
  ];
}
