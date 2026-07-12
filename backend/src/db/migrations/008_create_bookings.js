exports.up = async function up(knex) {
  await knex.schema.createTable('bookings', (table) => {
    table.increments('id').primary();
    table.integer('resource_asset_id').notNullable().references('id').inTable('assets');
    table.integer('booked_by').notNullable().references('id').inTable('users');
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').notNullable();
    table.string('status', 12).notNullable().defaultTo('Upcoming');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled'))
  `);

  await knex.raw(`
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_time_check
    CHECK (end_time > start_time)
  `);

  await knex.raw(
    'CREATE INDEX idx_bookings_asset_time ON bookings(resource_asset_id, start_time, end_time)'
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('bookings');
};
