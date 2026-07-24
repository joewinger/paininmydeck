const LATEST_MIGRATION_VERSION = 3;

export function migrate(storage: DurableObjectStorage): void {
  const sql = storage.sql;
  sql.exec('PRAGMA foreign_keys = ON');
  sql.exec(`
		CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at INTEGER NOT NULL
		)
	`);

  let current = sql
    .exec<Record<string, SqlStorageValue> & { version: number }>(
      'SELECT COALESCE(MAX(version), 0) AS version FROM _sql_schema_migrations',
    )
    .one().version;
  if (current > LATEST_MIGRATION_VERSION) {
    throw new Error(`Room schema ${current} is newer than this Worker`);
  }

  if (current < 1) {
    storage.transactionSync(() => {
      sql.exec(`
			CREATE TABLE room_state (
				singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
				room_id TEXT NOT NULL UNIQUE,
				generation TEXT NOT NULL,
				game_state TEXT NOT NULL CHECK (game_state IN ('LOBBY', 'PLAYING', 'FINISHED')),
				revision INTEGER NOT NULL DEFAULT 0,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				expires_at INTEGER NOT NULL,
				host_player_id TEXT,
				cards_per_hand INTEGER NOT NULL,
				points_to_win INTEGER NOT NULL,
				num_blank_cards INTEGER NOT NULL,
				guaranteed_blanks INTEGER NOT NULL,
				all_blanks INTEGER NOT NULL CHECK (all_blanks IN (0, 1)),
				family_mode INTEGER NOT NULL CHECK (family_mode IN (0, 1)),
				num_redraws INTEGER NOT NULL,
				round_number INTEGER NOT NULL DEFAULT 0,
				completed_rounds INTEGER NOT NULL DEFAULT 0,
				round_id TEXT,
				turn_status TEXT NOT NULL DEFAULT 'WAITING_FOR_CARDS' CHECK (turn_status IN ('WAITING_FOR_CARDS', 'WAITING_FOR_CZAR', 'REVEAL')),
				question_id TEXT,
				question_text TEXT,
				czar_player_id TEXT,
				winning_submission_id TEXT,
				reveal_deadline INTEGER
			)
		`);
      sql.exec(`
			CREATE TABLE sessions (
				session_hash TEXT PRIMARY KEY,
				room_generation TEXT NOT NULL,
				player_id TEXT,
				is_creator INTEGER NOT NULL DEFAULT 0 CHECK (is_creator IN (0, 1)),
				created_at INTEGER NOT NULL,
				last_seen_at INTEGER NOT NULL,
				expires_at INTEGER NOT NULL,
				revoked_at INTEGER
			)
		`);
      sql.exec('CREATE INDEX sessions_player ON sessions(player_id)');
      sql.exec(`
			CREATE TABLE players (
				player_id TEXT PRIMARY KEY,
				display_name TEXT NOT NULL,
				normalized_name TEXT NOT NULL,
				color_primary TEXT NOT NULL,
				color_secondary TEXT NOT NULL,
				points INTEGER NOT NULL DEFAULT 0,
				czar_order INTEGER NOT NULL,
				connected INTEGER NOT NULL DEFAULT 0 CHECK (connected IN (0, 1)),
				redraws_used INTEGER NOT NULL DEFAULT 0,
				joined_at INTEGER NOT NULL,
				left_at INTEGER,
				kicked_at INTEGER
			)
		`);
      sql.exec(
        'CREATE UNIQUE INDEX players_active_name ON players(normalized_name) WHERE left_at IS NULL AND kicked_at IS NULL',
      );
      sql.exec(`
			CREATE UNIQUE INDEX players_active_colors
			ON players(color_primary, color_secondary)
			WHERE left_at IS NULL AND kicked_at IS NULL
		`);
      sql.exec(`
			CREATE TABLE card_instances (
				instance_id TEXT PRIMARY KEY,
				catalog_id TEXT,
				text TEXT NOT NULL,
				is_blank INTEGER NOT NULL CHECK (is_blank IN (0, 1)),
				location TEXT NOT NULL CHECK (location IN ('draw', 'hand', 'played', 'discard')),
				owner_player_id TEXT,
				position INTEGER NOT NULL DEFAULT 0
			)
		`);
      sql.exec('CREATE INDEX cards_location_position ON card_instances(location, position)');
      sql.exec('CREATE INDEX cards_owner ON card_instances(owner_player_id, location, position)');
      sql.exec(`
			CREATE TABLE question_cards (
				instance_id TEXT PRIMARY KEY,
				catalog_id TEXT NOT NULL,
				text TEXT NOT NULL,
				state TEXT NOT NULL CHECK (state IN ('draw', 'used')),
				position INTEGER NOT NULL
			)
		`);
      sql.exec('CREATE INDEX questions_state_position ON question_cards(state, position)');
      sql.exec(`
			CREATE TABLE submissions (
				submission_id TEXT PRIMARY KEY,
				round_id TEXT NOT NULL,
				player_id TEXT NOT NULL,
				card_instance_id TEXT NOT NULL UNIQUE,
				custom_text TEXT,
				display_order INTEGER,
				is_winner INTEGER NOT NULL DEFAULT 0 CHECK (is_winner IN (0, 1)),
				created_at INTEGER NOT NULL,
				UNIQUE(round_id, player_id)
			)
		`);
      sql.exec('CREATE INDEX submissions_round_order ON submissions(round_id, display_order)');
      sql.exec(`
			CREATE TABLE messages (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				timestamp INTEGER NOT NULL,
				type TEXT NOT NULL CHECK (type IN ('chat', 'system')),
				sender_player_id TEXT,
				sender_display_name TEXT NOT NULL,
				text TEXT NOT NULL
			)
		`);
      sql.exec(`
			CREATE TABLE rounds (
				round_number INTEGER PRIMARY KEY,
				round_id TEXT NOT NULL UNIQUE,
				question TEXT NOT NULL,
				winning_answer TEXT NOT NULL,
				winning_player_id TEXT,
				winning_player_name TEXT NOT NULL,
				completed_at INTEGER NOT NULL
			)
		`);
      sql.exec(`
			CREATE TABLE round_answers (
				round_number INTEGER NOT NULL,
				answer_order INTEGER NOT NULL,
				text TEXT NOT NULL,
				player_id TEXT,
				player_name TEXT NOT NULL,
				is_winner INTEGER NOT NULL CHECK (is_winner IN (0, 1)),
				PRIMARY KEY (round_number, answer_order)
			)
		`);
      sql.exec(`
			CREATE TABLE final_players (
				player_id TEXT PRIMARY KEY,
				display_name TEXT NOT NULL,
				color_primary TEXT NOT NULL,
				color_secondary TEXT NOT NULL,
				points INTEGER NOT NULL,
				czar_order INTEGER NOT NULL,
				connected INTEGER NOT NULL,
				rank INTEGER NOT NULL,
				is_winner INTEGER NOT NULL CHECK (is_winner IN (0, 1))
			)
		`);
      sql.exec(`
			CREATE TABLE command_receipts (
				room_generation TEXT NOT NULL,
				player_id TEXT NOT NULL,
				command_id TEXT NOT NULL,
				request_digest TEXT NOT NULL,
				response_json TEXT NOT NULL,
				processed_at INTEGER NOT NULL,
				revision INTEGER NOT NULL,
				PRIMARY KEY (room_generation, player_id, command_id)
			)
		`);
      sql.exec(`
			CREATE TABLE command_rate_limits (
				session_hash TEXT PRIMARY KEY,
				tokens REAL NOT NULL,
				last_refill_at INTEGER NOT NULL
			)
		`);
      sql.exec(`
			CREATE TABLE chat_rate_events (
				session_hash TEXT NOT NULL,
				occurred_at INTEGER NOT NULL
			)
		`);
      sql.exec('CREATE INDEX chat_rate_window ON chat_rate_events(session_hash, occurred_at)');
      sql.exec(`
			CREATE TABLE scheduled_jobs (
				job_type TEXT NOT NULL CHECK (job_type IN ('reveal', 'disconnect', 'ttl')),
				job_key TEXT NOT NULL,
				due_at INTEGER NOT NULL,
				PRIMARY KEY (job_type, job_key)
			)
		`);
      sql.exec('CREATE INDEX jobs_due ON scheduled_jobs(due_at)');
      sql.exec(
        'INSERT INTO _sql_schema_migrations(version, applied_at) VALUES (?, ?)',
        1,
        Date.now(),
      );
    });
    current = 1;
  }

  if (current < 2) {
    storage.transactionSync(() => {
      sql.exec(`
			CREATE TABLE IF NOT EXISTS inbound_rate_limits (
				session_hash TEXT PRIMARY KEY,
				tokens REAL NOT NULL,
				last_refill_at INTEGER NOT NULL
			)
		`);
      sql.exec('DROP TABLE IF EXISTS command_rate_limits');
      sql.exec(
        'INSERT INTO _sql_schema_migrations(version, applied_at) VALUES (?, ?)',
        2,
        Date.now(),
      );
    });
    current = 2;
  }

  if (current < 3) {
    storage.transactionSync(() => {
      sql.exec(`
			ALTER TABLE room_state
			ADD COLUMN hand_redeal_mode TEXT NOT NULL DEFAULT 'replenish'
			CHECK (hand_redeal_mode IN ('replenish', 'every_round', 'czar_rotation'))
		`);
      sql.exec(
        'INSERT INTO _sql_schema_migrations(version, applied_at) VALUES (?, ?)',
        3,
        Date.now(),
      );
    });
  }
}
