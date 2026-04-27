import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Course {
  id: string;
  title: string;
  description?: string;
  image?: string;
  progress?: number;
}

@Component({
  selector: 'app-user-courses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './courses.component.html',
})
export class UserCoursesComponent implements OnInit {
  readonly loading = signal(false);
  readonly allCourses = signal<Course[]>([]);
  readonly currentPage = signal(1);
  readonly recordsPerPage = 12;

  readonly totalPages = computed(() =>
    Math.ceil(this.allCourses().length / this.recordsPerPage)
  );

  readonly courses = computed(() => {
    const start = (this.currentPage() - 1) * this.recordsPerPage;
    const end = start + this.recordsPerPage;
    return this.allCourses().slice(start, end);
  });

  readonly paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Show max 5 pages
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  });

  ngOnInit() {
    this.loadCourses();
  }

  async loadCourses() {
    this.loading.set(true);
    try {
      // TODO: Replace with actual API call
      // const response = await this.coursesService.loadCourses();
      // this.allCourses.set(response.courses);

      // Mock data for demonstration
      this.allCourses.set([
        {
          id: '1',
          title: 'Introduction to Digital Marketing',
          description: 'Learn the fundamentals of digital marketing including SEO, social media, and content marketing strategies.',
          image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
          progress: 75,
        },
        {
          id: '2',
          title: 'Web Development Bootcamp',
          description: 'Complete web development course covering HTML, CSS, JavaScript, and modern frameworks.',
          image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=225&fit=crop',
          progress: 45,
        },
        {
          id: '3',
          title: 'UI/UX Design Fundamentals',
          description: 'Master the principles of user interface and user experience design with practical projects.',
          image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=225&fit=crop',
          progress: 90,
        },
        {
          id: '4',
          title: 'Data Science with Python',
          description: 'Learn data analysis, visualization, and machine learning using Python and popular libraries.',
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop',
          progress: 30,
        },
        {
          id: '5',
          title: 'Business Strategy & Management',
          description: 'Develop strategic thinking and leadership skills for modern business environments.',
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop',
          progress: 60,
        },
        {
          id: '6',
          title: 'Photography Masterclass',
          description: 'From basics to advanced techniques, learn professional photography skills.',
          image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&h=225&fit=crop',
          progress: 15,
        },
      ]);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      this.loading.set(false);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
