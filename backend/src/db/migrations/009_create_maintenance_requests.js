exports.up = async function up(knex) {
  await knex.schema.createTable('maintenance_requests', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').notNullable().references('id').inTable('assets');
    table.integer('raised_by').notNullable().references('id').inTable('users');
    table.text('issue_description').notNullable();
    table.string('priority', 10).notNullable().defaultTo('Medium');
    table.text('photo_url');
    table.string('status', 20).notNullable().defaultTo('Pending');
    table.integer('approved_by').references('id').inTable('users');
    table.string('technician', 120);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');
  });

  await knex.raw(`
    ALTER TABLE maintenance_requests
    ADD CONSTRAINT maintenance_requests_priority_check
    CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent'))
  `);

  await knex.raw(`
    ALTER TABLE maintenance_requests
    ADD CONSTRAINT maintenance_requests_status_check
    CHECK (status IN (
      'Pending', 'Approved', 'Rejected', 'TechnicianAssigned',
      'InProgress', 'Resolved'
    ))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('maintenance_requests');
};
