exports.up = async function up(knex) {
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users');
    table.string('type', 40).notNullable();
    table.text('message').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC)');
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('notifications');
};
