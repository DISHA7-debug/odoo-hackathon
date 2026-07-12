exports.up = async function up(knex) {
  await knex.schema.createTable('assets', (table) => {
    table.increments('id').primary();
    table.string('name', 160).notNullable();
    table.integer('category_id').notNullable().references('id').inTable('asset_categories');
    table.string('asset_tag', 20).notNullable().unique();
    table.string('serial_number', 80);
    table.date('acquisition_date');
    table.decimal('acquisition_cost', 12, 2);
    table.string('condition', 20).defaultTo('Good');
    table.string('location', 160);
    table.text('photo_url');
    table.boolean('is_bookable').notNullable().defaultTo(false);
    table.string('status', 20).notNullable().defaultTo('Available');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE assets
    ADD CONSTRAINT assets_condition_check
    CHECK (condition IN ('New', 'Good', 'Fair', 'Poor', 'Damaged'))
  `);

  await knex.raw(`
    ALTER TABLE assets
    ADD CONSTRAINT assets_status_check
    CHECK (status IN (
      'Available', 'Allocated', 'Reserved', 'Under Maintenance',
      'Lost', 'Retired', 'Disposed'
    ))
  `);

  await knex.raw('CREATE INDEX idx_assets_status ON assets(status)');
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('assets');
};
