/* ==========================================================================
   MINI SOCIAL MEDIA PLATFORM - API INTERFACE & LIVE MOCK REST ENGINE
   Supports both live http://localhost:5000 REST API and seamless embedded storage
   ========================================================================== */

const API_BASE_URL = 'http://localhost:5000/api';

// Seeded sample assets generated for the platform
const DEMO_AVATAR_1 = 'assets/user_avatar_tech_1784866551801.png';
const DEMO_AVATAR_2 = 'assets/user_avatar_designer_1784866661484.png';
const DEMO_POST_1 = 'assets/post_cityscape_1784866690619.png';
const DEMO_POST_2 = 'assets/post_workspace_1784866721918.png';

// Local Mock Engine Storage Key
const STORAGE_KEY = 'mini_social_media_db_v3';
const TOKEN_KEY = 'mini_social_jwt_token';

// Initial Mock Seed Data
const INITIAL_DB = {
  users: [
    {
      id: 1,
      username: 'alex_dev',
      email: 'alex@example.com',
      password: 'password123',
      bio: 'Senior Fullstack Engineer & Open Source Enthusiast 🚀 Building the future of web.',
      profile_picture: DEMO_AVATAR_1,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 2,
      username: 'sophia_design',
      email: 'sophia@example.com',
      password: 'password123',
      bio: 'UI/UX Designer & Creative Director 🎨 Lover of glassmorphism and dark mode.',
      profile_picture: DEMO_AVATAR_2,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString()
    }
  ],
  posts: [
    {
      id: 101,
      user_id: 2,
      caption: 'Sunset cyberpunk vibe design exploration! What do you think of this futuristic palette? 🌇✨',
      image: DEMO_POST_1,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ],
  comments: [
    {
      id: 501,
      post_id: 101,
      user_id: 1,
      comment: 'This glowing purple hue looks amazing! Excellent contrast.',
      created_at: new Date(Date.now() - 1800000).toISOString()
    }
  ],
  likes: [
    { id: 1, user_id: 1, post_id: 101 }
  ],
  follows: [
    { id: 1, follower_id: 1, following_id: 2 },
    { id: 2, follower_id: 2, following_id: 1 }
  ]
};

// Storage helper
function getDb() {
  localStorage.removeItem('mini_social_media_db_v1');
  localStorage.removeItem('mini_social_media_db_v2');
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
    return INITIAL_DB;
  }
  return JSON.parse(data);
}

function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// Token helper
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  let payload = null;
  try {
    if (token.includes('.')) {
      const parts = token.split('.');
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      payload = JSON.parse(atob(base64));
    } else {
      payload = JSON.parse(atob(token));
    }
  } catch (e) {
    try {
      payload = JSON.parse(token);
    } catch (e2) {
      console.warn('Invalid auth token in storage:', e2);
      return null;
    }
  }

  if (!payload) return null;

  // In embedded mode, fetch full up-to-date user object matching ID/username/email
  const db = getDb();
  const dbUser = db.users.find(u => 
    (payload.id && u.id == payload.id) || 
    (payload.username && u.username.toLowerCase() === payload.username.toLowerCase()) || 
    (payload.email && u.email.toLowerCase() === payload.email.toLowerCase())
  );

  return dbUser || payload;
}


// Global API Controller
const Api = {
  mode: 'embedded', // Default to embedded mock for instant standalone, auto-switches if backend responds

  async init() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(1200) });
      if (res.ok) {
        this.mode = 'live';
        console.log('Connected to live backend server on localhost:5000');
      }
    } catch (e) {
      this.mode = 'embedded';
      console.log('Running in standalone embedded mode with persistent LocalStorage engine');
    }
  },

  // Auth Methods
  async register(username, email, password, bio, profile_picture) {
    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, bio, profile_picture })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setToken(data.token);
      return data;
    }

    // Embedded Mock Register
    const db = getDb();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (db.users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase() || u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Username or email already in use.');
    }

    const newUser = {
      id: Date.now(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      bio: bio || 'Social explorer ✨',
      profile_picture: profile_picture || DEMO_AVATAR_1,
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDb(db);

    const token = btoa(JSON.stringify({ id: newUser.id, username: newUser.username, email: newUser.email }));
    setToken(token);

    return { message: 'Registration successful!', token, user: newUser };
  },

  async login(email, password) {
    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      setToken(data.token);
      return data;
    }

    // Embedded Mock Login
    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
    if (!user) throw new Error('Invalid email or password.');

    const token = btoa(JSON.stringify({ id: user.id, username: user.username, email: user.email }));
    setToken(token);

    return { message: 'Login successful!', token, user };
  },

  logout() {
    setToken(null);
  },

  // Feed & Posts Methods
  async getFeed() {
    if (this.mode === 'live') {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/posts/feed`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return await res.json();
    }

    const db = getDb();
    const currentUser = getCurrentUser();
    const currentUserId = currentUser ? currentUser.id : 0;

    const formattedPosts = db.posts.map(p => {
      const author = db.users.find(u => u.id === p.user_id) || { username: 'Anonymous', profile_picture: DEMO_AVATAR_1 };
      const likesCount = db.likes.filter(l => l.post_id === p.id).length;
      const commentsCount = db.comments.filter(c => c.post_id === p.id).length;
      const isLiked = db.likes.some(l => l.post_id === p.id && l.user_id === currentUserId);

      return {
        ...p,
        username: author.username,
        profile_picture: author.profile_picture,
        likesCount,
        commentsCount,
        isLiked
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { posts: formattedPosts };
  },

  async createPost(caption, image) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Authentication required.');

    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ caption, image })
      });
      return await res.json();
    }

    const db = getDb();
    const author = db.users.find(u => u.id === currentUser.id) || currentUser;

    const newPost = {
      id: Date.now(),
      user_id: currentUser.id,
      caption: caption || '',
      image: image || '',
      created_at: new Date().toISOString()
    };

    db.posts.unshift(newPost);
    saveDb(db);

    return {
      message: 'Post created!',
      post: {
        ...newPost,
        username: author.username,
        profile_picture: author.profile_picture || DEMO_AVATAR_1,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false
      }
    };
  },

  async toggleLike(postId) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Authentication required.');

    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      return await res.json();
    }

    const db = getDb();
    const existingIndex = db.likes.findIndex(l => l.post_id == postId && l.user_id == currentUser.id);

    let liked = false;
    if (existingIndex > -1) {
      db.likes.splice(existingIndex, 1);
      liked = false;
    } else {
      db.likes.push({ id: Date.now(), user_id: currentUser.id, post_id: Number(postId) });
      liked = true;
    }

    saveDb(db);
    const likesCount = db.likes.filter(l => l.post_id == postId).length;

    return { liked, likesCount };
  },

  async getComments(postId) {
    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
      return await res.json();
    }

    const db = getDb();
    const comments = db.comments
      .filter(c => c.post_id == postId)
      .map(c => {
        const u = db.users.find(user => user.id === c.user_id) || { username: 'User', profile_picture: DEMO_AVATAR_1 };
        return { ...c, username: u.username, profile_picture: u.profile_picture };
      });

    return { comments };
  },

  async addComment(postId, text) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Authentication required.');

    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ comment: text })
      });
      return await res.json();
    }

    const db = getDb();
    const author = db.users.find(u => u.id === currentUser.id) || currentUser;

    const newComment = {
      id: Date.now(),
      post_id: Number(postId),
      user_id: currentUser.id,
      comment: text,
      created_at: new Date().toISOString()
    };

    db.comments.push(newComment);
    saveDb(db);

    return {
      message: 'Comment added!',
      comment: {
        ...newComment,
        username: author.username,
        profile_picture: author.profile_picture || DEMO_AVATAR_1
      }
    };
  },

  async deleteComment(commentId) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Authentication required.');

    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/posts/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      return await res.json();
    }

    const db = getDb();
    const idx = db.comments.findIndex(c => c.id == commentId && c.user_id == currentUser.id);
    if (idx > -1) {
      db.comments.splice(idx, 1);
      saveDb(db);
    }
    return { message: 'Comment deleted.' };
  },

  // User & Profile Methods
  async getProfile(userId) {
    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {}
      });
      return await res.json();
    }

    const db = getDb();
    const user = db.users.find(u => u.id == userId);
    if (!user) throw new Error('User not found');

    const currentUser = getCurrentUser();
    const currentUserId = currentUser ? currentUser.id : 0;

    const followersCount = db.follows.filter(f => f.following_id == userId).length;
    const followingCount = db.follows.filter(f => f.follower_id == userId).length;
    const postsCount = db.posts.filter(p => p.user_id == userId).length;
    const isFollowing = db.follows.some(f => f.follower_id == currentUserId && f.following_id == userId);

    return {
      user: {
        ...user,
        followersCount,
        followingCount,
        postsCount,
        isFollowing
      }
    };
  },

  async toggleFollow(userId) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Authentication required.');
    if (currentUser.id == userId) throw new Error('You cannot follow yourself.');

    if (this.mode === 'live') {
      // check if following first or send request
      const isFol = await this.getProfile(userId).then(r => r.user.isFollowing);
      const method = isFol ? 'DELETE' : 'POST';
      const res = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
        method,
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      return await res.json();
    }

    const db = getDb();
    const idx = db.follows.findIndex(f => f.follower_id == currentUser.id && f.following_id == userId);

    let isFollowing = false;
    if (idx > -1) {
      db.follows.splice(idx, 1);
      isFollowing = false;
    } else {
      db.follows.push({ id: Date.now(), follower_id: currentUser.id, following_id: Number(userId) });
      isFollowing = true;
    }

    saveDb(db);
    return { isFollowing, message: isFollowing ? 'Followed user' : 'Unfollowed user' };
  },

  async getFollowers(userId) {
    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/followers`);
      return await res.json();
    }

    const db = getDb();
    const followerIds = db.follows.filter(f => f.following_id == userId).map(f => f.follower_id);
    const followers = db.users
      .filter(u => followerIds.includes(u.id))
      .map(u => ({ id: u.id, username: u.username, profile_picture: u.profile_picture, bio: u.bio }));

    return { followers };
  },

  async getFollowing(userId) {
    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/following`);
      return await res.json();
    }

    const db = getDb();
    const followingIds = db.follows.filter(f => f.follower_id == userId).map(f => f.following_id);
    const following = db.users
      .filter(u => followingIds.includes(u.id))
      .map(u => ({ id: u.id, username: u.username, profile_picture: u.profile_picture, bio: u.bio }));

    return { following };
  },

  async updateProfile(bio, profile_picture) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Authentication required.');

    if (this.mode === 'live') {
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ bio, profile_picture })
      });
      return await res.json();
    }

    const db = getDb();
    const user = db.users.find(u => u.id == currentUser.id);
    if (user) {
      if (bio) user.bio = bio;
      if (profile_picture) user.profile_picture = profile_picture;
      saveDb(db);
    }
    return { message: 'Profile updated!', user };
  }
};
