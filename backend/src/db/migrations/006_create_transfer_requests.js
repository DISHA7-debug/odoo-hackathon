exports.up = async function up(knex) {
  await knex.schema.createTable('transfer_requests', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').notNullable().references('id').inTable('assets');
    table.integer('from_user_id').references('id').inTable('users');
    table.integer('to_user_id').notNullable().references('id').inTable('users');
    table.string('status', 10).notNullable().defaultTo('Requested');
    table.timestamp('requested_at').defaultTo(knex.fn.now());
    table.integer('approved_by').references('id').inTable('users');
    table.timestamp('resolved_at');
  });

  await knex.raw(`
    ALTER TABLE transfer_requests
    ADD CONSTRAINT transfer_requests_status_check
    CHECK (status IN ('Requested', 'Approved', 'Rejected'))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('transfer_requests');
};
