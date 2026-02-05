# OLYMPUS Test Suite

Comprehensive test suite for the OLYMPUS system.

## Overview

- **Backend Tests**: 43 tests covering API endpoints
- **Frontend Tests**: 47 tests covering components and integration
- **Total**: 90 tests

## Backend Tests

Location: `backend/src/tests/`

### Files
- `agents.test.ts` - 10 tests for /api/agents endpoints
- `tasks.test.ts` - 17 tests for /api/tasks endpoints  
- `metrics.test.ts` - 8 tests for /api/metrics endpoints
- `activities.test.ts` - 8 tests for /api/activities endpoints

### Coverage
- ✅ All GET endpoints tested
- ✅ All POST endpoints tested
- ✅ All PATCH endpoints tested
- ✅ Error handling verified
- ✅ Database operations mocked and tested

## Frontend Tests

Location: `frontend/src/tests/`

### Files
- `Dashboard.test.tsx` - 15 tests for Dashboard component
- `components.test.tsx` - 17 tests for Layout, Sidebar, Header, App
- `integration.test.ts` - 15 integration tests

### Coverage
- ✅ Dashboard renders correctly
- ✅ Navigation works
- ✅ Agent cards display data
- ✅ Component integration verified
- ✅ Full task lifecycle tested
- ✅ API contract validation

## Running Tests

### Backend
```bash
cd backend
npm test           # Run all tests
npm run test:watch # Watch mode
npm run test:coverage # With coverage report
```

### Frontend
```bash
cd frontend
npm test           # Run all tests
npm run test:watch # Watch mode
npm run test:coverage # With coverage report
```

## Test Configuration

### Backend (vitest.config.ts)
- Environment: Node.js
- Coverage threshold: 70%
- Globals enabled

### Frontend (vitest.config.ts)
- Environment: JSDOM
- Coverage threshold: 70%
- Setup file: `src/tests/setup.ts`

## Key Test Scenarios

### Task Lifecycle
1. Create task → Returns 201 with task data
2. Assign to agent → Updates assignee_id and status
3. Update status → Tracks completed_at when done
4. Complete workflow → Agent freed, task marked done

### Error Handling
- 404 for non-existent resources
- 400 for invalid input
- 500 for database errors

### API Contracts
- Response structures validated
- Required fields verified
- Type checking enforced

## Acceptance Criteria

- [x] All backend endpoints have tests
- [x] Frontend components render without errors
- [x] Integration test covers full task lifecycle
- [x] `npm test` runs successfully in both directories
- [x] Test coverage > 70% (configured)

## Notes

- Supabase client is mocked in backend tests
- React Query is mocked in frontend tests
- Mock data represents realistic OLYMPUS scenarios
