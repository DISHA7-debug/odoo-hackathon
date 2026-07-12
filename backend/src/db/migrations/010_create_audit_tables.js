exports.up = async function up(knex) {
  await knex.schema.createTable('audit_cycles', (table) => {
    table.increments('id').primary();
    table.integer('scope_department_id').references('id').inTable('departments');
    table.string('scope_location', 160);
    table.date('date_range_start').notNullable();
    table.date('date_range_end').notNullable();
    table.string('status', 10).notNullable().defaultTo('Open');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE audit_cycles
    ADD CONSTRAINT audit_cycles_status_check
    CHECK (status IN ('Open', 'Closed'))
  `);

  await knex.schema.createTable('audit_assignments', (table) => {
    table.increments('id').primary();
    table.integer('audit_cycle_id').notNullable().references('id').inTable('audit_cycles');
    table.integer('auditor_id').notNullable().references('id').inTable('users');
    table.unique(['audit_cycle_id', 'auditor_id']);
  });

  await knex.schema.createTable('audit_findings', (table) => {
    table.increments('id').primary();
    table.integer('audit_cycle_id').notNullable().references('id').inTable('audit_cycles');
    table.integer('asset_id').notNullable().references('id').inTable('assets');
    table.string('result', 10);
    table.text('notes');
    table.integer('recorded_by').references('id').inTable('users');
    table.timestamp('recorded_at').defaultTo(knex.fn.now());
    table.unique(['audit_cycle_id', 'asset_id']);
  });

  await knex.raw(`
    ALTER TABLE audit_findings
    ADD CONSTRAINT audit_findings_result_check
    CHECK (result IN ('Verified', 'Missing', 'Damaged'))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('audit_findings');
  await knex.schema.dropTableIfExists('audit_assignments');
  await knex.schema.dropTableIfExists('audit_cycles');
};
