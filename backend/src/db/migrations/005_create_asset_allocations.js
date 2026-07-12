exports.up = async function up(knex) {
  await knex.schema.createTable('asset_allocations', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').notNullable().references('id').inTable('assets');
    table.integer('employee_id').references('id').inTable('users');
    table.integer('department_id').references('id').inTable('departments');
    table.date('allocated_date').notNullable().defaultTo(knex.raw('CURRENT_DATE'));
    table.date('expected_return_date');
    table.date('actual_return_date');
    table.text('condition_checkin_notes');
    table.string('status', 10).notNullable().defaultTo('Active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE asset_allocations
    ADD CONSTRAINT asset_allocations_status_check
    CHECK (status IN ('Active', 'Returned', 'Overdue'))
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX one_active_allocation_per_asset
    ON asset_allocations(asset_id)
    WHERE status = 'Active'
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('asset_allocations');
};
