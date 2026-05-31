-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  premium_until DATETIME,
  timezone TEXT DEFAULT 'UTC',
  notification_time TEXT DEFAULT '09:00'
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⭐',
  color TEXT DEFAULT '#007AFF',
  frequency TEXT DEFAULT 'daily',
  target_days TEXT,
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME
);

-- Completions
CREATE TABLE IF NOT EXISTS habit_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER REFERENCES habits(id),
  completed_at DATE NOT NULL,
  note TEXT,
  mood INTEGER CHECK(mood BETWEEN 1 AND 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(habit_id, completed_at)
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  friend_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  habit_template TEXT NOT NULL,
  creator_id INTEGER REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_public BOOLEAN DEFAULT 1,
  max_participants INTEGER DEFAULT 50,
  prize_description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Challenge participants
CREATE TABLE IF NOT EXISTS challenge_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER REFERENCES challenges(id),
  user_id INTEGER REFERENCES users(id),
  habit_id INTEGER REFERENCES habits(id),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(challenge_id, user_id)
);

-- Social activities
CREATE TABLE IF NOT EXISTS social_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  activity_type TEXT NOT NULL,
  related_id INTEGER,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity likes
CREATE TABLE IF NOT EXISTS activity_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER REFERENCES social_activities(id),
  user_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(activity_id, user_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  achievement_type TEXT NOT NULL,
  habit_id INTEGER REFERENCES habits(id),
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_type, habit_id)
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_habit_date ON habit_completions(habit_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON social_activities(user_id, created_at);
