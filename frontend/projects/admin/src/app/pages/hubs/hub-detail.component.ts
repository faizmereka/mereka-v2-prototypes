import { Component, signal, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HubsService, Hub, HubStatus } from './hubs.service';
import { DialogService } from '../../shared/dialog';
import { ToastService, AvatarComponent } from '../../shared/ui';

interface HubMember {
  _id: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    profilePhoto?: string;
  };
  roleId?: {
    _id: string;
    name: string;
    key: string;
  };
  status: string;
  title?: string;
  joinedAt?: string;
  createdAt: string;
}

@Component({
  selector: 'app-hub-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, DatePipe, TitleCasePipe, AvatarComponent, FormsModule],
  templateUrl: './hub-detail.component.html',
})
export class HubDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hubsService = inject(HubsService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);

  hubId = signal<string>('');
  hub = signal<Hub | null>(null);
  loading = signal(true);
  hubMembers = signal<HubMember[]>([]);
  activeTab = signal<'overview' | 'members' | 'experiences'>('overview');

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.hubId.set(id);
        this.loadHub(id);
      }
    });
  }

  loadHub(id: string) {
    this.loading.set(true);
    this.hubsService.getHubById(id).subscribe({
      next: (response) => {
        this.hub.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to load hub details');
        console.error('Failed to load hub:', err);
      },
    });
  }

  getStatusColor(status?: string): string {
    if (!status) return 'bg-gray-100 text-gray-600';
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      approved: 'bg-blue-100 text-blue-700',
      pending_review: 'bg-amber-100 text-amber-700',
      rejected: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-600',
      inactive: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  }

  formatStatus(status?: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }

  getRoleClasses(role?: string): string {
    if (!role) return 'bg-gray-100 text-gray-700';
    const classes: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      staff: 'bg-gray-100 text-gray-700',
      member: 'bg-green-100 text-green-700',
    };
    return classes[role.toLowerCase()] || 'bg-gray-100 text-gray-700';
  }

  async updateStatus(newStatus: HubStatus) {
    const hub = this.hub();
    if (!hub) return;

    const statusLabels: Record<HubStatus, string> = {
      draft: 'Draft',
      pending_review: 'Pending Review',
      approved: 'Approved',
      active: 'Active',
      rejected: 'Rejected',
      inactive: 'Inactive',
    };

    const confirmed = await this.dialogService.confirm({
      title: `Change Status to ${statusLabels[newStatus]}`,
      message: `Are you sure you want to change "${hub.name}" status to ${statusLabels[newStatus]}?`,
      type: newStatus === 'rejected' || newStatus === 'inactive' ? 'danger' : 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.hubsService.updateStatus(hub._id, newStatus).subscribe({
      next: () => {
        // Optimistic update - update local state
        this.hub.set({
          ...hub,
          status: newStatus,
          isActive: newStatus === 'active' || newStatus === 'approved',
          isFeatured: newStatus === 'rejected' || newStatus === 'inactive' ? false : hub.isFeatured,
        });
        this.toast.success(`Hub status updated to ${statusLabels[newStatus]}`);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update status');
      },
    });
  }

  async toggleFeatured() {
    const hub = this.hub();
    if (!hub) return;

    const action = hub.isFeatured ? 'remove from featured' : 'make featured';
    const confirmed = await this.dialogService.confirm({
      title: hub.isFeatured ? 'Remove Featured' : 'Make Featured',
      message: `Are you sure you want to ${action} "${hub.name}"?`,
      type: 'warning',
      confirmText: 'Confirm',
    });

    if (!confirmed) return;

    this.hubsService.toggleFeatured(hub._id).subscribe({
      next: () => {
        // Optimistic update - toggle featured locally
        this.hub.set({ ...hub, isFeatured: !hub.isFeatured });
        this.toast.success(hub.isFeatured ? 'Hub removed from featured' : 'Hub is now featured');
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update featured status');
      },
    });
  }

  async deleteHub() {
    const hub = this.hub();
    if (!hub) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete Hub',
      message: `Are you sure you want to delete "${hub.name}"? This will set the hub to inactive.`,
      type: 'danger',
      confirmText: 'Delete',
    });

    if (!confirmed) return;

    this.hubsService.deleteHub(hub._id).subscribe({
      next: () => {
        this.toast.success('Hub deleted successfully');
        this.router.navigate(['/dashboard/hubs']);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to delete hub');
      },
    });
  }

  setTab(tab: 'overview' | 'members' | 'experiences') {
    this.activeTab.set(tab);
  }

  goBack() {
    this.router.navigate(['/dashboard/hubs']);
  }

  // Order editing
  editingOrder = signal(false);
  orderValue = signal(1000);

  startEditOrder() {
    const hub = this.hub();
    if (!hub) return;
    this.orderValue.set(hub.displayOrder || 1000);
    this.editingOrder.set(true);
  }

  cancelEditOrder() {
    this.editingOrder.set(false);
  }

  saveOrder() {
    const hub = this.hub();
    if (!hub) return;

    const newOrder = this.orderValue();
    if (newOrder === hub.displayOrder) {
      this.editingOrder.set(false);
      return;
    }

    this.hubsService.updateOrder(hub._id, newOrder).subscribe({
      next: () => {
        this.hub.set({ ...hub, displayOrder: newOrder });
        this.toast.success('Display order updated');
        this.editingOrder.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error?.message || 'Failed to update order');
      },
    });
  }

  onOrderKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.saveOrder();
    } else if (event.key === 'Escape') {
      this.cancelEditOrder();
    }
  }
}
