import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FaqItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

interface LessonItem {
  number: string;
  title: string;
  duration: string;
}

interface Instructor {
  name: string;
  title: string;
  company: string;
  description: string;
  image: string;
}

interface Stat {
  value: string;
  description: string;
}

@Component({
  selector: 'web-ai-fundamentals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-fundamentals.page.html',
})
export class AiFundamentalsPage {
  // FAQ Items
  faqItems = signal<FaqItem[]>([
    {
      question: 'Do I need prior AI knowledge?',
      answer: 'No, this course is beginner-friendly.',
      isOpen: true,
    },
    {
      question: 'How long will I have access to this course?',
      answer: 'You will have lifetime access to the course materials after enrollment.',
      isOpen: false,
    },
    {
      question: 'Is this course fully remote?',
      answer: 'Yes, this course can be conducted fully remote or in-person based on your preference.',
      isOpen: false,
    },
    {
      question: 'Can I learn at my own pace?',
      answer: 'The 1-day course is instructor-led, but you can access materials afterward at your own pace.',
      isOpen: false,
    },
  ]);

  // Lesson Items - Module 1
  module1Lessons: LessonItem[] = [
    { number: '01', title: 'What is Intelligence?', duration: '10m' },
    { number: '02', title: 'What is Machine Learning?', duration: '15m' },
    { number: '03', title: 'What is Artificial Intelligence?', duration: '8m' },
    { number: '04', title: 'History of AI', duration: '7m' },
    { number: '05', title: 'AI Applications in Real-life: 6 Key Areas AI Empowers Workforce', duration: '12m' },
  ];

  // Instructors
  instructors: Instructor[] = [
    {
      name: 'Jay Bala',
      title: 'Lead Instructor / Chief Executive Officer',
      company: 'Mereka',
      description: 'Jay is an experienced Educator, Trainer, and Business Developer with a mission to inspire people in computer training and instructional program development. Starting his career with HP and Dell.',
      image: '',
    },
    {
      name: 'Gurpreet Singh Dhillon',
      title: 'AI Expert Instructor / CEO',
      company: 'Cyberjaya',
      description: 'Gurpreet is a change-maker, dreamer, and Social Entrepreneur who has spent his life on equitable policy with TAS company affiliates and others around Hofstede.',
      image: '',
    },
    {
      name: 'Roshvin Pal Singh',
      title: 'AI For Teams Instructor / CEO',
      company: 'BAB Malaysia',
      description: 'I lead the Bill-Up Group, which is one of Malaysia\'s pioneering Social Innovation organisations. Since 2003, we have invested successfully social innovation models and enterprises.',
      image: '',
    },
    {
      name: 'Ambika Sangaran',
      title: 'AI Ethics & Responsibility Trainer',
      company: 'CEO of Mereka',
      description: 'Ambika is creating opportunities where there are none. Throughout her career, she built ecosystems for entrepreneurs, whether through education or ecosystem facilitation.',
      image: '',
    },
  ];

  // Stats
  stats: Stat[] = [
    { value: '842K+', description: 'learners across Malaysia & Indonesia trained in AI fundamentals' },
    { value: '1,484', description: 'TVET educators trained in AI literacy and Microsoft AI skills content' },
    { value: '51K', description: 'students trained, with plans to reach 150K more soon' },
    { value: '57-70%', description: 'women participation, driving inclusive AI education' },
  ];

  // Pricing
  pricing = {
    standard: {
      title: '1-Day AI Fundamentals',
      originalPrice: 'RM8,200.00',
      price: 'RM16,000',
      features: [
        'Full access for up to 10 employees',
        '+RM1,000 for extra employees',
        'Lifetime access to course materials',
        'Certificate of completion',
      ],
    },
    custom: {
      title: 'Customised Training',
      subtitle: 'Get in touch with our team',
      features: [
        'Free business consultation',
        'Dedicated account manager',
        'Packaged pricing',
        'Custom AI prompt templates for your business',
      ],
    },
  };

  // Methods
  toggleFaq(index: number): void {
    this.faqItems.update(items =>
      items.map((item, i) => ({
        ...item,
        isOpen: i === index ? !item.isOpen : false,
      }))
    );
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
