/**
 * AssetFlow end-to-end integration verification script.
 * Run against a live server: node scripts/e2e-integration-test.js
 */
const URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const PASSWORD = 'Password123!';

const results = [];
let failed = 0;

function pass(step, detail) {
  results.push({ step, status: 'PASS', detail });
  console.log(`✓ Step ${step}: ${detail}`);
}

function fail(step, detail, body) {
  failed += 1;
  results.push({ step, status: 'FAIL', detail, body });
  console.error(`✗ Step ${step}: ${detail}`);
  if (body) console.error(JSON.stringify(body, null, 2));
}

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email) {
  const { status, data } = await fetchJSON('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (status !== 200 || !data.token) {
    throw new Error(`Login failed for ${email}: ${status} ${JSON.stringify(data)}`);
  }
  return data.token;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function run() {
  console.log('=== AssetFlow E2E Integration Test ===\n');

  // Step 0: Maintenance history on asset detail
  try {
    const adminToken0 = await login('ananya.admin@assetflow.com');
    const { data: maintenance } = await fetchJSON('/maintenance-requests', { headers: auth(adminToken0) });
    const withHistory = maintenance.find((m) => m.status === 'Resolved') || maintenance[0];
    if (!withHistory) throw new Error('No maintenance requests in seed data');

    const { status, data: asset } = await fetchJSON(`/assets/${withHistory.asset_id}`, {
      headers: auth(adminToken0),
    });
    if (
      status === 200 &&
      Array.isArray(asset.maintenance_history) &&
      asset.maintenance_history.length > 0 &&
      asset.maintenance_history[0].issue_description
    ) {
      pass('0', `Asset ${withHistory.asset_id} has ${asset.maintenance_history.length} maintenance_history rows`);
    } else {
      fail('0', 'maintenance_history missing or empty on asset detail', { status, maintenance_history: asset.maintenance_history });
    }
  } catch (err) {
    fail('0', err.message);
  }

  let adminToken;
  let managerToken;
  let managerUser;
  let employee1Token;
  let employee2Token;
  let employee1;
  let employee2;
  let newAssetId;
  let transferRequestId;
  let maintenanceRequestId;
  let auditCycleId;
  let auditAssetId;
  let bookingAssetId;
  let categoryId;
  let engineeringDeptId;

  try {
    // 1. Login as Admin
    adminToken = await login('ananya.admin@assetflow.com');
    pass(1, 'Admin login successful');
  } catch (err) {
    fail(1, err.message);
    return summarize();
  }

  try {
    // 2. Promote Employee to AssetManager
    const { data: employees } = await fetchJSON('/employees', { headers: auth(adminToken) });
    employee1 = employees.find((e) => e.email === 'amit@assetflow.com');
    if (!employee1) throw new Error('amit@assetflow.com not found');

    const { status, data } = await fetchJSON(`/employees/${employee1.id}/role`, {
      method: 'PUT',
      headers: auth(adminToken),
      body: JSON.stringify({ role: 'AssetManager' }),
    });
    if (status === 200 && data.role === 'AssetManager') {
      pass(2, `Promoted ${employee1.email} to AssetManager`);
    } else {
      fail(2, 'Role promotion failed', { status, data });
    }
  } catch (err) {
    fail(2, err.message);
  }

  try {
    // 3. Login as AssetManager
    managerToken = await login('amit@assetflow.com');
    const { data: me } = await fetchJSON('/employees', { headers: auth(managerToken) });
    managerUser = me.find((e) => e.email === 'amit@assetflow.com');
    pass(3, 'AssetManager login successful');
  } catch (err) {
    fail(3, err.message);
  }

  try {
    // 4. Register new asset
    const { data: categories } = await fetchJSON('/asset-categories', { headers: auth(managerToken) });
    categoryId = categories.find((c) => c.name === 'Electronics')?.id || categories[0].id;

    const { status, data: asset } = await fetchJSON('/assets', {
      method: 'POST',
      headers: auth(managerToken),
      body: JSON.stringify({
        name: 'E2E Test Laptop',
        category_id: categoryId,
        serial_number: 'E2E-TEST-001',
        location: 'HQ-3F',
        is_bookable: false,
      }),
    });
    if (status === 201 && asset.id) {
      newAssetId = asset.id;
      pass(4, `Created asset ${asset.asset_tag} (id=${newAssetId})`);
    } else {
      fail(4, 'Asset creation failed', { status, asset });
    }
  } catch (err) {
    fail(4, err.message);
  }

  try {
    // 5. Confirm Available
    const { status, data: asset } = await fetchJSON(`/assets/${newAssetId}`, { headers: auth(managerToken) });
    if (status === 200 && asset.status === 'Available') {
      pass(5, `Asset status is Available`);
    } else {
      fail(5, `Expected Available, got ${asset?.status}`, { status, asset });
    }
  } catch (err) {
    fail(5, err.message);
  }

  try {
    // 6. Allocate to employee1 (Priya)
    const { data: employees } = await fetchJSON('/employees', { headers: auth(adminToken) });
    const priya = employees.find((e) => e.email === 'priya@assetflow.com');
    const eng = employees.find((e) => e.department_id && e.email === 'arjun@assetflow.com');
    engineeringDeptId = priya.department_id;

    const future = new Date();
    future.setMonth(future.getMonth() + 2);

    const { status, data } = await fetchJSON(`/assets/${newAssetId}/allocate`, {
      method: 'POST',
      headers: auth(managerToken),
      body: JSON.stringify({
        employee_id: priya.id,
        department_id: engineeringDeptId,
        expected_return_date: future.toISOString().slice(0, 10),
      }),
    });
    if (status === 200 && data.status === 'Active') {
      pass(6, `Allocated to Priya (allocation_id=${data.allocation_id})`);
    } else {
      fail(6, 'Allocation failed', { status, data });
    }
  } catch (err) {
    fail(6, err.message);
  }

  try {
    // 7. Double allocation → 409
    const { data: employees } = await fetchJSON('/employees', { headers: auth(adminToken) });
    employee2 = employees.find((e) => e.email === 'arjun@assetflow.com');
    const future = new Date();
    future.setMonth(future.getMonth() + 2);

    const { status, data } = await fetchJSON(`/assets/${newAssetId}/allocate`, {
      method: 'POST',
      headers: auth(managerToken),
      body: JSON.stringify({
        employee_id: employee2.id,
        department_id: engineeringDeptId,
        expected_return_date: future.toISOString().slice(0, 10),
      }),
    });
    if (status === 409 && data.suggest_transfer && data.current_holder) {
      pass(7, `409 with current_holder=${data.current_holder.name}, suggest_transfer=true`);
    } else {
      fail(7, 'Expected 409 double-allocation', { status, data });
    }
  } catch (err) {
    fail(7, err.message);
  }

  try {
    // 8. Transfer request from second employee — must login as holder (Priya)
    employee1Token = await login('priya@assetflow.com');
    employee2Token = await login('arjun@assetflow.com');

    const { status: badStatus } = await fetchJSON(`/assets/${newAssetId}/transfer-request`, {
      method: 'POST',
      headers: auth(employee2Token),
      body: JSON.stringify({ to_user_id: employee2.id }),
    });
    if (badStatus === 403) {
      pass('8a', 'Non-holder correctly gets 403 on transfer-request');
    } else {
      fail('8a', `Non-holder should get 403, got ${badStatus}`);
    }

    const { status, data } = await fetchJSON(`/assets/${newAssetId}/transfer-request`, {
      method: 'POST',
      headers: auth(employee1Token),
      body: JSON.stringify({ to_user_id: employee2.id }),
    });
    if (status === 201 && data.id) {
      transferRequestId = data.id;
      pass(8, `Transfer request created (id=${transferRequestId})`);
    } else {
      fail(8, 'Transfer request failed', { status, data });
    }
  } catch (err) {
    fail(8, err.message);
  }

  try {
    // 9. Approve transfer
    const { status, data } = await fetchJSON(`/transfer-requests/${transferRequestId}/approve`, {
      method: 'POST',
      headers: auth(managerToken),
      body: JSON.stringify({ decision: 'Approved' }),
    });
    const { data: asset } = await fetchJSON(`/assets/${newAssetId}`, { headers: auth(managerToken) });
    const active = asset.allocation_history.filter((a) => a.status === 'Active');
    const returned = asset.allocation_history.filter((a) => a.status === 'Returned');
    if (
      status === 200 &&
      active.length === 1 &&
      active[0].employee_id === employee2.id &&
      returned.length >= 1
    ) {
      pass(9, `Transfer approved; holder is Arjun; history has Returned + Active rows`);
    } else {
      fail(9, 'Transfer approval or allocation history incorrect', { status, data, active, returned });
    }
  } catch (err) {
    fail(9, err.message);
  }

  try {
    // 10. Book shared resource
    const { data: assets } = await fetchJSON('/assets?status=Available', { headers: auth(managerToken) });
    const bookable = assets.find((a) => a.is_bookable && a.asset_tag === 'AF-0014') ||
      assets.find((a) => a.is_bookable);
    bookingAssetId = bookable.id;

    const { status, data } = await fetchJSON('/bookings', {
      method: 'POST',
      headers: auth(employee1Token),
      body: JSON.stringify({
        resource_asset_id: bookingAssetId,
        start_time: '2026-08-01T14:00:00',
        end_time: '2026-08-01T15:00:00',
      }),
    });
    if (status === 201 && data.id) {
      pass(10, `Booking created on ${bookable.asset_tag}`);
    } else {
      fail(10, 'Booking creation failed', { status, data });
    }
  } catch (err) {
    fail(10, err.message);
  }

  try {
    // 11. Overlapping booking → 409
    const { status, data } = await fetchJSON('/bookings', {
      method: 'POST',
      headers: auth(employee2Token),
      body: JSON.stringify({
        resource_asset_id: bookingAssetId,
        start_time: '2026-08-01T14:30:00',
        end_time: '2026-08-01T15:30:00',
      }),
    });
    if (status === 409 && data.error === true) {
      pass(11, 'Overlapping booking correctly returns 409');
    } else {
      fail(11, 'Expected 409 overlap', { status, data });
    }
  } catch (err) {
    fail(11, err.message);
  }

  try {
    // 12. Raise maintenance request
    const { data: assets } = await fetchJSON('/assets?status=Available', { headers: auth(managerToken) });
    const target = assets.find((a) => a.asset_tag === 'AF-0017') || assets[0];

    const { status, data } = await fetchJSON('/maintenance-requests', {
      method: 'POST',
      headers: auth(employee1Token),
      body: JSON.stringify({
        asset_id: target.id,
        issue_description: 'E2E test issue - webcam not detected',
        priority: 'Medium',
      }),
    });
    if (status === 201 && data.id) {
      maintenanceRequestId = data.id;
      pass(12, `Maintenance request raised on ${target.asset_tag} (id=${maintenanceRequestId})`);
    } else {
      fail(12, 'Maintenance request failed', { status, data });
    }
  } catch (err) {
    fail(12, err.message);
  }

  try {
    // 13. Approve maintenance → Under Maintenance
    const { status: approveStatus } = await fetchJSON(`/maintenance-requests/${maintenanceRequestId}/status`, {
      method: 'PUT',
      headers: auth(managerToken),
      body: JSON.stringify({ status: 'Approved' }),
    });
    const maint = (await fetchJSON('/maintenance-requests', { headers: auth(adminToken) })).data
      .find((m) => m.id === maintenanceRequestId);
    const { data: asset } = await fetchJSON(`/assets/${maint.asset_id}`, { headers: auth(managerToken) });
    if (approveStatus === 200 && asset.status === 'Under Maintenance') {
      pass(13, `Maintenance approved; asset status=${asset.status}`);
    } else {
      fail(13, 'Maintenance approval or asset status wrong', { approveStatus, assetStatus: asset?.status });
    }
  } catch (err) {
    fail(13, err.message);
  }

  try {
    // 14. Resolve maintenance → Available
    const { status: resolveStatus } = await fetchJSON(`/maintenance-requests/${maintenanceRequestId}/status`, {
      method: 'PUT',
      headers: auth(managerToken),
      body: JSON.stringify({ status: 'TechnicianAssigned', technician: 'E2E Tech' }),
    });
    const { status: progressStatus } = await fetchJSON(`/maintenance-requests/${maintenanceRequestId}/status`, {
      method: 'PUT',
      headers: auth(managerToken),
      body: JSON.stringify({ status: 'InProgress' }),
    });
    const { status: resolvedStatus } = await fetchJSON(`/maintenance-requests/${maintenanceRequestId}/status`, {
      method: 'PUT',
      headers: auth(managerToken),
      body: JSON.stringify({ status: 'Resolved' }),
    });
    const maint = (await fetchJSON('/maintenance-requests', { headers: auth(adminToken) })).data
      .find((m) => m.id === maintenanceRequestId);
    const { data: asset } = await fetchJSON(`/assets/${maint.asset_id}`, { headers: auth(managerToken) });
    if (resolvedStatus === 200 && asset.status === 'Available') {
      pass(14, `Maintenance resolved; asset back to Available`);
    } else {
      fail(14, 'Resolve flow failed', { resolveStatus, progressStatus, resolvedStatus, assetStatus: asset?.status });
    }
  } catch (err) {
    fail(14, err.message);
  }

  try {
    // 15. Audit cycle → Missing → Lost
    const { data: employees } = await fetchJSON('/employees', { headers: auth(adminToken) });
    const sneha = employees.find((e) => e.email === 'sneha.manager@assetflow.com');
    const { data: assets } = await fetchJSON('/assets?status=Available', { headers: auth(adminToken) });
    auditAssetId = assets.find((a) => a.asset_tag === 'AF-0006')?.id || assets[0].id;

    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const { status: cycleStatus, data: cycle } = await fetchJSON('/audit-cycles', {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify({
        scope_department_id: engineeringDeptId,
        date_range_start: today,
        date_range_end: end.toISOString().slice(0, 10),
      }),
    });
    auditCycleId = cycle.id;

    await fetchJSON(`/audit-cycles/${auditCycleId}/assign-auditor`, {
      method: 'POST',
      headers: auth(managerToken),
      body: JSON.stringify({ auditor_id: sneha.id }),
    });

    const snehaToken = await login('sneha.manager@assetflow.com');

    await fetchJSON(`/audit-cycles/${auditCycleId}/findings`, {
      method: 'POST',
      headers: auth(snehaToken),
      body: JSON.stringify({ asset_id: auditAssetId, result: 'Missing', notes: 'E2E audit test' }),
    });

    const { status: closeStatus } = await fetchJSON(`/audit-cycles/${auditCycleId}/close`, {
      method: 'POST',
      headers: auth(managerToken),
    });
    const { data: asset } = await fetchJSON(`/assets/${auditAssetId}`, { headers: auth(adminToken) });
    if (closeStatus === 200 && asset.status === 'Lost') {
      pass(15, `Audit closed; asset ${auditAssetId} status=Lost`);
    } else {
      fail(15, 'Audit close or Lost status wrong', { closeStatus, assetStatus: asset?.status });
    }
  } catch (err) {
    fail(15, err.message);
  }

  try {
    // 16. Dashboard KPIs consistency
    const { status, data: kpis } = await fetchJSON('/dashboard/kpis', { headers: auth(adminToken) });
    const checks = [
      typeof kpis.assets_allocated === 'number',
      typeof kpis.active_bookings === 'number',
      typeof kpis.maintenance_today === 'number',
      kpis.active_bookings >= 1,
      !kpis.error,
    ];
    if (status === 200 && checks.every(Boolean)) {
      pass(16, `KPIs: allocated=${kpis.assets_allocated}, bookings=${kpis.active_bookings}, maintenance_today=${kpis.maintenance_today}`);
    } else {
      fail(16, 'KPIs inconsistent or errored', { status, kpis });
    }
  } catch (err) {
    fail(16, err.message);
  }

  try {
    // 17. Notifications for key events
    const { data: priyaNotifs } = await fetchJSON('/notifications', { headers: auth(employee1Token) });
    const types = priyaNotifs.data.map((n) => n.type);
    const hasBooking = types.includes('BOOKING_CONFIRMED');
    const hasMaintenance = types.some((t) => t.startsWith('MAINTENANCE_'));
    if (hasBooking && hasMaintenance) {
      pass(17, `Priya notifications: booking + maintenance (${types.length} total)`);
    } else {
      fail(17, 'Missing expected notifications', { types });
    }
  } catch (err) {
    fail(17, err.message);
  }

  try {
    // 18. Activity logs
    const { status, data: logs } = await fetchJSON('/activity-logs', { headers: auth(adminToken) });
    const actions = logs.map((l) => l.action);
    const expected = [
      'ASSET_ALLOCATED',
      'TRANSFER_REQUESTED',
      'TRANSFER_APPROVED',
      'BOOKING_CREATED',
      'MAINTENANCE_REQUESTED',
      'MAINTENANCE_STATUS_CHANGED',
      'AUDIT_CYCLE_CREATED',
      'AUDIT_FINDING_RECORDED',
      'AUDIT_CYCLE_CLOSED',
    ];
    const missing = expected.filter((a) => !actions.includes(a));
    if (status === 200 && missing.length === 0) {
      pass(18, `All ${expected.length} expected activity log actions present`);
    } else {
      fail(18, `Missing activity log actions: ${missing.join(', ')}`, { actions: actions.slice(0, 20) });
    }
  } catch (err) {
    fail(18, err.message);
  }

  // Role enforcement spot-checks
  console.log('\n=== Role / Auth Spot Checks ===\n');
  try {
    const empToken = await login('priya@assetflow.com');
    const { data: employees } = await fetchJSON('/employees', { headers: auth(adminToken) });
    const target = employees.find((e) => e.email === 'rohan@assetflow.com');

    const checks = [
      ['PUT /employees/:id/role (Employee)', () => fetchJSON(`/employees/${target.id}/role`, { method: 'PUT', headers: auth(empToken), body: JSON.stringify({ role: 'Admin' }) }), 403],
      ['POST /assets (Employee)', () => fetchJSON('/assets', { method: 'POST', headers: auth(empToken), body: JSON.stringify({ name: 'X', category_id: categoryId }) }), 403],
      ['POST /audit-cycles (Employee)', () => fetchJSON('/audit-cycles', { method: 'POST', headers: auth(empToken), body: JSON.stringify({ date_range_start: '2026-01-01', date_range_end: '2026-12-31' }) }), 403],
      ['No auth header', () => fetchJSON('/dashboard/kpis'), 401],
      ['Garbage JWT', () => fetchJSON('/dashboard/kpis', { headers: { Authorization: 'Bearer garbage.token.here' } }), 401],
    ];

    for (const [label, fn, expected] of checks) {
      const { status, data } = await fn();
      if (status === expected && data.error === true) {
        pass(`auth:${label}`, `Returns ${expected}`);
      } else {
        fail(`auth:${label}`, `Expected ${expected}, got ${status}`, data);
      }
    }
  } catch (err) {
    fail('auth', err.message);
  }

  // Error shape consistency
  console.log('\n=== Error Shape Consistency ===\n');
  try {
    const samples = [
      ['404 asset', () => fetchJSON('/assets/999999', { headers: auth(adminToken) })],
      ['400 validation', () => fetchJSON('/assets', { method: 'POST', headers: auth(managerToken), body: JSON.stringify({ name: '' }) })],
      ['403 role', () => fetchJSON('/activity-logs', { headers: auth(employee1Token || adminToken) })],
      ['401 no token', () => fetchJSON('/employees')],
      ['409 overlap', () => fetchJSON('/bookings', { method: 'POST', headers: auth(employee2Token || adminToken), body: JSON.stringify({ resource_asset_id: bookingAssetId, start_time: '2026-08-01T14:30:00', end_time: '2026-08-01T15:30:00' }) })],
    ];
    for (const [label, fn] of samples) {
      const { status, data } = await fn();
      const ok = data.error === true && typeof data.message === 'string' && !data.stack;
      if (ok) {
        pass(`error:${label}`, `status=${status}, shape OK`);
      } else {
        fail(`error:${label}`, 'Bad error shape or stack leak', { status, data });
      }
    }
  } catch (err) {
    fail('error-shape', err.message);
  }

  summarize();
}

function summarize() {
  console.log('\n=== Summary ===');
  console.log(`Passed: ${results.filter((r) => r.status === 'PASS').length}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
