exports.up = async function up(knex) {
  await knex.schema.createTable('departments', (table) => {
    table.increments('id').primary();
    table.string('name', 120).notNullable().unique();
    table.integer('head_user_id');
    table.integer('parent_department_id').references('id').inTable('departments');
    table.string('status', 10).notNullable().defaultTo('Active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE departments
    ADD CONSTRAINT departments_status_check
    CHECK (status IN ('Active', 'Inactive'))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('departments');
};
