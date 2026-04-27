import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

export type ExperienceTicketType = 'Paid' | 'Free' | 'Private Group';

export interface ExperienceTicket {
  id: string;
  ticketType: ExperienceTicketType;
  ticketName: string;
  ticketPrice: number | null;
  ticketQty: number;
  description: string;
  hasCutoffTime: boolean;
  cutoffNumber: number;
  cutoffTime: 'Hour(s)' | 'Day(s)';
  cutoffBeforeAfter: 'Before Experience starts' | 'After Experience starts';
  isEditing: boolean;
  isSaved: boolean;
}

@Component({
  selector: 'ui-experience-ticket-form',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './experience-ticket-form.component.html',
})
export class UiExperienceTicketFormComponent implements OnInit {
  // Inputs
  readonly currency = input<string>('RM');
  readonly maxTickets = input<number>(10);
  readonly serviceFeePercent = input<number>(3);
  readonly serviceFeeFixed = input<number>(1);

  // Outputs
  readonly ticketsChange = output<ExperienceTicket[]>();

  // State
  readonly tickets = signal<ExperienceTicket[]>([]);
  readonly showAddMenu = signal(false);

  readonly ticketTypes: ExperienceTicketType[] = ['Paid', 'Free'];
  readonly cutoffTimeOptions = ['Hour(s)', 'Day(s)'];
  readonly cutoffBeforeAfterOptions = ['Before Experience starts', 'After Experience starts'];

  readonly hasUnsavedTickets = computed(() =>
    this.tickets().some(t => t.isEditing && !t.isSaved)
  );

  readonly canAddTicket = computed(() =>
    this.tickets().length < this.maxTickets() && !this.hasUnsavedTickets()
  );

  private generateId(): string {
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  ngOnInit(): void {
    // Initialize with one default ticket if empty
    if (this.tickets().length === 0) {
      this.addTicket('Paid');
    }
  }

  addTicket(type: ExperienceTicketType): void {
    const newTicket: ExperienceTicket = {
      id: this.generateId(),
      ticketType: type,
      ticketName: type === 'Private Group' ? 'Private Group Ticket' : '',
      ticketPrice: type === 'Free' ? 0 : null,
      ticketQty: 1,
      description: '',
      hasCutoffTime: false,
      cutoffNumber: 1,
      cutoffTime: 'Hour(s)',
      cutoffBeforeAfter: 'Before Experience starts',
      isEditing: true,
      isSaved: false,
    };
    this.tickets.update(t => [...t, newTicket]);
    this.showAddMenu.set(false);
  }

  updateTicket(id: string, field: keyof ExperienceTicket, value: unknown): void {
    this.tickets.update(tickets =>
      tickets.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  }

  onTicketTypeChange(id: string, type: ExperienceTicketType): void {
    this.tickets.update(tickets =>
      tickets.map(t => {
        if (t.id === id) {
          return {
            ...t,
            ticketType: type,
            ticketName: type === 'Private Group' ? 'Private Group Ticket' : t.ticketName,
            ticketPrice: type === 'Free' ? 0 : t.ticketPrice,
          };
        }
        return t;
      })
    );
  }

  saveTicket(id: string): void {
    const ticket = this.tickets().find(t => t.id === id);
    if (ticket && this.isTicketValid(ticket)) {
      this.tickets.update(tickets =>
        tickets.map(t => t.id === id ? { ...t, isEditing: false, isSaved: true } : t)
      );
      this.emitChanges();
    }
  }

  editTicket(id: string): void {
    this.tickets.update(tickets =>
      tickets.map(t => t.id === id ? { ...t, isEditing: true } : t)
    );
  }

  removeTicket(id: string): void {
    if (this.tickets().length > 1) {
      this.tickets.update(t => t.filter(ticket => ticket.id !== id));
      this.emitChanges();
    }
  }

  duplicateTicket(id: string): void {
    const ticket = this.tickets().find(t => t.id === id);
    if (ticket && ticket.isSaved) {
      const newTicket: ExperienceTicket = {
        ...ticket,
        id: this.generateId(),
        isEditing: true,
        isSaved: false,
      };
      this.tickets.update(t => [...t, newTicket]);
    }
  }

  toggleExpand(id: string): void {
    this.tickets.update(tickets =>
      tickets.map(t => t.id === id ? { ...t, isEditing: !t.isEditing } : t)
    );
  }

  onDrop(event: CdkDragDrop<ExperienceTicket[]>): void {
    const tickets = [...this.tickets()];
    moveItemInArray(tickets, event.previousIndex, event.currentIndex);
    this.tickets.set(tickets);
    this.emitChanges();
  }

  calculateBuyerTotal(rate: number | null): string {
    if (!rate || rate === 0) return '0.00';
    // Formula: ((rate + fixed) / (100 - percent)) * 100
    const total = ((rate + this.serviceFeeFixed()) / (100 - this.serviceFeePercent())) * 100;
    return total.toFixed(2);
  }

  isTicketValid(ticket: ExperienceTicket): boolean {
    if (!ticket.ticketName.trim()) return false;
    if (ticket.ticketType !== 'Free' && (ticket.ticketPrice === null || ticket.ticketPrice <= 0)) return false;
    if (ticket.ticketQty < 1) return false;
    return true;
  }

  getTicketErrors(ticket: ExperienceTicket): string[] {
    const errors: string[] = [];
    if (!ticket.ticketName.trim()) errors.push('Ticket name is required');
    if (ticket.ticketType !== 'Free' && (ticket.ticketPrice === null || ticket.ticketPrice <= 0)) {
      errors.push('Standard rate is required');
    }
    if (ticket.ticketQty < 1) errors.push('Quantity must be at least 1');
    return errors;
  }

  private emitChanges(): void {
    this.ticketsChange.emit(this.tickets().filter(t => t.isSaved));
  }

  // Initialize with existing tickets
  setTickets(tickets: ExperienceTicket[]): void {
    this.tickets.set(tickets.map(t => ({ ...t, isEditing: false, isSaved: true })));
  }
}
