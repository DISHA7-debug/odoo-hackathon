exports.up = async function up(knex) {
  await knex.schema.createTable('activity_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users');
    table.string('action', 80).notNullable();
    table.string('entity_type', 40);
    table.integer('entity_id');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('activity_logs');
};
