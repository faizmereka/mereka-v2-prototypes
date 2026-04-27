import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent, UiToggleComponent } from '@mereka/ui';

@Component({
  selector: 'app-user-interests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    UiToggleComponent,
  ],
  templateUrl: './interests.component.html',
  styleUrls: ['./interests.component.scss']
})
export class UserInterestsComponent implements OnInit {
  personalizeContent = signal(false);

  learnerProfile = signal({
    purposeInExperiences: ['Gain new skills', 'Learn something new', 'Meet new people'],
    interestedExperiences: ['Workshops', 'Courses'],
    interestedThemes: ['Technology', 'Art', 'Science'],
    interestedSpaces: ['Coworking Spaces', 'Makerspaces'],
    interestedExperts: ['Design', 'Programming', 'Marketing']
  });

  constructor(private router: Router) { }

  ngOnInit(): void {
    // TODO: Load from service/API
    const savedData = localStorage.getItem('learnerOnboardData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.selectedExperiencePurposes) {
          this.learnerProfile.update((profile) => ({
            ...profile,
            purposeInExperiences: data.selectedExperiencePurposes.map((p: string) => {
              const map: Record<string, string> = {
                'gain-skills': 'Gain new skills',
                'learn': 'Learn something new',
                'meet-people': 'Meet new people',
              };
              return map[p] || p;
            }),
          }));
        }
        if (data.selectedExperienceTypes) {
          this.learnerProfile.update((profile) => ({
            ...profile,
            interestedExperiences: data.selectedExperienceTypes.map((t: string) => {
              const map: Record<string, string> = {
                'workshop': 'Workshops',
                'course': 'Courses',
              };
              return map[t] || t;
            }),
          }));
        }
        if (data.selectedThemes) {
          this.learnerProfile.update((profile) => ({
            ...profile,
            interestedThemes: data.selectedThemes,
          }));
        }
        if (data.selectedExpertTopics) {
          this.learnerProfile.update((profile) => ({
            ...profile,
            interestedExperts: data.selectedExpertTopics,
          }));
        }
      } catch (e) {
        console.error('Error parsing saved data', e);
      }
    }
  }

  activeTable(data: string): void {
    console.log('Active table:', data);
    // Logic to handle active table navigation
  }
}
