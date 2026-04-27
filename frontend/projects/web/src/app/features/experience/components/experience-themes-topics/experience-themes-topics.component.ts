import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperienceService } from '../../services/experience.service';

export interface ThemeTopicItem {
  icon: string;
  theme: string;
  topics: string;
}

@Component({
  selector: 'app-experience-themes-topics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience-themes-topics.component.html',
})
export class ExperienceThemesTopicsComponent {
  readonly slug = input.required<string>();
  private readonly experienceService = inject(ExperienceService);

  // Computed themes/topics from service
  readonly themesTopics = computed<ThemeTopicItem[]>(() => {
    const exp = this.experienceService.experience();
    if (!exp) return [];

    // Group topics by theme
    const themeMap = new Map<string, string[]>();

    // Add category as a theme-topic if exists
    if (exp.experienceCategory) {
      themeMap.set(exp.experienceCategory.name, []);
    }

    // Add experience topics
    exp.experienceTopics?.forEach((topicRef) => {
      const themeName =
        typeof topicRef.theme === 'string' ? topicRef.theme : topicRef.theme.name;
      const topicName =
        typeof topicRef.topic === 'string' ? topicRef.topic : topicRef.topic.name;

      if (!themeMap.has(themeName)) {
        themeMap.set(themeName, []);
      }
      themeMap.get(themeName)!.push(topicName);
    });

    return Array.from(themeMap.entries()).map(([theme, topics]) => ({
      icon: this.getIconForTheme(theme),
      theme,
      topics: topics.join(', '),
    }));
  });

  readonly hasData = computed(() => this.themesTopics().length > 0);

  private getIconForTheme(theme: string): string {
    const themeLower = theme.toLowerCase();
    if (themeLower.includes('sport') || themeLower.includes('physical')) return 'sports';
    if (themeLower.includes('health') || themeLower.includes('fitness')) return 'health';
    if (themeLower.includes('business') || themeLower.includes('career')) return 'business';
    if (themeLower.includes('art') || themeLower.includes('creative')) return 'arts';
    if (themeLower.includes('tech') || themeLower.includes('digital')) return 'technology';
    return 'education';
  }

  getIconPath(icon: string): string {
    const icons: Record<string, string> = {
      sports: 'M13 10V3L4 14h7v7l9-11h-7z',
      health: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      education: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
      business: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      arts: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      technology: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    };
    return icons[icon] || icons['education'];
  }
}
