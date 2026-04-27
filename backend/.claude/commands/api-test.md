# API Test Command

Create HTTP test files for manual API testing.

## Usage

`/api-test <feature-name>`

## Tasks

1. **Identify Endpoints**:
   - Find all routes for the feature
   - List authentication requirements
   - Document request/response formats

2. **Create .http File**:
   - Create `tests/http/<feature>.http`
   - Add all endpoints with examples
   - Include authentication headers
   - Add test data
   - Comment with expected responses

3. **Add Variables**:
   - Base URL
   - Auth tokens
   - Test IDs
   - Common payloads

## Example Structure

```http
### Variables
@baseUrl = http://localhost:3000/api/v1
@token = your-jwt-token-here

### Create User
POST {{baseUrl}}/users
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "Test User"
}

### Get Users
GET {{baseUrl}}/users
Authorization: Bearer {{token}}
```

## Success Criteria

- HTTP file created with all endpoints
- Includes authentication examples
- Test data is valid
- Comments explain expected responses
