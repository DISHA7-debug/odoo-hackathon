exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');

  await knex.raw(`
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_no_time_overlap
    EXCLUDE USING gist (
      resource_asset_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    )
    WHERE (status IN ('Upcoming', 'Ongoing'))
  `);
};

exports.down = async function down(knex) {
  await knex.raw('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_time_overlap');
  await knex.raw('DROP EXTENSION IF EXISTS btree_gist');
};
