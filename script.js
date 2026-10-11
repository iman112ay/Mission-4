"use strict";

// Storage Keys
const STORAGE_KEY = "dailyTasksApp.tasks.v1";
const LEGACY_STORAGE_KEY = "videobelajar_tasks";
const PROFILE_KEY = "dailyTasksApp.profile.v1";

// Priorities
const PRIORITIES = {
  high: { label: "Tinggi", class: "high" },
  medium: { label: "Sedang", class: "medium" },
  low: { label: "Rendah", class: "low" }
};

let tasks = loadTasks();
let editingTaskId = null;
let deletingTaskId = null;

// Helpers
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "Tanpa tenggat";
  try {
    const today = getTodayString();
    if (dateStr === today) return "Hari ini";

    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    
    // Check tomorrow / yesterday
    const now = new Date();
    const diffTime = date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Besok";
    if (diffDays === -1) return "Kemarin";

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  } catch (e) {
    return dateStr;
  }
}

function getDaysLate(dueDateStr) {
  if (!dueDateStr) return 0;
  const today = getTodayString();
  const [ty, tm, td] = today.split("-").map(Number);
  const [dy, dm, dd] = dueDateStr.split("-").map(Number);
  
  const tDate = new Date(ty, tm - 1, td);
  const dDate = new Date(dy, dm - 1, dd);
  
  const diff = Math.round((dDate.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? Math.abs(diff) : 0;
}

function isTaskOverdue(task) {
  if (task.completed || !task.dueDate) return false;
  return getDaysLate(task.dueDate) > 0;
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Storage Operations
function loadTasks() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.map(item => ({
      id: item.id || generateId(),
      title: item.title || "Tugas",
      description: item.description || "",
      priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : "medium",
      dueDate: item.dueDate || "",
      completed: item.completed === true || item.status === "done",
      createdAt: item.createdAt || getTodayString(),
      completedAt: item.completedAt || null
    }));
  } catch (e) {
    console.error("Gagal membaca data tugas:", e);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    updateBadges();
  } catch (e) {
    console.error("Gagal menyimpan tugas:", e);
  }
}

// Profile
function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    const name = data && data.name ? data.name : "Pengguna";
    const role = data && data.role ? data.role : "Workspace";

    const nameEl = document.getElementById("profileName");
    const roleEl = document.getElementById("profileRole");
    const avatarEl = document.getElementById("profileAvatar");

    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = role;
    if (avatarEl) {
      const initials = name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "P";
      avatarEl.textContent = initials;
    }
  } catch (e) {
    console.error(e);
  }
}

function saveProfile(name, role) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, role }));
  loadProfile();
  showToast("Profil diperbarui");
}

// Toast
function showToast(message) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 2400);
}

// Live date in header
function initHeaderDate() {
  const el = document.getElementById("headerDate");
  if (!el) return;
  const now = new Date();
  el.textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);
}

// Sidebar Mobile Toggle
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar && overlay) {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  }
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar && overlay) {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  }
}

// Update Badges on Sidebar
function updateBadges() {
  const todoCount = tasks.filter(t => !t.completed).length;
  const doneCount = tasks.filter(t => t.completed).length;
  const overdueCount = tasks.filter(isTaskOverdue).length;

  const bTodo = document.getElementById("badgeTodo");
  const bDone = document.getElementById("badgeDone");
  const bOverdue = document.getElementById("badgeOverdue");

  if (bTodo) bTodo.textContent = todoCount;
  if (bDone) bDone.textContent = doneCount;
  if (bOverdue) {
    bOverdue.textContent = overdueCount;
    if (overdueCount > 0) {
      bOverdue.classList.add("danger");
    } else {
      bOverdue.classList.remove("danger");
    }
  }
}

// ==========================================================================
// MODAL CONTROLS
// ==========================================================================
function openAddModal() {
  const dialog = document.getElementById("addModal");
  if (!dialog) return;
  const form = document.getElementById("addForm");
  if (form) form.reset();
  dialog.showModal();
}

function closeAddModal() {
  const dialog = document.getElementById("addModal");
  if (dialog) dialog.close();
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  
  editingTaskId = id;
  const dialog = document.getElementById("editModal");
  if (!dialog) return;

  document.getElementById("editTitle").value = task.title;
  document.getElementById("editDesc").value = task.description || "";
  document.getElementById("editPriority").value = task.priority;
  document.getElementById("editDueDate").value = task.dueDate || "";

  dialog.showModal();
}

function closeEditModal() {
  const dialog = document.getElementById("editModal");
  if (dialog) dialog.close();
  editingTaskId = null;
}

function openDeleteModal(id) {
  deletingTaskId = id;
  const dialog = document.getElementById("deleteModal");
  if (dialog) {
    dialog.showModal();
  } else {
    if (confirm("Hapus tugas ini?")) deleteTask(id);
  }
}

function closeDeleteModal() {
  const dialog = document.getElementById("deleteModal");
  if (dialog) dialog.close();
  deletingTaskId = null;
}

function openProfileModal() {
  const dialog = document.getElementById("profileModal");
  if (!dialog) return;
  const raw = localStorage.getItem(PROFILE_KEY);
  const data = raw ? JSON.parse(raw) : {};
  document.getElementById("profileInputName").value = data.name || "Pengguna";
  document.getElementById("profileInputRole").value = data.role || "Workspace";
  dialog.showModal();
}

function closeProfileModal() {
  const dialog = document.getElementById("profileModal");
  if (dialog) dialog.close();
}

// ==========================================================================
// TASK OPERATIONS
// ==========================================================================
function createTask(data) {
  const title = data.title.trim();
  if (!title) return;

  const newTask = {
    id: generateId(),
    title: title,
    description: (data.description || "").trim(),
    priority: data.priority || "medium",
    dueDate: data.dueDate || "",
    completed: false,
    createdAt: getTodayString(),
    completedAt: null
  };

  tasks.unshift(newTask);
  saveTasks();
  closeAddModal();
  renderPage();
  showToast("Tugas ditambahkan");
}

function updateTask(id, data) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.title = data.title.trim();
  task.description = (data.description || "").trim();
  task.priority = data.priority;
  task.dueDate = data.dueDate || "";

  saveTasks();
  closeEditModal();
  renderPage();
  showToast("Tugas diperbarui");
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? getTodayString() : null;

  saveTasks();
  renderPage();
  showToast(task.completed ? "Tugas selesai" : "Tugas dibuka kembali");
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  closeDeleteModal();
  renderPage();
  showToast("Tugas dihapus");
}

function clearAllDone() {
  const count = tasks.filter(t => t.completed).length;
  if (count === 0) return;

  if (confirm(`Hapus semua ${count} tugas yang sudah selesai?`)) {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderPage();
    showToast("Semua tugas selesai telah dibersihkan");
  }
}

function rescheduleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // Suggest today + 1 day
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const def = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const newDate = prompt("Ubah tenggat waktu (YYYY-MM-DD):", def);
  if (newDate) {
    task.dueDate = newDate;
    saveTasks();
    renderPage();
    showToast("Tenggat waktu diperbarui");
  }
}

// ==========================================================================
// RENDERERS
// ==========================================================================
function renderPage() {
  const page = document.body.dataset.page;
  updateBadges();

  if (page === "dashboard") renderDashboard();
  else if (page === "todo") renderTodoList();
  else if (page === "done") renderDoneList();
  else if (page === "overdue") renderOverdueList();
}

function renderTaskHTML(task, opts = {}) {
  const p = PRIORITIES[task.priority] || PRIORITIES.medium;
  const overdue = isTaskOverdue(task);
  const daysLate = getDaysLate(task.dueDate);

  let dateInfo = "";
  if (task.dueDate) {
    if (overdue) {
      dateInfo = `<span class="badge-date alert">Terlambat ${daysLate} hari (${formatDate(task.dueDate)})</span>`;
    } else {
      dateInfo = `<span class="badge-date">${formatDate(task.dueDate)}</span>`;
    }
  }

  const isDoneClass = task.completed ? "is-done" : "";
  const isOverdueClass = overdue ? "is-overdue" : "";

  return `
    <div class="task-item ${isDoneClass} ${isOverdueClass}">
      <input 
        type="checkbox" 
        class="task-checkbox" 
        ${task.completed ? "checked" : ""} 
        onchange="toggleTask('${task.id}')"
        aria-label="Tandai selesai"
      >
      <div class="task-body">
        <div class="task-title">${escapeHTML(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ""}
        <div class="task-meta">
          <span class="badge-priority ${p.class}">${p.label}</span>
          ${dateInfo}
          ${task.completedAt ? `<span class="badge-date">Selesai ${formatDate(task.completedAt)}</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        ${opts.showReschedule ? `
          <button class="btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="rescheduleTask('${task.id}')">
            Ubah Tenggat
          </button>
        ` : ""}
        ${!task.completed ? `
          <button class="btn-icon" onclick="openEditModal('${task.id}')" title="Edit">
            ✎
          </button>
        ` : ""}
        <button class="btn-icon delete" onclick="openDeleteModal('${task.id}')" title="Hapus">
          ✕
        </button>
      </div>
    </div>
  `;
}

// 1. Dashboard
function renderDashboard() {
  const total = tasks.length;
  const todo = tasks.filter(t => !t.completed).length;
  const done = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(isTaskOverdue).length;

  const statTotal = document.getElementById("statTotal");
  const statTodo = document.getElementById("statTodo");
  const statDone = document.getElementById("statDone");
  const statOverdue = document.getElementById("statOverdue");

  if (statTotal) statTotal.textContent = total;
  if (statTodo) statTodo.textContent = todo;
  if (statDone) statDone.textContent = done;
  if (statOverdue) statOverdue.textContent = overdue;

  // Urgent list (overdue tasks)
  const urgentSection = document.getElementById("urgentSection");
  const urgentList = document.getElementById("urgentList");
  if (urgentSection && urgentList) {
    const overdueTasks = tasks.filter(isTaskOverdue);
    if (overdueTasks.length > 0) {
      urgentSection.style.display = "block";
      urgentList.innerHTML = overdueTasks.slice(0, 3).map(t => renderTaskHTML(t, { showReschedule: true })).join("");
    } else {
      urgentSection.style.display = "none";
    }
  }

  // Recent tasks (up to 5)
  const recentList = document.getElementById("recentList");
  if (recentList) {
    if (tasks.length === 0) {
      recentList.innerHTML = `
        <div class="empty-state">
          <p>Belum ada tugas tercatat.</p>
        </div>`;
    } else {
      recentList.innerHTML = tasks.slice(0, 5).map(t => renderTaskHTML(t)).join("");
    }
  }
}

// 2. To Do
function renderTodoList() {
  const listEl = document.getElementById("todoList");
  if (!listEl) return;

  const searchEl = document.getElementById("searchInput");
  const filterEl = document.getElementById("priorityFilter");

  const query = searchEl ? searchEl.value.toLowerCase().trim() : "";
  const filter = filterEl ? filterEl.value : "all";

  let list = tasks.filter(t => !t.completed);

  if (query) {
    list = list.filter(t => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));
  }

  if (filter !== "all") {
    list = list.filter(t => t.priority === filter);
  }

  const countEl = document.getElementById("todoCount");
  if (countEl) countEl.textContent = list.length;

  if (list.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p>${query || filter !== "all" ? "Tidak ada tugas yang cocok dengan filter." : "Tidak ada tugas yang perlu dikerjakan."}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = list.map(t => renderTaskHTML(t)).join("");
}

// 3. Done
function renderDoneList() {
  const listEl = document.getElementById("doneList");
  if (!listEl) return;

  const searchEl = document.getElementById("searchInput");
  const query = searchEl ? searchEl.value.toLowerCase().trim() : "";

  let list = tasks.filter(t => t.completed);

  if (query) {
    list = list.filter(t => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));
  }

  const countEl = document.getElementById("doneCount");
  if (countEl) countEl.textContent = list.length;

  if (list.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p>${query ? "Tidak ada tugas selesai yang cocok." : "Belum ada tugas yang diselesaikan."}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = list.map(t => renderTaskHTML(t)).join("");
}

// 4. Overdue
function renderOverdueList() {
  const listEl = document.getElementById("overdueList");
  if (!listEl) return;

  const searchEl = document.getElementById("searchInput");
  const query = searchEl ? searchEl.value.toLowerCase().trim() : "";

  let list = tasks.filter(isTaskOverdue);

  if (query) {
    list = list.filter(t => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));
  }

  const countEl = document.getElementById("overdueCount");
  if (countEl) countEl.textContent = list.length;

  if (list.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p>Tidak ada tugas yang terlambat.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = list.map(t => renderTaskHTML(t, { showReschedule: true })).join("");
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initHeaderDate();
  loadProfile();
  renderPage();

  // Add Task Form
  const addForm = document.getElementById("addForm");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      createTask({
        title: document.getElementById("inputTitle").value,
        description: document.getElementById("inputDesc").value,
        priority: document.getElementById("inputPriority").value,
        dueDate: document.getElementById("inputDueDate").value
      });
    });
  }

  // Edit Task Form
  const editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!editingTaskId) return;
      updateTask(editingTaskId, {
        title: document.getElementById("editTitle").value,
        description: document.getElementById("editDesc").value,
        priority: document.getElementById("editPriority").value,
        dueDate: document.getElementById("editDueDate").value
      });
    });
  }

  // Delete Confirm Button
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (deletingTaskId) deleteTask(deletingTaskId);
    });
  }

  // Profile Form
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("profileInputName").value;
      const role = document.getElementById("profileInputRole").value;
      saveProfile(name, role);
      closeProfileModal();
    });
  }

  // Search & Filter listeners
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", renderPage);

  const priorityFilter = document.getElementById("priorityFilter");
  if (priorityFilter) priorityFilter.addEventListener("change", renderPage);

  // Close dialogs when clicking backdrop
  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });
});
