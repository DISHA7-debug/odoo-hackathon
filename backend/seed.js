require('dotenv').config();

const db = require('./src/config/db');
const { hashPassword } = require('./src/utils/password');

const DEFAULT_PASSWORD = 'Password123!';

async function seed() {
  console.log('Seeding AssetFlow database...');

  await db.transaction(async (trx) => {
    // Clear existing data (order matters for FKs)
    await trx('activity_logs').del();
    await trx('transfer_requests').del();
    await trx('asset_allocations').del();
    await trx('assets').del();
    await trx('asset_categories').del();
    await trx('departments').update({ head_user_id: null, parent_department_id: null });
    await trx('users').del();
    await trx('departments').del();

    const password_hash = await hashPassword(DEFAULT_PASSWORD);

    const [engineering, operations, hr] = await trx('departments')
      .insert([
        { name: 'Engineering', status: 'Active' },
        { name: 'Operations', status: 'Active' },
        { name: 'Human Resources', status: 'Active', parent_department_id: null },
      ])
      .returning('*');

    await trx('departments')
      .where({ id: operations.id })
      .update({ parent_department_id: engineering.id });

    const users = await trx('users')
      .insert([
        { name: 'Ananya Mehta', email: 'ananya.admin@assetflow.com', password_hash, role: 'Admin', department_id: hr.id },
        { name: 'Rahul Verma', email: 'rahul.manager@assetflow.com', password_hash, role: 'AssetManager', department_id: operations.id },
        { name: 'Sneha Kapoor', email: 'sneha.manager@assetflow.com', password_hash, role: 'AssetManager', department_id: engineering.id },
        { name: 'Vikram Singh', email: 'vikram.head@assetflow.com', password_hash, role: 'DepartmentHead', department_id: engineering.id },
        { name: 'Meera Nair', email: 'meera.head@assetflow.com', password_hash, role: 'DepartmentHead', department_id: hr.id },
        { name: 'Priya Shah', email: 'priya@assetflow.com', password_hash, role: 'Employee', department_id: engineering.id },
        { name: 'Arjun Patel', email: 'arjun@assetflow.com', password_hash, role: 'Employee', department_id: engineering.id },
        { name: 'Kavya Reddy', email: 'kavya@assetflow.com', password_hash, role: 'Employee', department_id: engineering.id },
        { name: 'Rohan Desai', email: 'rohan@assetflow.com', password_hash, role: 'Employee', department_id: operations.id },
        { name: 'Isha Gupta', email: 'isha@assetflow.com', password_hash, role: 'Employee', department_id: operations.id },
        { name: 'Dev Malhotra', email: 'dev@assetflow.com', password_hash, role: 'Employee', department_id: hr.id },
        { name: 'Nisha Joshi', email: 'nisha@assetflow.com', password_hash, role: 'Employee', department_id: hr.id },
        { name: 'Amit Khanna', email: 'amit@assetflow.com', password_hash, role: 'Employee', department_id: engineering.id },
        { name: 'Tanvi Rao', email: 'tanvi@assetflow.com', password_hash, role: 'Employee', department_id: operations.id },
        { name: 'Karan Bhatia', email: 'karan@assetflow.com', password_hash, role: 'Employee', department_id: engineering.id },
      ])
      .returning('*');

    const admin = users.find((u) => u.role === 'Admin');
    const vikram = users.find((u) => u.email === 'vikram.head@assetflow.com');
    const meera = users.find((u) => u.email === 'meera.head@assetflow.com');
    const priya = users.find((u) => u.email === 'priya@assetflow.com');
    const arjun = users.find((u) => u.email === 'arjun@assetflow.com');
    const kavya = users.find((u) => u.email === 'kavya@assetflow.com');

    await trx('departments').where({ id: engineering.id }).update({ head_user_id: vikram.id });
    await trx('departments').where({ id: hr.id }).update({ head_user_id: meera.id });

    const [electronics, furniture, vehicles, meetingRooms] = await trx('asset_categories')
      .insert([
        { name: 'Electronics', custom_fields: { warranty_period_months: 24 } },
        { name: 'Furniture', custom_fields: { material: 'mixed' } },
        { name: 'Vehicles', custom_fields: { fuel_type: 'petrol' } },
        { name: 'Meeting Rooms', custom_fields: { capacity: 12 } },
      ])
      .returning('*');

    const assetRows = [
      { name: 'Dell Latitude 5540', category_id: electronics.id, asset_tag: 'AF-0001', serial_number: 'DL-5540-001', acquisition_date: '2024-03-15', acquisition_cost: 72000, condition: 'Good', location: 'HQ-3F', is_bookable: false, status: 'Allocated' },
      { name: 'MacBook Pro 14"', category_id: electronics.id, asset_tag: 'AF-0002', serial_number: 'MBP-14-002', acquisition_date: '2024-06-01', acquisition_cost: 185000, condition: 'New', location: 'HQ-3F', is_bookable: false, status: 'Allocated' },
      { name: 'HP LaserJet Pro', category_id: electronics.id, asset_tag: 'AF-0003', serial_number: 'HP-LJ-003', acquisition_date: '2023-11-20', acquisition_cost: 28000, condition: 'Fair', location: 'HQ-2F', is_bookable: false, status: 'Available' },
      { name: 'Logitech MX Master 3', category_id: electronics.id, asset_tag: 'AF-0004', serial_number: 'LG-MX-004', acquisition_date: '2025-01-10', acquisition_cost: 8500, condition: 'Good', location: 'HQ-3F', is_bookable: false, status: 'Available' },
      { name: 'Samsung 27" Monitor', category_id: electronics.id, asset_tag: 'AF-0005', serial_number: 'SM-27-005', acquisition_date: '2024-08-12', acquisition_cost: 22000, condition: 'Good', location: 'HQ-3F', is_bookable: false, status: 'Allocated' },
      { name: 'iPad Air', category_id: electronics.id, asset_tag: 'AF-0006', serial_number: 'IPAD-006', acquisition_date: '2025-02-01', acquisition_cost: 65000, condition: 'New', location: 'HQ-4F', is_bookable: false, status: 'Available' },
      { name: 'Ergonomic Desk Chair', category_id: furniture.id, asset_tag: 'AF-0007', serial_number: 'FR-CH-007', acquisition_date: '2023-05-10', acquisition_cost: 15000, condition: 'Good', location: 'HQ-3F', is_bookable: false, status: 'Allocated' },
      { name: 'Standing Desk', category_id: furniture.id, asset_tag: 'AF-0008', serial_number: 'FR-SD-008', acquisition_date: '2024-01-20', acquisition_cost: 35000, condition: 'Good', location: 'HQ-3F', is_bookable: false, status: 'Available' },
      { name: 'Conference Table 12-seater', category_id: furniture.id, asset_tag: 'AF-0009', serial_number: 'FR-CT-009', acquisition_date: '2022-09-01', acquisition_cost: 95000, condition: 'Fair', location: 'HQ-5F', is_bookable: false, status: 'Available' },
      { name: 'Filing Cabinet', category_id: furniture.id, asset_tag: 'AF-0010', serial_number: 'FR-FC-010', acquisition_date: '2023-03-15', acquisition_cost: 12000, condition: 'Good', location: 'HQ-2F', is_bookable: false, status: 'Available' },
      { name: 'Toyota Innova', category_id: vehicles.id, asset_tag: 'AF-0011', serial_number: 'MH-12-AB-1234', acquisition_date: '2022-04-01', acquisition_cost: 1850000, condition: 'Good', location: 'Parking-A', is_bookable: true, status: 'Available' },
      { name: 'Maruti Ertiga', category_id: vehicles.id, asset_tag: 'AF-0012', serial_number: 'MH-12-CD-5678', acquisition_date: '2023-07-15', acquisition_cost: 1200000, condition: 'Good', location: 'Parking-A', is_bookable: true, status: 'Available' },
      { name: 'Boardroom Alpha', category_id: meetingRooms.id, asset_tag: 'AF-0013', serial_number: 'MR-ALPHA', acquisition_date: '2021-01-01', acquisition_cost: 0, condition: 'Good', location: 'HQ-5F', is_bookable: true, status: 'Available' },
      { name: 'Huddle Room Beta', category_id: meetingRooms.id, asset_tag: 'AF-0014', serial_number: 'MR-BETA', acquisition_date: '2021-01-01', acquisition_cost: 0, condition: 'Good', location: 'HQ-4F', is_bookable: true, status: 'Available' },
      { name: 'ThinkPad X1 Carbon', category_id: electronics.id, asset_tag: 'AF-0015', serial_number: 'TP-X1-015', acquisition_date: '2024-11-01', acquisition_cost: 135000, condition: 'New', location: 'HQ-3F', is_bookable: false, status: 'Available' },
      { name: 'Dell OptiPlex Desktop', category_id: electronics.id, asset_tag: 'AF-0016', serial_number: 'DL-OP-016', acquisition_date: '2024-05-20', acquisition_cost: 58000, condition: 'Good', location: 'HQ-2F', is_bookable: false, status: 'Available' },
      { name: 'Webcam Logitech C920', category_id: electronics.id, asset_tag: 'AF-0017', serial_number: 'LG-C920-017', acquisition_date: '2025-03-01', acquisition_cost: 7500, condition: 'New', location: 'HQ-3F', is_bookable: false, status: 'Available' },
      { name: 'Office Sofa Set', category_id: furniture.id, asset_tag: 'AF-0018', serial_number: 'FR-SS-018', acquisition_date: '2023-08-10', acquisition_cost: 45000, condition: 'Good', location: 'HQ-4F', is_bookable: false, status: 'Available' },
      { name: 'Whiteboard 6x4', category_id: furniture.id, asset_tag: 'AF-0019', serial_number: 'FR-WB-019', acquisition_date: '2023-02-01', acquisition_cost: 8000, condition: 'Good', location: 'HQ-3F', is_bookable: false, status: 'Available' },
      { name: 'Projector Epson EB-X06', category_id: electronics.id, asset_tag: 'AF-0020', serial_number: 'EP-PJ-020', acquisition_date: '2024-02-14', acquisition_cost: 42000, condition: 'Good', location: 'HQ-5F', is_bookable: true, status: 'Available' },
      { name: 'Lenovo ThinkCentre', category_id: electronics.id, asset_tag: 'AF-0021', serial_number: 'LN-TC-021', acquisition_date: '2024-09-01', acquisition_cost: 52000, condition: 'Good', location: 'HQ-2F', is_bookable: false, status: 'Available' },
      { name: 'Visitor Laptop Dell 3420', category_id: electronics.id, asset_tag: 'AF-0022', serial_number: 'DL-3420-022', acquisition_date: '2024-04-10', acquisition_cost: 48000, condition: 'Good', location: 'HQ-1F-Reception', is_bookable: false, status: 'Available' },
      { name: 'Electric Scooter Ather', category_id: vehicles.id, asset_tag: 'AF-0023', serial_number: 'AT-450X-023', acquisition_date: '2025-01-15', acquisition_cost: 145000, condition: 'New', location: 'Parking-B', is_bookable: true, status: 'Available' },
      { name: 'Focus Room Gamma', category_id: meetingRooms.id, asset_tag: 'AF-0024', serial_number: 'MR-GAMMA', acquisition_date: '2021-01-01', acquisition_cost: 0, condition: 'Good', location: 'HQ-4F', is_bookable: true, status: 'Available' },
      { name: 'Dell Laptop Demo Unit', category_id: electronics.id, asset_tag: 'AF-0025', serial_number: 'DL-DEMO-025', acquisition_date: '2025-06-01', acquisition_cost: 55000, condition: 'New', location: 'HQ-3F', is_bookable: false, status: 'Allocated' },
    ];

    const assets = await trx('assets').insert(assetRows).returning('*');

    const demoAsset = assets.find((a) => a.asset_tag === 'AF-0001');
    const laptop2 = assets.find((a) => a.asset_tag === 'AF-0002');
    const monitor = assets.find((a) => a.asset_tag === 'AF-0005');
    const chair = assets.find((a) => a.asset_tag === 'AF-0007');
    const demoConflictAsset = assets.find((a) => a.asset_tag === 'AF-0025');

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setMonth(futureDate.getMonth() + 3);
    const futureStr = futureDate.toISOString().slice(0, 10);

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 5);
    const pastStr = pastDate.toISOString().slice(0, 10);

    const daysAgo = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    };

    await trx('asset_allocations').insert([
      { asset_id: demoAsset.id, employee_id: priya.id, department_id: engineering.id, allocated_date: daysAgo(15), expected_return_date: futureStr, status: 'Active' },
      { asset_id: laptop2.id, employee_id: arjun.id, department_id: engineering.id, allocated_date: daysAgo(12), expected_return_date: futureStr, status: 'Active' },
      { asset_id: monitor.id, employee_id: kavya.id, department_id: engineering.id, allocated_date: daysAgo(20), expected_return_date: pastStr, status: 'Active' },
      { asset_id: chair.id, employee_id: priya.id, department_id: engineering.id, allocated_date: daysAgo(8), expected_return_date: futureStr, status: 'Active' },
      // Deliberate active allocation for double-allocation demo (AF-0025 held by Priya)
      { asset_id: demoConflictAsset.id, employee_id: priya.id, department_id: engineering.id, allocated_date: daysAgo(5), expected_return_date: futureStr, status: 'Active' },
    ]);

    await trx('transfer_requests').insert({
      asset_id: demoAsset.id,
      from_user_id: priya.id,
      to_user_id: arjun.id,
      status: 'Requested',
    });

    await trx('activity_logs').insert({
      user_id: admin.id,
      action: 'SEED_COMPLETED',
      entity_type: 'system',
      entity_id: null,
      metadata: { message: 'Demo data loaded' },
    });
  });

  console.log('Seed complete.');
  console.log(`Default password for all users: ${DEFAULT_PASSWORD}`);
  console.log('Demo double-allocation: POST /api/v1/assets/25/allocate (AF-0025 held by Priya Shah)');
  console.log('Admin login: ananya.admin@assetflow.com');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.destroy());
