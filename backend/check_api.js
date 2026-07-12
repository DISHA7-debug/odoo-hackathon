const URL = 'http://localhost:3000/api/v1';

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  try {
    // 1. Log in as Employee and Admin
    const { data: adminLogin } = await fetchJSON('/auth/login', {
      method: 'POST', body: JSON.stringify({ email: 'ananya.admin@assetflow.com', password: 'Password123!' })
    });
    console.log('Admin Token Valid:', !!adminLogin.token);
    const adminToken = adminLogin.token;

    const { data: empLogin } = await fetchJSON('/auth/login', {
      method: 'POST', body: JSON.stringify({ email: 'priya@assetflow.com', password: 'Password123!' })
    });
    console.log('Employee Token Valid:', !!empLogin.token);

    // 2. GET Dashboard KPIs as Admin
    const { data: kpis } = await fetchJSON('/dashboard/kpis', { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('KPIs:', { active_bookings: kpis.active_bookings, maintenance_today: kpis.maintenance_today });

    // 3. GET Maintenance requests
    const { data: maintenance } = await fetchJSON('/maintenance-requests', { headers: { Authorization: `Bearer ${adminToken}` } });
    const states = [...new Set(maintenance.map(m => m.status))];
    console.log('Maintenance States Present:', states.sort());

    // 4. GET /assets/:id for asset with maintenance history
    const resolvedM = maintenance.find(m => m.status === 'Resolved');
    const { data: assetData } = await fetchJSON(`/assets/${resolvedM.asset_id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('Maintenance History Count on Asset:', assetData.maintenance_history ? assetData.maintenance_history.length : 0);

    // 5. POST findings
    // We need to fetch an audit cycle via direct DB because there might not be a GET /audit-cycles endpoint
    // Actually wait, let's look if GET /audit-cycles exists. If not, I'll just use Knex to get cycle ID.
    // Let me just require db directly for IDs that aren't easily listed via API, since this is a quick script.
    const db = require('./src/config/db');
    const cycle = await db('audit_cycles').first();
    const cycleId = cycle.id;
    
    // Log in as assigned auditor (sneha)
    const { data: snehaLogin } = await fetchJSON('/auth/login', {
      method: 'POST', body: JSON.stringify({ email: 'sneha.manager@assetflow.com', password: 'Password123!' })
    });
    // Log in as unassigned manager (rahul)
    const { data: rahulLogin } = await fetchJSON('/auth/login', {
      method: 'POST', body: JSON.stringify({ email: 'rahul.manager@assetflow.com', password: 'Password123!' })
    });

    const { status: snehaStatus, data: snehaData } = await fetchJSON(`/audit-cycles/${cycleId}/findings`, {
      method: 'POST', headers: { Authorization: `Bearer ${snehaLogin.token}` },
      body: JSON.stringify({ asset_id: resolvedM.asset_id, result: 'Verified' }) // finding on resolvedM's asset
    });
    console.log('Assigned Auditor Status:', snehaStatus);

    const { status: rahulStatus, data: rahulData } = await fetchJSON(`/audit-cycles/${cycleId}/findings`, {
      method: 'POST', headers: { Authorization: `Bearer ${rahulLogin.token}` },
      body: JSON.stringify({ asset_id: resolvedM.asset_id, result: 'Verified' })
    });
    console.log('Unassigned Auditor Status:', rahulStatus);

    // 6. POST overlapping booking
    // Grab boardroom AF-0013
    const boardroom = await db('assets').where({ asset_tag: 'AF-0013' }).first();
    const { status: overlapStatus, data: overlapData } = await fetchJSON('/bookings', {
      method: 'POST', headers: { Authorization: `Bearer ${empLogin.token}` },
      body: JSON.stringify({ resource_asset_id: boardroom.id, start_time: '2026-07-13T09:30:00', end_time: '2026-07-13T10:30:00' })
    });
    console.log('Overlap Booking Status:', overlapStatus);
    console.log('Overlap Booking Message:', overlapData.message);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
