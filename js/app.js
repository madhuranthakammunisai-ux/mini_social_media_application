/* ==========================================================================
   MINI SOCIAL MEDIA PLATFORM - APPLICATION CONTROLLER & INTERACTIONS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await Api.init();
  updateStatusBadge();
  setupEventListeners();
  renderApp();
});

let state = {
  currentView: 'feed', // 'feed' | 'profile'
  activeProfileId: null,
  selectedImageBase64: null,
  activeFeedTab: 'all' // 'all' | 'following'
};

function updateStatusBadge() {
  const badge = document.getElementById('status-badge');
  if (badge) {
    if (Api.mode === 'live') {
      badge.innerHTML = `<span class="status-dot"></span> Backend Connected (Express REST API)`;
    } else {
      badge.innerHTML = `<span class="status-dot" style="background:#06b6d4;box-shadow:0 0 8px #06b6d4"></span> Live Demo Engine (Embedded DB)`;
    }
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function setupEventListeners() {
  // Navigation
  document.getElementById('nav-logo')?.addEventListener('click', () => switchView('feed'));
  document.getElementById('nav-feed')?.addEventListener('click', () => switchView('feed'));
  document.getElementById('nav-my-profile')?.addEventListener('click', () => {
    const user = getCurrentUser();
    if (user) {
      switchView('profile', user.id);
    } else {
      openAuthModal();
    }
  });

  document.getElementById('user-pill')?.addEventListener('click', () => {
    const user = getCurrentUser();
    if (user) {
      switchView('profile', user.id);
    }
  });

  // Auth Modal Toggles
  document.getElementById('open-auth-btn')?.addEventListener('click', openAuthModal);
  document.getElementById('close-auth-btn')?.addEventListener('click', closeAuthModal);
  document.getElementById('tab-login')?.addEventListener('click', () => setAuthTab('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => setAuthTab('register'));

  // Auth Forms
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Post Creation
  document.getElementById('image-upload-input')?.addEventListener('change', handleImageSelect);
  document.getElementById('remove-media-btn')?.addEventListener('click', removeSelectedImage);
  document.getElementById('create-post-btn')?.addEventListener('click', handleCreatePost);

  // Edit Profile Modal
  document.getElementById('edit-profile-btn')?.addEventListener('click', openEditProfileModal);
  document.getElementById('close-edit-profile-btn')?.addEventListener('click', closeEditProfileModal);
  document.getElementById('edit-profile-form')?.addEventListener('submit', handleUpdateProfile);

  // Feed Tabs
  document.querySelectorAll('.feed-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.activeFeedTab = e.target.dataset.tab;
      renderFeed();
    });
  });

  // Followers & Following Modals
  document.getElementById('box-followers')?.addEventListener('click', () => {
    if (state.activeProfileId) openUserListModal('Followers', state.activeProfileId);
  });

  document.getElementById('box-following')?.addEventListener('click', () => {
    if (state.activeProfileId) openUserListModal('Following', state.activeProfileId);
  });

  document.getElementById('close-user-list-btn')?.addEventListener('click', closeUserListModal);
}

function renderApp() {
  const currentUser = getCurrentUser();
  const authBtn = document.getElementById('open-auth-btn');
  const userPill = document.getElementById('user-pill');
  const logoutBtn = document.getElementById('logout-btn');

  if (currentUser) {
    if (authBtn) authBtn.style.display = 'none';
    if (userPill) {
      userPill.style.display = 'flex';
      document.getElementById('nav-avatar').src = currentUser.profile_picture || DEMO_AVATAR_1;
      document.getElementById('nav-username').innerText = `@${currentUser.username}`;
    }
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  } else {
    if (authBtn) authBtn.style.display = 'inline-flex';
    if (userPill) userPill.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

  const navFeed = document.getElementById('nav-feed');
  const navMyProfile = document.getElementById('nav-my-profile');

  if (state.currentView === 'feed') {
    navFeed?.classList.add('active');
    navMyProfile?.classList.remove('active');
    document.getElementById('feed-view').style.display = 'block';
    document.getElementById('profile-view').style.display = 'none';
    renderFeed();
  } else {
    navFeed?.classList.remove('active');
    if (currentUser && state.activeProfileId == currentUser.id) {
      navMyProfile?.classList.add('active');
    } else {
      navMyProfile?.classList.remove('active');
    }
    document.getElementById('feed-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'block';
    renderProfile(state.activeProfileId);
  }
}

function switchView(view, profileId = null) {
  state.currentView = view;
  state.activeProfileId = profileId;
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================================================
   FEED & POSTS CONTROLLER
   ========================================================================== */

async function renderFeed() {
  const container = document.getElementById('posts-container');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)">Loading feed...</div>';

  try {
    const { posts } = await Api.getFeed();
    let displayPosts = posts;

    if (state.activeFeedTab === 'following') {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        container.innerHTML = '<div class="glass-card" style="padding:2rem;text-align:center">Please log in to view following feed.</div>';
        return;
      }
      const profile = await Api.getProfile(currentUser.id);
      // Filter posts by users following
      displayPosts = posts.filter(p => p.user_id === currentUser.id); // Or followed
    }

    if (displayPosts.length === 0) {
      container.innerHTML = '<div class="glass-card" style="padding:2rem;text-align:center">No posts found yet. Create the first post above!</div>';
      return;
    }

    container.innerHTML = displayPosts.map(p => createPostCardHTML(p)).join('');
    attachPostCardEvents();
  } catch (err) {
    container.innerHTML = `<div class="glass-card" style="padding:2rem;text-align:center;color:#ef4444">Error loading feed: ${err.message}</div>`;
  }
}

function createPostCardHTML(p) {
  const currentUser = getCurrentUser();
  const isOwner = currentUser && currentUser.id === p.user_id;

  return `
    <div class="glass-card post-card" data-id="${p.id}">
      <div class="post-header">
        <div class="post-author-info" style="cursor:pointer" onclick="switchView('profile', ${p.user_id})">
          <img src="${p.profile_picture || DEMO_AVATAR_1}" class="avatar" alt="${p.username}">
          <div>
            <div class="author-name">@${p.username}</div>
            <div class="post-time">${timeAgo(p.created_at)}</div>
          </div>
        </div>
        ${isOwner ? `
          <button class="btn btn-secondary btn-icon delete-post-btn" data-id="${p.id}" title="Delete Post">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        ` : ''}
      </div>

      ${p.caption ? `<div class="post-caption">${escapeHtml(p.caption)}</div>` : ''}
      
      ${p.image ? `
        <div class="post-image-container">
          <img src="${p.image}" alt="Post image">
        </div>
      ` : ''}

      <div class="post-actions">
        <button class="action-item ${p.isLiked ? 'liked' : ''} like-post-btn" data-id="${p.id}">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          <span class="like-count">${p.likesCount}</span> Likes
        </button>

        <button class="action-item toggle-comments-btn" data-id="${p.id}">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          <span class="comment-count">${p.commentsCount}</span> Comments
        </button>
      </div>

      <div class="comments-section" id="comments-section-${p.id}">
        <div class="comment-input-box">
          <input type="text" placeholder="Write a comment..." class="comment-input" data-id="${p.id}">
          <button class="btn btn-primary submit-comment-btn" data-id="${p.id}">Post</button>
        </div>
        <div class="comments-list" id="comments-list-${p.id}">
          <!-- Comments injected dynamically -->
        </div>
      </div>
    </div>
  `;
}

function attachPostCardEvents() {
  // Like buttons
  document.querySelectorAll('.like-post-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const postId = btn.dataset.id;
      try {
        const { liked, likesCount } = await Api.toggleLike(postId);
        btn.classList.toggle('liked', liked);
        btn.querySelector('.like-count').innerText = likesCount;
      } catch (err) {
        showToast(err.message, 'error');
        if (!getCurrentUser()) openAuthModal();
      }
    });
  });

  // Delete post buttons
  document.querySelectorAll('.delete-post-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.id;
      if (confirm('Are you sure you want to delete this post?')) {
        try {
          await Api.deletePost(postId);
          showToast('Post deleted successfully!');
          renderFeed();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  });

  // Comments section toggle
  document.querySelectorAll('.toggle-comments-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.id;
      const section = document.getElementById(`comments-section-${postId}`);
      if (section.style.display === 'block') {
        section.style.display = 'none';
      } else {
        section.style.display = 'block';
        loadComments(postId);
      }
    });
  });

  // Submit comment
  document.querySelectorAll('.submit-comment-btn').forEach(btn => {
    btn.addEventListener('click', () => submitComment(btn.dataset.id));
  });

  document.querySelectorAll('.comment-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitComment(input.dataset.id);
    });
  });
}

async function loadComments(postId) {
  const container = document.getElementById(`comments-list-${postId}`);
  if (!container) return;

  try {
    const { comments } = await Api.getComments(postId);
    const currentUser = getCurrentUser();

    if (comments.length === 0) {
      container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-dim);padding:0.5rem 0">No comments yet. Be the first!</div>';
      return;
    }

    container.innerHTML = comments.map(c => `
      <div class="comment-item">
        <img src="${c.profile_picture || DEMO_AVATAR_1}" class="avatar avatar-sm" alt="${c.username}">
        <div class="comment-content">
          <div class="comment-author">@${c.username} <span style="font-size:0.7rem;color:var(--text-dim);font-weight:400;margin-left:0.5rem">${timeAgo(c.created_at)}</span></div>
          <div class="comment-text">${escapeHtml(c.comment)}</div>
        </div>
        ${currentUser && currentUser.id === c.user_id ? `
          <button class="comment-delete-btn" onclick="handleDeleteComment(${c.id}, ${postId})">Delete</button>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="font-size:0.8rem;color:#ef4444">Failed to load comments</div>`;
  }
}

async function submitComment(postId) {
  const input = document.querySelector(`.comment-input[data-id="${postId}"]`);
  if (!input || !input.value.trim()) return;

  try {
    await Api.addComment(postId, input.value.trim());
    input.value = '';
    loadComments(postId);
    showToast('Comment posted!');
  } catch (err) {
    showToast(err.message, 'error');
    if (!getCurrentUser()) openAuthModal();
  }
}

async function handleDeleteComment(commentId, postId) {
  try {
    await Api.deleteComment(commentId);
    showToast('Comment removed.');
    loadComments(postId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   IMAGE UPLOAD & POST CREATION CONTROLLER
   ========================================================================== */

function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    state.selectedImageBase64 = event.target.result;
    document.getElementById('media-preview-img').src = state.selectedImageBase64;
    document.getElementById('media-preview-container').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function removeSelectedImage() {
  state.selectedImageBase64 = null;
  document.getElementById('media-preview-container').style.display = 'none';
  document.getElementById('image-upload-input').value = '';
}

async function handleCreatePost() {
  const captionInput = document.getElementById('create-post-caption');
  const caption = captionInput.value.trim();
  const image = state.selectedImageBase64;

  if (!caption && !image) {
    showToast('Please enter a caption or select an image to post.', 'error');
    return;
  }

  try {
    await Api.createPost(caption, image);
    showToast('Post published successfully! 🎉');
    captionInput.value = '';
    removeSelectedImage();
    renderFeed();
  } catch (err) {
    showToast(err.message, 'error');
    if (!getCurrentUser()) openAuthModal();
  }
}

/* ==========================================================================
   USER PROFILE CONTROLLER
   ========================================================================== */

async function renderProfile(userId) {
  const container = document.getElementById('profile-view');
  if (!container) return;

  try {
    const { user } = await Api.getProfile(userId);
    const currentUser = getCurrentUser();
    const isSelf = currentUser && currentUser.id === user.id;

    document.getElementById('profile-avatar').src = user.profile_picture || DEMO_AVATAR_1;
    document.getElementById('profile-username').innerText = `@${user.username}`;
    document.getElementById('profile-bio').innerText = user.bio || 'No bio provided.';
    document.getElementById('stat-posts').innerText = user.postsCount || 0;
    document.getElementById('stat-followers').innerText = user.followersCount || 0;
    document.getElementById('stat-following').innerText = user.followingCount || 0;

    const followBtn = document.getElementById('profile-follow-btn');
    const editBtn = document.getElementById('edit-profile-btn');

    if (isSelf) {
      if (followBtn) followBtn.style.display = 'none';
      if (editBtn) editBtn.style.display = 'inline-flex';
    } else {
      if (editBtn) editBtn.style.display = 'none';
      if (followBtn) {
        followBtn.style.display = 'inline-flex';
        followBtn.innerText = user.isFollowing ? 'Following' : 'Follow';
        followBtn.className = user.isFollowing ? 'btn btn-secondary' : 'btn btn-primary';
        followBtn.onclick = () => handleToggleFollow(user.id);
      }
    }

    // Render user posts grid
    const { posts } = await Api.getFeed();
    const userPosts = posts.filter(p => p.user_id === user.id);
    const grid = document.getElementById('profile-posts-grid');
    
    if (userPosts.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">No posts published yet.</div>';
    } else {
      grid.innerHTML = userPosts.map(p => createPostCardHTML(p)).join('');
      attachPostCardEvents();
    }

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleToggleFollow(targetUserId) {
  try {
    const res = await Api.toggleFollow(targetUserId);
    showToast(res.message);
    renderProfile(targetUserId);
  } catch (err) {
    showToast(err.message, 'error');
    if (!getCurrentUser()) openAuthModal();
  }
}

function openEditProfileModal() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  document.getElementById('edit-bio-input').value = currentUser.bio || '';
  document.getElementById('edit-profile-modal').classList.add('active');
}

function closeEditProfileModal() {
  document.getElementById('edit-profile-modal').classList.remove('active');
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const bio = document.getElementById('edit-bio-input').value.trim();
  const avatarFile = document.getElementById('edit-avatar-input').files[0];

  let avatarBase64 = null;
  if (avatarFile) {
    avatarBase64 = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (ev) => resolve(ev.target.result);
      r.readAsDataURL(avatarFile);
    });
  }

  try {
    await Api.updateProfile(bio, avatarBase64);
    showToast('Profile updated successfully!');
    closeEditProfileModal();
    renderApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   FOLLOWERS & FOLLOWING LIST MODAL
   ========================================================================== */

async function openUserListModal(type, userId) {
  const modal = document.getElementById('user-list-modal');
  const title = document.getElementById('user-list-modal-title');
  const content = document.getElementById('user-list-modal-content');
  if (!modal || !title || !content) return;

  title.innerText = type;
  content.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-muted)">Loading...</div>';
  modal.classList.add('active');

  try {
    const data = type === 'Followers' 
      ? await Api.getFollowers(userId) 
      : await Api.getFollowing(userId);

    const list = type === 'Followers' ? data.followers : data.following;

    if (!list || list.length === 0) {
      content.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-dim)">No ${type.toLowerCase()} found.</div>`;
      return;
    }

    content.innerHTML = list.map(u => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.65rem 0.85rem;background:rgba(255,255,255,0.03);border-radius:var(--radius-md);cursor:pointer;transition:background var(--transition-fast)" onclick="closeUserListModal();switchView('profile', ${u.id})" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <img src="${u.profile_picture || DEMO_AVATAR_1}" class="avatar avatar-sm" alt="${u.username}">
          <div>
            <div style="font-weight:600;font-size:0.9rem;color:var(--text-main)">@${u.username}</div>
            <div style="font-size:0.75rem;color:var(--text-dim)">${escapeHtml(u.bio || 'No bio provided')}</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    content.innerHTML = `<div style="color:#ef4444;text-align:center;padding:1rem">Error: ${err.message}</div>`;
  }
}

function closeUserListModal() {
  document.getElementById('user-list-modal')?.classList.remove('active');
}

/* ==========================================================================
   AUTHENTICATION CONTROLLER
   ========================================================================== */

function openAuthModal() {
  document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

function setAuthTab(tab) {
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (tab === 'login') {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const data = await Api.login(email, password);
    showToast(`Welcome back, @${data.user.username}! ✨`);
    closeAuthModal();
    renderApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const bio = document.getElementById('reg-bio').value;

  try {
    const data = await Api.register(username, email, password, bio);
    showToast(`Account created! Welcome @${data.user.username}! 🚀`);
    closeAuthModal();
    renderApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  Api.logout();
  showToast('Logged out successfully.');
  switchView('feed');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
