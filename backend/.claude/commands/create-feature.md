# Create Feature (Full Stack)

Create a complete feature with service, controller, and routes for: $ARGUMENTS

## Instructions

When creating a new feature, follow this COMPLETE workflow:

### Step 1: Determine the Module

Ask which module this feature belongs to:
- **admin** → Admin panel only (admin.mereka.io)
- **hub** → Hub dashboard (app.mereka.io - hub features)
- **web** → Public/user facing (mereka.io, app.mereka.io)
- **shared** → Cross-app (auth, payments)

### Step 2: Create Core Service

**Location:** `src/core/services/{module}/{domain}/{name}.service.ts`

```typescript
// Example: src/core/services/hub/bookings/hubBooking.service.ts
import { Booking } from '@core/models/Booking';
import type { CreateBookingInput, GetBookingsQuery } from '@core/schemas/booking.schema';

export class HubBookingService {
  /**
   * Create a new booking
   */
  async create(data: CreateBookingInput, userId: string) {
    return await Booking.create({ ...data, createdBy: userId });
  }

  /**
   * Get bookings with pagination
   */
  async list(query: GetBookingsQuery) {
    const { page = 1, limit = 20, hubId, status } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (hubId) filter.hubId = hubId;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Booking.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get booking by ID
   */
  async getById(id: string) {
    const booking = await Booking.findById(id).lean();
    if (!booking) throw new Error('Booking not found');
    return booking;
  }

  /**
   * Update booking
   */
  async update(id: string, data: Partial<CreateBookingInput>) {
    const booking = await Booking.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (!booking) throw new Error('Booking not found');
    return booking;
  }

  /**
   * Delete booking
   */
  async delete(id: string) {
    const booking = await Booking.findByIdAndDelete(id).lean();
    if (!booking) throw new Error('Booking not found');
    return { message: 'Booking deleted successfully' };
  }
}

export const hubBookingService = new HubBookingService();
```

### Step 3: Create Service Index

**Location:** `src/core/services/{module}/{domain}/index.ts`

```typescript
export * from './hubBooking.service';
```

Update parent index:
```typescript
// src/core/services/{module}/index.ts
export * from './bookings';
```

### Step 4: Create Controller

**Location:** `src/modules/{module}/controllers/{domain}/{name}.controller.ts`

```typescript
// Example: src/modules/hub/controllers/bookings/hubBooking.controller.ts
import type { CreateBookingInput, GetBookingsQuery, BookingIdParam } from '@core/schemas/booking.schema';
import { hubBookingService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List bookings
 */
export async function listBookings(
  request: FastifyRequest<{ Querystring: GetBookingsQuery }>,
  reply: FastifyReply
) {
  try {
    const result = await hubBookingService.list(request.query);
    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list bookings');
    return reply.status(500).send({
      success: false,
      error: { code: 'BOOKING_LIST_ERROR', message: 'Failed to list bookings' },
    });
  }
}

/**
 * Get booking by ID
 */
export async function getBookingById(
  request: FastifyRequest<{ Params: BookingIdParam }>,
  reply: FastifyReply
) {
  try {
    const booking = await hubBookingService.getById(request.params.id);
    return reply.send({ success: true, data: booking });
  } catch (error) {
    request.log.error({ error }, 'Failed to get booking');
    const statusCode = (error as Error).message === 'Booking not found' ? 404 : 500;
    return reply.status(statusCode).send({
      success: false,
      error: { code: 'BOOKING_NOT_FOUND', message: (error as Error).message },
    });
  }
}

/**
 * Create booking
 */
export async function createBooking(
  request: FastifyRequest<{ Body: CreateBookingInput }>,
  reply: FastifyReply
) {
  try {
    const booking = await hubBookingService.create(request.body, request.user!.id);
    return reply.status(201).send({ success: true, data: booking });
  } catch (error) {
    request.log.error({ error }, 'Failed to create booking');
    return reply.status(400).send({
      success: false,
      error: { code: 'BOOKING_CREATE_ERROR', message: (error as Error).message },
    });
  }
}

/**
 * Update booking
 */
export async function updateBooking(
  request: FastifyRequest<{ Params: BookingIdParam; Body: Partial<CreateBookingInput> }>,
  reply: FastifyReply
) {
  try {
    const booking = await hubBookingService.update(request.params.id, request.body);
    return reply.send({ success: true, data: booking });
  } catch (error) {
    request.log.error({ error }, 'Failed to update booking');
    const statusCode = (error as Error).message === 'Booking not found' ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: { code: 'BOOKING_UPDATE_ERROR', message: (error as Error).message },
    });
  }
}

/**
 * Delete booking
 */
export async function deleteBooking(
  request: FastifyRequest<{ Params: BookingIdParam }>,
  reply: FastifyReply
) {
  try {
    const result = await hubBookingService.delete(request.params.id);
    return reply.send({ success: true, message: result.message });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete booking');
    return reply.status(404).send({
      success: false,
      error: { code: 'BOOKING_NOT_FOUND', message: (error as Error).message },
    });
  }
}
```

### Step 5: Create Controller Index

```typescript
// src/modules/{module}/controllers/{domain}/index.ts
export * from './hubBooking.controller';
```

Update parent index:
```typescript
// src/modules/{module}/controllers/index.ts
export * from './bookings';
```

### Step 6: Create Routes

**Location:** `src/modules/{module}/routes/{domain}/{name}.routes.ts`

```typescript
// Example: src/modules/hub/routes/bookings/hubBooking.routes.ts
import {
  createBookingSchema,
  updateBookingSchema,
  getBookingsQuerySchema,
  bookingIdParamSchema,
} from '@core/schemas/booking.schema';
import type { FastifyInstance } from 'fastify';
import {
  createBooking,
  deleteBooking,
  getBookingById,
  listBookings,
  updateBooking,
} from '@controllers/hub';

export async function hubBookingRoutes(fastify: FastifyInstance): Promise<void> {
  // List bookings
  fastify.get('/', {
    schema: {
      tags: ['Hub Bookings'],
      summary: 'List bookings',
      querystring: getBookingsQuerySchema,
    },
    handler: listBookings,
  });

  // Get booking by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Hub Bookings'],
      summary: 'Get booking by ID',
      params: bookingIdParamSchema,
    },
    handler: getBookingById,
  });

  // Create booking
  fastify.post('/', {
    schema: {
      tags: ['Hub Bookings'],
      summary: 'Create booking',
      body: createBookingSchema,
    },
    handler: createBooking,
  });

  // Update booking
  fastify.patch('/:id', {
    schema: {
      tags: ['Hub Bookings'],
      summary: 'Update booking',
      params: bookingIdParamSchema,
      body: updateBookingSchema,
    },
    handler: updateBooking,
  });

  // Delete booking
  fastify.delete('/:id', {
    schema: {
      tags: ['Hub Bookings'],
      summary: 'Delete booking',
      params: bookingIdParamSchema,
    },
    handler: deleteBooking,
  });
}
```

### Step 7: Create Routes Index

```typescript
// src/modules/{module}/routes/{domain}/index.ts
export * from './hubBooking.routes';
```

Update parent index:
```typescript
// src/modules/{module}/routes/index.ts
export * from './bookings';
```

### Step 8: Register Routes

Add to module's `index.ts`:
```typescript
// src/modules/hub/index.ts
export async function hubModule(fastify: FastifyInstance) {
  const routes = await import('@routes/hub');
  // ... existing routes
  await fastify.register(routes.hubBookingRoutes, { prefix: '/bookings' });
}
```

### Step 9: Create Tests

Create unit test for service:
```typescript
// tests/unit/modules/hub/booking.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@core/models/Booking');

import { Booking } from '@core/models/Booking';
import { hubBookingService } from '@services/hub';

describe('HubBookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated bookings', async () => {
      // Test implementation
    });
  });
});
```

### Checklist

- [ ] Service created in `src/core/services/{module}/{domain}/`
- [ ] Service exported in index files
- [ ] Controller created in `src/modules/{module}/controllers/{domain}/`
- [ ] Controller exported in index files
- [ ] Routes created in `src/modules/{module}/routes/{domain}/`
- [ ] Routes exported in index files
- [ ] Routes registered in module's index.ts
- [ ] Unit tests created
- [ ] Type check passes: `npm run type-check`
