exports.up = async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 120).notNullable();
    table.string('email', 160).notNullable().unique();
    table.text('password_hash').notNullable();
    table.string('role', 20).notNullable().defaultTo('Employee');
    table.integer('department_id').references('id').inTable('departments');
    table.string('status', 10).notNullable().defaultTo('Active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('Admin', 'AssetManager', 'DepartmentHead', 'Employee'))
  `);

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_status_check
    CHECK (status IN ('Active', 'Inactive'))
  `);

  await knex.schema.alterTable('departments', (table) => {
    table.foreign('head_user_id').references('id').inTable('users').withKeyName('fk_head');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('departments', (table) => {
    table.dropForeign('head_user_id', 'fk_head');
  });
  await knex.schema.dropTableIfExists('users');
};
