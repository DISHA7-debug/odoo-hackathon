exports.up = async function up(knex) {
  await knex.schema.createTable('asset_categories', (table) => {
    table.increments('id').primary();
    table.string('name', 80).notNullable().unique();
    table.jsonb('custom_fields').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('asset_categories');
};
