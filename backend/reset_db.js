const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'social_media.db');
const db = new sqlite3.Database(dbPath);

async function resetDb() {
  console.log('Resetting database...');

  db.serialize(async () => {
    // Drop existing tables
    db.run('DROP TABLE IF EXISTS follows');
    db.run('DROP TABLE IF EXISTS likes');
    db.run('DROP TABLE IF EXISTS comments');
    db.run('DROP TABLE IF EXISTS posts');
    db.run('DROP TABLE IF EXISTS users');

    // Create tables
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        bio TEXT DEFAULT '',
        profile_picture TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        caption TEXT,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Hash default password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Seed clean initial users
    db.run(
      `INSERT INTO users (id, username, email, password, bio, profile_picture) VALUES 
      (1, 'alex_dev', 'alex@example.com', ?, 'Senior Fullstack Engineer & Open Source Enthusiast 🚀 Building the future of web.', 'assets/user_avatar_tech_1784866551801.png'),
      (2, 'sophia_design', 'sophia@example.com', ?, 'UI/UX Designer & Creative Director 🎨 Lover of glassmorphism and dark mode.', 'assets/user_avatar_designer_1784866661484.png')`,
      [hashedPassword, hashedPassword]
    );

    // Seed post 101
    db.run(
      `INSERT INTO posts (id, user_id, caption, image) VALUES 
      (101, 2, 'Sunset cyberpunk vibe design exploration! What do you think of this futuristic palette? 🌇✨', 'assets/post_cityscape_178486690619.png')`
    );

    // Seed comment & likes
    db.run(
      `INSERT INTO comments (id, user_id, post_id, comment) VALUES 
      (501, 1, 101, 'This glowing purple hue looks amazing! Excellent contrast.')`
    );

    db.run(`INSERT INTO likes (user_id, post_id) VALUES (1, 101)`);
    db.run(`INSERT INTO follows (follower_id, following_id) VALUES (1, 2), (2, 1)`);

    console.log('✅ Database reset and clean initial tables seeded successfully!');
  });
}

resetDb();
