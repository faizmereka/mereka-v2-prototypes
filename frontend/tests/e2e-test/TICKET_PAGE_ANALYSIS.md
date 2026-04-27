# Ticket Page Element Analysis & Selector Issues

**Date**: February 3, 2026  
**Issue**: Ticket creation buttons are always disabled, causing test failures

---

## 🔍 Root Cause Analysis

### Problem Identified

The ticket page component (`ui-experience-ticket-form`) has a **critical behavior** that prevents adding new tickets:

1. **Component Auto-Initialization**: When the component loads, it automatically creates one default "Paid" ticket if the tickets array is empty (line 61-63 in `experience-ticket-form.component.ts`)

2. **Button Disable Logic**: The "Paid" and "Free" buttons are disabled when:
   ```typescript
   canAddTicket() = tickets().length < maxTickets() && !hasUnsavedTickets()
   ```
   - `hasUnsavedTickets()` returns `true` if ANY ticket has `isEditing=true` AND `isSaved=false`
   - The auto-created ticket starts with `isEditing=true` and `isSaved=false`

3. **Result**: When the test tries to click "Paid +" or "Free +" buttons, they're **always disabled** because there's an unsaved ticket already being edited.

---

## 📋 Actual Component Structure

### Button Structure (from HTML)

```html
<!-- Footer - Add Ticket Buttons -->
<div class="bg-[#f5f5f5] border border-[rgba(0,0,0,0.12)] border-t-0 rounded-b-lg p-5">
  <div class="flex flex-wrap gap-3">
    @for (type of ticketTypes; track type) {
      <button
        type="button"
        (click)="addTicket(type)"
        [disabled]="!canAddTicket()"
        class="flex items-center gap-2 px-5 py-2.5 bg-white border border-[rgba(0,0,0,0.12)] rounded-lg hover:bg-neutral-50 disabled:text-[rgba(0,0,0,0.38)] disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        {{ type }}  <!-- Just "Paid" or "Free" -->
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    }
  </div>
</div>
```

**Key Points**:
- Button text is just `"Paid"` or `"Free"` (NOT "Paid +" or "Free +")
- Plus icon is a separate SVG element
- Buttons are in a footer section with class `bg-[#f5f5f5]`

### Ticket Form Fields Structure

```html
<!-- Ticket Name Input -->
<input
  type="text"
  [ngModel]="ticket.ticketName"
  (ngModelChange)="updateTicket(ticket.id, 'ticketName', $event)"
  placeholder="Name of ticket"
  maxlength="40"
  class="w-full h-12 px-4 border border-[rgba(0,0,0,0.12)] rounded-lg..."
/>

<!-- Standard Rate Input (for Paid tickets) -->
<input
  type="number"
  [ngModel]="ticket.standardRate"
  [disabled]="ticket.ticketType === 'Free'"
  placeholder="00.00"
  step="0.01"
  min="0"
  class="w-full h-12 pl-12 pr-4 border border-[rgba(0,0,0,0.12)] rounded-lg..."
/>

<!-- Ticket Quantity Input -->
<input
  type="number"
  [ngModel]="ticket.ticketQty"
  placeholder="1"
  min="1"
  max="9999"
  class="w-full h-12 px-4 border border-[rgba(0,0,0,0.12)] rounded-lg..."
/>

<!-- Save Ticket Button -->
<button
  type="button"
  (click)="saveTicket(ticket.id)"
  [disabled]="!isTicketValid(ticket)"
  class="flex items-center gap-2 px-5 py-2.5 bg-white border border-[rgba(0,0,0,0.12)] rounded-lg..."
>
  Save Ticket
  <svg>...</svg>
</button>
```

---

## 🐛 Issues with Current Selectors

### Issue 1: Wrong Button Selector

**Current Code**:
```typescript
const paidButton = page.getByRole('button', { name: /Paid/i })
  .or(page.locator('button').filter({ hasText: /Paid.*\+|\+.*Paid/i }));
```

**Problem**: 
- The button text is just `"Paid"` (not "Paid +")
- The plus icon is a separate SVG, not part of the button text
- `getByRole('button', { name: /Paid/i })` should work, but may not match because the SVG is a child element

**Correct Selector**:
```typescript
// Option 1: Get button containing "Paid" text
const paidButton = page.getByRole('button', { name: /^Paid$/i });

// Option 2: More specific - button in footer section
const paidButton = page.locator('div.bg-\\[\\#f5f5f5\\] button')
  .filter({ hasText: /^Paid$/i })
  .first();
```

### Issue 2: Buttons Are Disabled Because of Unsaved Ticket

**Root Cause**: 
- Component auto-creates a ticket with `isEditing=true, isSaved=false`
- `canAddTicket()` returns `false` when `hasUnsavedTickets()` is `true`
- Buttons remain disabled until the existing ticket is saved

**Solution**: 
- **First**, check if there's an existing unsaved ticket
- **Fill and save** the existing ticket first
- **Then** add new tickets

### Issue 3: Ticket Fields Are Already Visible

**Current Assumption**: Test assumes clicking "+" button creates a ticket row

**Reality**: 
- Ticket row already exists (auto-created)
- Fields are already visible and editable
- No need to click "+" button first - just fill the existing ticket

---

## ✅ Corrected Flow

### Step 1: Check for Existing Tickets

```typescript
// Check if there are any tickets already (component auto-creates one)
const existingTicketRows = page.locator('[class*="ticket"], [class*="row"]')
  .filter({ hasText: /ticket/i });
const ticketCount = await existingTicketRows.count();

if (ticketCount > 0) {
  console.log(`Found ${ticketCount} existing ticket(s) - will fill and save first`);
}
```

### Step 2: Fill Existing Ticket (if any)

```typescript
// Find the ticket name input (should already be visible)
const ticketNameInput = page.locator('input[placeholder*="Name of ticket"]')
  .or(page.locator('input').filter({ hasText: /Ticket Name/i }))
  .first();

if (await ticketNameInput.isVisible({ timeout: 3000 })) {
  // Fill ticket name
  await ticketNameInput.fill(ticket.name);
  
  // Fill price (if Paid ticket)
  if (ticket.type === 'Paid') {
    const priceInput = page.locator('input[placeholder*="00.00"]')
      .or(page.locator('input[type="number"]').filter({ hasText: /MYR/i }))
      .first();
    await priceInput.fill(ticket.price.toString());
  }
  
  // Fill quantity
  const quantityInput = page.locator('input[placeholder*="1"]')
    .or(page.locator('input[type="number"]'))
    .filter({ hasText: /quantity/i })
    .first();
  await quantityInput.fill(ticket.quantity.toString());
  
  // Click Save Ticket button
  const saveButton = page.getByRole('button', { name: /Save Ticket/i });
  await saveButton.click();
  await page.waitForTimeout(1000);
}
```

### Step 3: Add New Tickets (after saving existing)

```typescript
// Now buttons should be enabled
const paidButton = page.getByRole('button', { name: /^Paid$/i })
  .filter({ hasText: /Paid/i });

// Wait for button to be enabled
await expect(paidButton).toBeEnabled({ timeout: 5000 });
await paidButton.click();
```

---

## 🔧 Required Fixes

### Fix 1: Update Button Selectors

**Current**:
```typescript
const paidButton = page.getByRole('button', { name: /Paid/i })
  .or(page.locator('button').filter({ hasText: /Paid.*\+|\+.*Paid/i }));
```

**Fixed**:
```typescript
// More specific selector - button in footer with exact text "Paid"
const paidButton = page.locator('div.bg-\\[\\#f5f5f5\\] button')
  .filter({ hasText: /^Paid$/i })
  .first();

// Or simpler:
const paidButton = page.getByRole('button', { name: /^Paid$/i })
  .filter({ hasText: /Paid/i });
```

### Fix 2: Handle Existing Tickets First

**Add logic to**:
1. Check if tickets already exist
2. Fill and save existing tickets first
3. Then add new tickets

### Fix 3: Update Field Selectors

**Current selectors may be too generic**. Use more specific selectors:

```typescript
// Ticket Name - more specific
const ticketNameInput = page.locator('input[placeholder="Name of ticket"]')
  .or(page.locator('input[type="text"]').filter({ hasText: /Ticket Name/i }));

// Price - look for input with currency prefix
const priceInput = page.locator('input[placeholder="00.00"]')
  .filter({ hasText: /MYR|RM/i })
  .or(page.locator('div.relative input[type="number"]'));

// Quantity - look for number input with placeholder "1"
const quantityInput = page.locator('input[placeholder="1"][type="number"]')
  .or(page.locator('input[type="number"]').filter({ hasText: /quantity/i }));
```

---

## 📊 Component Behavior Summary

| Aspect | Behavior |
|--------|----------|
| **Initial State** | Auto-creates 1 "Paid" ticket with `isEditing=true, isSaved=false` |
| **Button State** | Disabled when `hasUnsavedTickets() === true` |
| **Button Text** | Just "Paid" or "Free" (plus icon is separate SVG) |
| **Button Location** | Footer section with class `bg-[#f5f5f5]` |
| **Ticket Fields** | Already visible when ticket is in editing mode |
| **Save Requirement** | Must save ticket before adding another |

---

## 🎯 Recommended Test Flow

1. **Navigate to Tickets Page**
2. **Check for Existing Tickets**
   - Component auto-creates one ticket
   - Fields should already be visible
3. **Fill Existing Ticket** (if any)
   - Ticket Name
   - Standard Rate (if Paid)
   - Quantity
   - Click "Save Ticket"
4. **Verify Ticket Saved**
   - Check that "Save Ticket" button is gone or disabled
   - Check that add buttons are now enabled
5. **Add New Tickets** (if needed)
   - Click "Paid" or "Free" button
   - Fill ticket details
   - Save ticket
6. **Verify All Tickets**
   - Check ticket count matches expected
   - Verify ticket names are visible

---

## 🔍 Debugging Steps

To debug why buttons are disabled:

1. **Check ticket count**: `tickets().length`
2. **Check unsaved tickets**: `hasUnsavedTickets()`
3. **Check max tickets**: `maxTickets()` (default: 10)
4. **Inspect button state**: Check `[disabled]="!canAddTicket()"` attribute
5. **Check console**: Look for any errors in browser console

---

## 📝 Next Steps

1. ✅ Update button selectors to match actual HTML structure
2. ✅ Add logic to handle existing tickets first
3. ✅ Update field selectors to be more specific
4. ✅ Add verification that tickets were saved before adding new ones
5. ✅ Test the updated flow

---

**Last Updated**: February 3, 2026  
**Component**: `ui-experience-ticket-form`  
**Location**: `projects/mereka/ui/src/lib/components/experience-ticket-form/`
