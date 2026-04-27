# 📖 Subscription Product API Documentation

**Version**: 1.0
**Status**: Production Ready

---

## 📋 API Endpoints (5 Total)

### Public Endpoints (2)

1. GET `/subscription/plans` - Get all plans
2. GET `/subscription/plans/:planCode` - Get specific plan

### Admin Endpoints (3)

3. POST `/subscription/plans` - Create plan
4. PATCH `/subscription/plans/:planCode` - Update plan
5. DELETE `/subscription/plans/:planCode` - Delete plan

---

## 1. GET /api/v1/subscription/plans

**Purpose**: Get all active subscription plans for pricing page

**Request**:

```
GET /api/v1/subscription/plans
```

**Response**:

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "_id": "...",
        "planCode": "scale",
        "name": "Scale",
        "tagline": "For solo experts and consultants",
        "description": "Perfect for freelancers...",
        "price": 9900,
        "currency": "USD",
        "stripePriceId": {
          "malaysia": "price_scale_my_monthly",
          "atlas": "price_scale_atlas_monthly"
        },
        "stripeProductId": {
          "malaysia": "prod_scale_my",
          "atlas": "prod_scale_atlas"
        },
        "features": ["Expert profile", "Business hub", "Up to 5 team members"],
        "isActive": true,
        "sortOrder": 1
      },
      {
        "_id": "...",
        "planCode": "soar",
        "name": "Soar",
        "tagline": "For organizations and spaces",
        "description": "Perfect for makerspaces...",
        "price": 19900,
        "currency": "USD",
        "stripePriceId": {
          "malaysia": "price_soar_my_monthly",
          "atlas": "price_soar_atlas_monthly"
        },
        "features": ["Business hub", "Unlimited team members", "Priority support"],
        "isActive": true,
        "sortOrder": 2
      }
    ]
  }
}
```

**Use Case**: Display on pricing page at /hub-onboard/form

---

## 2. GET /api/v1/subscription/plans/:planCode

**Purpose**: Get specific plan details

**Request**:

```
GET /api/v1/subscription/plans/scale
```

**Response**: Same as single plan object above

---

## 3. POST /api/v1/subscription/plans (Admin)

**Purpose**: Create new subscription plan

**Authentication**: Required (admin)

**Request**:

```json
{
  "planCode": "scale",
  "name": "Scale",
  "tagline": "For solo experts and consultants",
  "description": "Perfect for freelancers and solo consultants",
  "price": 9900,
  "currency": "USD",
  "stripePriceId": {
    "malaysia": "price_scale_my_monthly",
    "atlas": "price_scale_atlas_monthly"
  },
  "stripeProductId": {
    "malaysia": "prod_scale_my",
    "atlas": "prod_scale_atlas"
  },
  "features": ["Expert profile", "Business hub", "Portfolio showcase"],
  "sortOrder": 1
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    // Full plan object
  },
  "message": "Subscription plan created successfully"
}
```

---

## 4. PATCH /api/v1/subscription/plans/:planCode (Admin)

**Purpose**: Update plan (e.g., change price, features)

**Request**:

```json
{
  "price": 8900,
  "features": ["Expert profile", "Business hub", "Up to 10 team members"]
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    // Updated plan object
  },
  "message": "Subscription plan updated successfully"
}
```

---

## 5. DELETE /api/v1/subscription/plans/:planCode (Admin)

**Purpose**: Soft delete plan (sets isActive=false)

**Request**:

```
DELETE /api/v1/subscription/plans/scale
Authorization: Bearer <token>
```

**Response**:

```json
{
  "success": true,
  "message": "Subscription plan deleted successfully"
}
```

---

## 🌍 Dual Stripe Account Support

The model stores Stripe IDs for **two accounts**:

- **Malaysia**: For Malaysian customers
- **Atlas**: For international customers

**Backend selects correct ID based on user's country**:

```typescript
if (userCountry === 'Malaysia') {
  use stripePriceId.malaysia
} else {
  use stripePriceId.atlas
}
```

---

## 🧪 Testing

### Setup Plans (Once)

```bash
# Create Scale plan
curl -X POST http://localhost:3000/api/v1/subscription/plans \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planCode": "scale",
    "name": "Scale",
    "tagline": "For solo experts",
    "description": "...",
    "price": 9900,
    "stripePriceId": {"malaysia": "price_xxx", "atlas": "price_yyy"},
    "stripeProductId": {"malaysia": "prod_xxx", "atlas": "prod_yyy"},
    "features": ["Expert profile", "Hub"]
  }'

# Create Soar plan (similar)
```

### Get Plans (Public)

```bash
# For pricing page
curl http://localhost:3000/api/v1/subscription/plans
```

---

## 📊 Plan Data Example

**Scale Plan**:

- Price: $99/month (9900 cents)
- For: Solo experts
- Features: Expert profile + Hub
- Stripe IDs: Separate for MY and Atlas

**Soar Plan**:

- Price: $199/month (19900 cents)
- For: Organizations
- Features: Hub with advanced features
- Stripe IDs: Separate for MY and Atlas

---

**All tested and working!** ✅
