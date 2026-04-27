import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DecimalPipe } from '@angular/common';

interface UserStat {
  label: string;
  count: number;
  icon: string;
  route?: string;
}

interface CountryVisit {
  country: string;
  count: number;
  change: number;
  isPositive: boolean;
}

interface SourceVisit {
  source: string;
  count: number;
  change: number;
  isPositive: boolean;
}

@Component({
  selector: 'app-users',
  imports: [RouterLink, RouterLinkActive, DecimalPipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  userStats = signal<UserStat[]>([
    { label: 'Learners', count: 12540, icon: 'icons/icon-users.svg', route: 'learners' },
    { label: 'Experts', count: 342, icon: 'imgs/Machine 3.png', route: 'experts' },
    { label: 'Hub Admins', count: 89, icon: 'imgs/Vector (1).png' },
  ]);

  countryVisits = signal<CountryVisit[]>([
    { country: 'Malaysia', count: 5000, change: 10.9, isPositive: true },
    { country: 'Singapore', count: 120, change: 3.2, isPositive: false },
    { country: 'Australia', count: 120, change: 3.2, isPositive: false },
    { country: 'United States', count: 20, change: 1.2, isPositive: true },
    { country: 'Other', count: 20, change: 2.4, isPositive: true },
  ]);

  sourceVisits = signal<SourceVisit[]>([
    { source: 'Direct Source', count: 224, change: 10.9, isPositive: true },
    { source: 'Search', count: 120, change: 3.2, isPositive: false },
    { source: 'Social', count: 120, change: 3.2, isPositive: false },
    { source: 'Email', count: 20, change: 1.2, isPositive: true },
    { source: 'Other', count: 20, change: 2.4, isPositive: true },
  ]);

  liveUsers = signal(320);
}

