# Task 6: Express Server Setup

## Objective
Create main Express server with endpoints for the $purge operation.

## File to create:
- `src/index.ts`

## Server configuration:
- Express server listening on port 3000
- JSON middleware for parsing requests
- CORS middleware if needed
- Basic logging

## Endpoints needed:

### 1. POST /purge/:patientId
- Main $purge operation endpoint called by Aidbox
- Validates patient ID format
- Initiates asynchronous purge process
- Returns 202 Accepted with operation ID

### 2. GET /purge-status/:operationId
- Check status of ongoing purge operation
- Returns current progress and status
- Includes error information if failed

### 3. GET /purge-operations (optional)
- List all purge operations
- Useful for debugging and monitoring

### 4. POST /test-purge/:patientId (development only)
- Direct endpoint for testing without going through Aidbox
- Same logic as main endpoint but different response format

## Error handling:
- 404 for non-existent operations
- 400 for invalid patient IDs
- 500 for server errors
- Proper HTTP status codes

## Success criteria:
- Server starts without errors
- All endpoints respond correctly
- Can handle concurrent requests
- Memory storage for operations works
- Integration with Aidbox App works