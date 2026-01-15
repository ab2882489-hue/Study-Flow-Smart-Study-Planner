// StudyFlow – Smart Student Planner - JavaScript

// ===== GLOBAL VARIABLES =====
let subjects = [];
let tasks = [];
let currentDate = new Date();
let currentView = 'timetable'; // 'timetable' or 'cards'
let timerInterval = null;
let timerTime = 25 * 60; // 25 minutes in seconds
let timerRunning = false;
let timerMode = 'study'; // 'study' or 'break'
let studyDuration = 25;
let breakDuration = 5;

// ===== DOM ELEMENTS =====
const studyPlanForm = document.getElementById('study-plan-form');
const scheduleContainer = document.getElementById('schedule-container');
const taskList = document.getElementById('task-list');
const progressText = document.querySelector('.progress-text');
const progressBar = document.querySelector('.progress-bar');
const completedTasksEl = document.getElementById('completed-tasks');
const totalTasksEl = document.getElementById('total-tasks');
const subjectProgressList = document.getElementById('subject-progress-list');
const todayCompletedEl = document.getElementById('today-completed');
const studyHoursEl = document.getElementById('study-hours');
const currentDateEl = document.getElementById('current-date');
const timerDisplay = document.getElementById('timer-display');
const timerLabel = document.getElementById('timer-label');
const timerProgressBar = document.getElementById('timer-progress-bar');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const studyTimeInput = document.getElementById('study-time');
const breakTimeInput = document.getElementById('break-time');
const clearScheduleBtn = document.getElementById('clear-schedule');
const viewTimetableBtn = document.getElementById('view-timetable');
const viewCardsBtn = document.getElementById('view-cards');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const markAllTasksBtn = document.getElementById('mark-all-tasks');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const timerAlert = document.getElementById('timer-alert');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Set default date for deadline input (1 week from today)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    document.getElementById('deadline').valueAsDate = nextWeek;
    
    // Set current date display
    updateCurrentDateDisplay();
    
    // Load data from localStorage
    loadData();
    
    // Generate initial schedule and tasks
    renderSchedule();
    renderTasks();
    updateDashboard();
    
    // Setup event listeners
    setupEventListeners();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Study plan form submission
    studyPlanForm.addEventListener('submit', handleStudyPlanSubmit);
    
    // Timer controls
    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);
    
    // Timer settings
    studyTimeInput.addEventListener('change', updateTimerSettings);
    breakTimeInput.addEventListener('change', updateTimerSettings);
    
    // Schedule controls
    clearScheduleBtn.addEventListener('click', clearAllData);
    viewTimetableBtn.addEventListener('click', () => switchView('timetable'));
    viewCardsBtn.addEventListener('click', () => switchView('cards'));
    
    // Task controls
    prevDayBtn.addEventListener('click', () => changeDate(-1));
    nextDayBtn.addEventListener('click', () => changeDate(1));
    markAllTasksBtn.addEventListener('click', markAllTasksAsDone);
    
    // Task completion (event delegation)
    taskList.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox') {
            const taskId = e.target.dataset.taskId;
            toggleTaskCompletion(taskId);
        }
    });
    
    // Schedule completion (event delegation)
    scheduleContainer.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox') {
            const taskId = e.target.dataset.taskId;
            toggleTaskCompletion(taskId);
        }
    });
}

// ===== STUDY PLAN GENERATION =====
function handleStudyPlanSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const subjectName = document.getElementById('subject-name').value;
    const deadline = new Date(document.getElementById('deadline').value);
    const difficulty = document.getElementById('difficulty').value;
    const dailyHours = parseFloat(document.getElementById('daily-hours').value);
    
    // Validate deadline
    if (deadline <= new Date()) {
        showNotification('Please select a future deadline date.', 'error');
        return;
    }
    
    // Calculate remaining days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = deadline.getTime() - today.getTime();
    const remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (remainingDays <= 0) {
        showNotification('Deadline must be in the future.', 'error');
        return;
    }
    
    // Calculate weight based on difficulty
    let weight;
    switch(difficulty) {
        case 'easy': weight = 0.7; break;
        case 'medium': weight = 1.0; break;
        case 'hard': weight = 1.5; break;
        default: weight = 1.0;
    }
    
    // Calculate total study hours needed
    const totalHoursNeeded = remainingDays * dailyHours * weight;
    
    // Create subject object
    const subject = {
        id: generateId(),
        name: subjectName,
        deadline: deadline.toISOString().split('T')[0],
        difficulty: difficulty,
        dailyHours: dailyHours,
        totalHoursNeeded: totalHoursNeeded,
        remainingDays: remainingDays,
        hoursPerDay: totalHoursNeeded / remainingDays,
        createdAt: new Date().toISOString()
    };
    
    // Add subject to list
    subjects.push(subject);
    
    // Generate daily tasks for this subject
    generateDailyTasks(subject);
    
    // Save data and update UI
    saveData();
    renderSchedule();
    renderTasks();
    updateDashboard();
    
    // Show success notification
    showNotification(`Study plan for "${subjectName}" generated successfully!`, 'success');
    
    // Reset form
    studyPlanForm.reset();
    // Set default deadline (1 week from today)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('deadline').valueAsDate = nextWeek;
}

function generateDailyTasks(subject) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadline = new Date(subject.deadline);
    
    // For each day from today to deadline, create a task
    for (let i = 0; i < subject.remainingDays; i++) {
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + i);
        
        // Format date as YYYY-MM-DD
        const dateStr = taskDate.toISOString().split('T')[0];
        
        // Create task object
        const task = {
            id: generateId(),
            subjectId: subject.id,
            subjectName: subject.name,
            name: `Study ${subject.name}`,
            date: dateStr,
            hours: subject.hoursPerDay,
            completed: false,
            difficulty: subject.difficulty
        };
        
        tasks.push(task);
    }
}

// ===== SCHEDULE RENDERING =====
function renderSchedule() {
    // Clear schedule container
    scheduleContainer.innerHTML = '';
    
    // If no subjects, show empty state
    if (subjects.length === 0) {
        scheduleContainer.innerHTML = `
            <div class="empty-schedule">
                <i class="fas fa-calendar-plus"></i>
                <h3>No Study Schedule Yet</h3>
                <p>Generate a study plan using the form above to see your schedule here.</p>
            </div>
        `;
        return;
    }
    
    // Get today's date string
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Filter today's tasks
    const todayTasks = tasks.filter(task => task.date === todayStr);
    
    // If no tasks for today, show message
    if (todayTasks.length === 0) {
        scheduleContainer.innerHTML = `
            <div class="empty-schedule">
                <i class="fas fa-calendar-check"></i>
                <h3>No Tasks for Today</h3>
                <p>All your study tasks are scheduled for other days.</p>
            </div>
        `;
        return;
    }
    
    // Render based on current view
    if (currentView === 'timetable') {
        renderTimetableView(todayTasks);
    } else {
        renderCardsView(todayTasks);
    }
}

function renderTimetableView(tasks) {
    const timetable = document.createElement('div');
    timetable.className = 'schedule-timetable';
    
    tasks.forEach(task => {
        const subject = subjects.find(s => s.id === task.subjectId);
        
        const card = document.createElement('div');
        card.className = `schedule-card ${task.completed ? 'completed' : ''}`;
        
        card.innerHTML = `
            <div class="schedule-card-header">
                <div>
                    <div class="schedule-subject">${task.subjectName}</div>
                    <div class="schedule-date">${formatDate(task.date)}</div>
                </div>
                <span class="schedule-difficulty difficulty-${task.difficulty}">${task.difficulty}</span>
            </div>
            <div class="schedule-hours">
                <i class="fas fa-clock"></i>
                <span>${task.hours.toFixed(1)} hours</span>
            </div>
            <div class="checkbox-container">
                <input type="checkbox" id="task-${task.id}" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>
                <label for="task-${task.id}">Mark as completed</label>
            </div>
        `;
        
        timetable.appendChild(card);
    });
    
    scheduleContainer.appendChild(timetable);
}

function renderCardsView(tasks) {
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'schedule-cards';
    
    // Group tasks by subject
    const tasksBySubject = {};
    tasks.forEach(task => {
        if (!tasksBySubject[task.subjectId]) {
            tasksBySubject[task.subjectId] = [];
        }
        tasksBySubject[task.subjectId].push(task);
    });
    
    // Create a card for each subject
    Object.keys(tasksBySubject).forEach(subjectId => {
        const subjectTasks = tasksBySubject[subjectId];
        const subject = subjects.find(s => s.id === subjectId);
        const totalHours = subjectTasks.reduce((sum, task) => sum + task.hours, 0);
        const completedTasks = subjectTasks.filter(task => task.completed).length;
        const totalTasks = subjectTasks.length;
        
        const card = document.createElement('div');
        card.className = 'schedule-card';
        
        card.innerHTML = `
            <div class="schedule-card-header">
                <div>
                    <div class="schedule-subject">${subject.name}</div>
                    <div class="schedule-date">Today</div>
                </div>
                <span class="schedule-difficulty difficulty-${subject.difficulty}">${subject.difficulty}</span>
            </div>
            <div class="schedule-hours">
                <i class="fas fa-clock"></i>
                <span>${totalHours.toFixed(1)} hours total</span>
            </div>
            <div>
                <p>${completedTasks} of ${totalTasks} tasks completed</p>
                <div class="subject-progress-bar">
                    <div class="subject-progress-fill" style="width: ${(completedTasks / totalTasks) * 100}%"></div>
                </div>
            </div>
            ${subjectTasks.map(task => `
                <div class="checkbox-container" style="margin-top: 0.5rem;">
                    <input type="checkbox" id="task-${task.id}" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>
                    <label for="task-${task.id}">${task.hours.toFixed(1)} hours</label>
                </div>
            `).join('')}
        `;
        
        cardsContainer.appendChild(card);
    });
    
    scheduleContainer.appendChild(cardsContainer);
}

function switchView(view) {
    currentView = view;
    
    // Update active button
    if (view === 'timetable') {
        viewTimetableBtn.classList.add('active');
        viewCardsBtn.classList.remove('active');
    } else {
        viewCardsBtn.classList.add('active');
        viewTimetableBtn.classList.remove('active');
    }
    
    // Re-render schedule
    renderSchedule();
}

// ===== TASK MANAGEMENT =====
function renderTasks() {
    // Clear task list
    taskList.innerHTML = '';
    
    // Format current date as YYYY-MM-DD
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    // Filter tasks for current date
    const dateTasks = tasks.filter(task => task.date === currentDateStr);
    
    // If no tasks for this date, show empty state
    if (dateTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-tasks">
                <i class="fas fa-clipboard-list"></i>
                <h3>No Tasks for ${formatDate(currentDateStr)}</h3>
                <p>Tasks will appear here after generating a study plan.</p>
            </div>
        `;
        return;
    }
    
    // Render each task
    dateTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        taskElement.innerHTML = `
            <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-header">
                    <div class="task-name">${task.name}</div>
                    <div class="task-date">${formatDate(task.date)}</div>
                </div>
                <div class="task-subject">${task.subjectName}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
                    <span><i class="fas fa-clock"></i> ${task.hours.toFixed(1)} hours</span>
                    <span class="schedule-difficulty difficulty-${task.difficulty}" style="font-size: 0.7rem;">${task.difficulty}</span>
                </div>
            </div>
        `;
        
        taskList.appendChild(taskElement);
    });
}

function toggleTaskCompletion(taskId) {
    // Find task
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
        // Toggle completion status
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        
        // Save data and update UI
        saveData();
        renderSchedule();
        renderTasks();
        updateDashboard();
        
        // Show notification
        const task = tasks[taskIndex];
        const status = task.completed ? 'completed' : 'marked as incomplete';
        showNotification(`Task "${task.name}" ${status}!`, 'success');
    }
}

function markAllTasksAsDone() {
    // Format current date as YYYY-MM-DD
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    // Mark all tasks for current date as completed
    tasks.forEach(task => {
        if (task.date === currentDateStr) {
            task.completed = true;
        }
    });
    
    // Save data and update UI
    saveData();
    renderSchedule();
    renderTasks();
    updateDashboard();
    
    // Show notification
    showNotification('All tasks for today marked as completed!', 'success');
}

function changeDate(days) {
    currentDate.setDate(currentDate.getDate() + days);
    updateCurrentDateDisplay();
    renderTasks();
}

function updateCurrentDateDisplay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isToday = currentDate.toDateString() === today.toDateString();
    const isTomorrow = currentDate.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();
    const isYesterday = currentDate.toDateString() === new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
        currentDateEl.textContent = 'Today';
    } else if (isTomorrow) {
        currentDateEl.textContent = 'Tomorrow';
    } else if (isYesterday) {
        currentDateEl.textContent = 'Yesterday';
    } else {
        currentDateEl.textContent = formatDate(currentDate.toISOString().split('T')[0]);
    }
}

// ===== FOCUS TIMER =====
function startTimer() {
    if (timerRunning) return;
    
    timerRunning = true;
    startTimerBtn.disabled = true;
    pauseTimerBtn.disabled = false;
    
    // Update timer label
    timerLabel.textContent = timerMode === 'study' ? 'Study Session' : 'Break Time';
    
    timerInterval = setInterval(() => {
        timerTime--;
        
        // Update display
        updateTimerDisplay();
        
        // Update progress bar
        const totalTime = timerMode === 'study' ? studyDuration * 60 : breakDuration * 60;
        const progress = ((totalTime - timerTime) / totalTime) * 100;
        timerProgressBar.style.width = `${progress}%`;
        
        // Check if timer is complete
        if (timerTime <= 0) {
            timerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    if (!timerRunning) return;
    
    timerRunning = false;
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
    
    clearInterval(timerInterval);
}

function resetTimer() {
    pauseTimer();
    
    // Reset to study mode
    timerMode = 'study';
    timerTime = studyDuration * 60;
    
    // Reset UI
    updateTimerDisplay();
    timerProgressBar.style.width = '0%';
    timerLabel.textContent = 'Study Session';
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
}

function timerComplete() {
    pauseTimer();
    
    // Play alert sound
    timerAlert.play().catch(e => console.log("Audio play failed:", e));
    
    // Show notification
    const message = timerMode === 'study' 
        ? 'Study session complete! Time for a break.' 
        : 'Break time over! Ready to study again.';
    
    showNotification(message, 'success');
    
    // Switch mode
    if (timerMode === 'study') {
        timerMode = 'break';
        timerTime = breakDuration * 60;
        timerLabel.textContent = 'Break Time';
    } else {
        timerMode = 'study';
        timerTime = studyDuration * 60;
        timerLabel.textContent = 'Study Session';
    }
    
    // Update display
    updateTimerDisplay();
    timerProgressBar.style.width = '0%';
    
    // Auto-start next session
    setTimeout(() => {
        startTimer();
    }, 2000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerTime / 60);
    const seconds = timerTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimerSettings() {
    studyDuration = parseInt(studyTimeInput.value) || 25;
    breakDuration = parseInt(breakTimeInput.value) || 5;
    
    // If timer is not running, update the display
    if (!timerRunning && timerMode === 'study') {
        timerTime = studyDuration * 60;
        updateTimerDisplay();
    }
}

// ===== PROGRESS DASHBOARD =====
function updateDashboard() {
    // Calculate overall progress
    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter(task => task.completed).length;
    const overallProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
    
    // Update overall progress circle
    progressText.textContent = `${overallProgress}%`;
    const circumference = 2 * Math.PI * 54; // radius = 54
    const offset = circumference - (overallProgress / 100) * circumference;
    progressBar.style.strokeDashoffset = offset;
    
    // Update task counts
    completedTasksEl.textContent = completedTasksCount;
    totalTasksEl.textContent = totalTasksCount;
    
    // Update subject progress
    updateSubjectProgress();
    
    // Update today's focus stats
    updateTodayFocusStats();
}

function updateSubjectProgress() {
    // Clear subject progress list
    subjectProgressList.innerHTML = '';
    
    // If no subjects, show empty message
    if (subjects.length === 0) {
        subjectProgressList.innerHTML = '<p class="empty-message">No subjects added yet.</p>';
        return;
    }
    
    // Calculate progress for each subject
    subjects.forEach(subject => {
        const subjectTasks = tasks.filter(task => task.subjectId === subject.id);
        const completedSubjectTasks = subjectTasks.filter(task => task.completed).length;
        const subjectProgress = subjectTasks.length > 0 ? Math.round((completedSubjectTasks / subjectTasks.length) * 100) : 0;
        
        const progressItem = document.createElement('div');
        progressItem.className = 'subject-progress-item';
        
        progressItem.innerHTML = `
            <div class="subject-name">
                <span>${subject.name}</span>
                <span>${subjectProgress}%</span>
            </div>
            <div class="subject-progress-bar">
                <div class="subject-progress-fill" style="width: ${subjectProgress}%"></div>
            </div>
        `;
        
        subjectProgressList.appendChild(progressItem);
    });
}

function updateTodayFocusStats() {
    // Get today's date string
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Filter today's tasks
    const todayTasks = tasks.filter(task => task.date === todayStr);
    const completedTodayTasks = todayTasks.filter(task => task.completed).length;
    
    // Calculate total study hours for today
    const totalStudyHours = todayTasks.reduce((sum, task) => sum + task.hours, 0);
    const completedStudyHours = todayTasks
        .filter(task => task.completed)
        .reduce((sum, task) => sum + task.hours, 0);
    
    // Update UI
    todayCompletedEl.textContent = completedTodayTasks;
    studyHoursEl.textContent = `${completedStudyHours.toFixed(1)}h`;
}

// ===== DATA PERSISTENCE =====
function saveData() {
    localStorage.setItem('studyflow_subjects', JSON.stringify(subjects));
    localStorage.setItem('studyflow_tasks', JSON.stringify(tasks));
    localStorage.setItem('studyflow_currentView', currentView);
    localStorage.setItem('studyflow_timerSettings', JSON.stringify({
        studyDuration,
        breakDuration
    }));
}

function loadData() {
    // Load subjects
    const savedSubjects = localStorage.getItem('studyflow_subjects');
    if (savedSubjects) {
        subjects = JSON.parse(savedSubjects);
    }
    
    // Load tasks
    const savedTasks = localStorage.getItem('studyflow_tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    
    // Load current view
    const savedView = localStorage.getItem('studyflow_currentView');
    if (savedView) {
        currentView = savedView;
        
        // Update button states
        if (currentView === 'timetable') {
            viewTimetableBtn.classList.add('active');
            viewCardsBtn.classList.remove('active');
        } else {
            viewCardsBtn.classList.add('active');
            viewTimetableBtn.classList.remove('active');
        }
    }
    
    // Load timer settings
    const savedTimerSettings = localStorage.getItem('studyflow_timerSettings');
    if (savedTimerSettings) {
        const settings = JSON.parse(savedTimerSettings);
        studyDuration = settings.studyDuration || 25;
        breakDuration = settings.breakDuration || 5;
        
        studyTimeInput.value = studyDuration;
        breakTimeInput.value = breakDuration;
        
        // Reset timer with saved settings
        if (timerMode === 'study') {
            timerTime = studyDuration * 60;
            updateTimerDisplay();
        }
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        subjects = [];
        tasks = [];
        
        // Clear localStorage
        localStorage.removeItem('studyflow_subjects');
        localStorage.removeItem('studyflow_tasks');
        
        // Reset UI
        renderSchedule();
        renderTasks();
        updateDashboard();
        
        showNotification('All data has been cleared.', 'success');
    }
}

// ===== UTILITY FUNCTIONS =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showNotification(message, type = 'info') {
    notificationMessage.textContent = message;
    
    // Set color based on type
    if (type === 'error') {
        notification.style.backgroundColor = '#ef4444';
    } else if (type === 'success') {
        notification.style.backgroundColor = '#10b981';
    } else {
        notification.style.backgroundColor = '#4f46e5';
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
