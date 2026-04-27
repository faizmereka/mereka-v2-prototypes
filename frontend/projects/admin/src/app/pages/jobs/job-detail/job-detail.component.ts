import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { JobsService, type JobStatus, type PricingType } from '../jobs.service';

type EmploymentType = 'full-time' | 'freelance' | 'part-time';
type AccessMode = 'PUBLIC' | 'PRIVATE';

interface Job {
  id: string;
  jobTitle: string;
  jobDescription: string;
  jobSummary: string;
  employmentType: EmploymentType;
  status: JobStatus;
  serviceCategory: { category: string; serviceType: string };
  expertLevel: string;
  jobLocation: string;
  preferredLocation: string[];
  jobBudget: { pricingType: PricingType; fromAmount: number; upToAmount?: number };
  jobCurrency: string;
  jobStartDate?: Date;
  jobEndDate?: string;
  jobSkills: string[];
  jobUploads: string[];
  accessMode: AccessMode;
  name: string;
  email: string;
  phoneNumber?: string;
  organizationName: string;
  aboutOrganization?: string;
  organizationImage?: string;
  hubId: string;
  hubName: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  proposalsCount: number;
  hiresCount: number;
}

@Component({
  selector: 'app-job-detail',
  imports: [RouterLink, DatePipe, TitleCasePipe, DecimalPipe],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.scss'
})
export class JobDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobsService = inject(JobsService);

  isLoading = signal(true);
  job = signal<Job | null>(null);

  ngOnInit() {
    const jobId = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      this.loadJobDetails(jobId);
    }
  }

  getStatusClasses(status: JobStatus): string {
    const classes: Record<JobStatus, string> = {
      'DRAFT': 'bg-gray-100 text-gray-700',
      'ACTIVE': 'bg-green-100 text-green-700',
      'IN_PROGRESS': 'bg-blue-100 text-blue-700',
      'COMPLETED': 'bg-purple-100 text-purple-700',
      'CANCELLED': 'bg-red-100 text-red-700',
      'EXPIRED': 'bg-orange-100 text-orange-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  loadJobDetails(jobId: string) {
    this.isLoading.set(true);

    // Load job details
    this.jobsService.getJobById(jobId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const j = response.data;
          this.job.set({
            id: j._id,
            jobTitle: j.jobTitle,
            jobDescription: j.jobDescription,
            jobSummary: j.jobSummary || '',
            employmentType: j.employmentType as EmploymentType,
            status: j.status,
            serviceCategory: j.serviceCategory || { category: '', serviceType: '' },
            expertLevel: j.expertLevel || 'Any',
            jobLocation: j.jobLocation || 'Remote',
            preferredLocation: j.preferredLocation || [],
            jobBudget: j.jobBudget || { pricingType: 'fixed', fromAmount: 0 },
            jobCurrency: j.jobCurrency,
            jobStartDate: undefined,
            jobEndDate: undefined,
            jobSkills: j.jobSkills || [],
            jobUploads: j.jobUploads || [],
            accessMode: (j.accessMode || 'PUBLIC') as AccessMode,
            name: j.name,
            email: j.email,
            phoneNumber: j.phoneNumber,
            organizationName: j.organizationName || '',
            aboutOrganization: j.aboutOrganization,
            organizationImage: j.organizationImage,
            hubId: j.hubId,
            hubName: j.hubName || j.hub?.name || '',
            createdBy: j.createdBy,
            createdAt: new Date(j.createdAt),
            updatedAt: new Date(j.updatedAt),
            proposalsCount: j.proposalsCount || 0,
            hiresCount: j.hiresCount || 0,
          });
          this.isLoading.set(false);
        } else {
          this.job.set(null);
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading job details:', err);
        this.job.set(null);
        this.isLoading.set(false);
      },
    });
  }

  goBack() { this.router.navigate(['/dashboard/jobs']); }
  getFileName(url: string): string { return url.split('/').pop() || 'File'; }
}
