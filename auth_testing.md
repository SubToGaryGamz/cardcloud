[Auth Testing Playbook from integration_playbook_expert_v2 — applies if testing the Emergent Google Auth flow.]

## Auth-Gated App Testing Playbook

### Step 1: Create Test User & Session via mongosh
```
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  auth_provider: 'google',
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
```

### Step 2: Test Backend API
```
curl -X GET "$API/api/auth/me" -H "Authorization: Bearer $SESSION_TOKEN"
curl -X GET "$API/api/cards" -H "Authorization: Bearer $SESSION_TOKEN"
```

### Step 3: For browser tests, use the JWT login endpoint /api/auth/login
which accepts email/password and returns a token. Use the token via
Authorization: Bearer header. Frontend stores the token in localStorage as
`cv_token`.

### Notes
- All cards endpoints require Authorization: Bearer <token>
- All API routes are under /api prefix
- Status values: "in_collection" | "sold"
- Profit only counted for sold cards
