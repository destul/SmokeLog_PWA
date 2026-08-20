/**
 * SmokeLog — Core PWA Application Logic
 * Clean, offline-first habit tracker without ads or trackers.
 */

// Default Configuration & Data Schema
const DEFAULT_TAGS = [
  { id: 'coffee', label: 'Кофе', icon: '☕' },
  { id: 'food', label: 'После еды', icon: '🍽️' },
  { id: 'work', label: 'Работа / Пауза', icon: '💻' },
  { id: 'stress', label: 'Стресс / Нервы', icon: '⚡' },
  { id: 'alcohol', label: 'Алкоголь / Бар', icon: '🍺' },
  { id: 'road', label: 'Дорога / Пробка', icon: '🚗' },
  { id: 'social', label: 'Компания', icon: '👥' },
  { id: 'boredom', label: 'Скука', icon: '⏳' },
  { id: 'night', label: 'Перед сном', icon: '🌙' }
];

const DEFAULT_SETTINGS = {
  packPrice: 120,
  packSize: 20,
  currency: '₴',
  itemType: 'cigarettes',
  theme: 'dark',
  tags: DEFAULT_TAGS
};

const STORAGE_KEYS = {
  LOGS: 'smokelog_logs_v1',
  SETTINGS: 'smokelog_settings_v1'
};

class SmokeLogApp {
  constructor() {
    this.logs = this.loadLogs();
    this.settings = this.loadSettings();
    this.currentView = 'tracker';
    this.analyticsPeriod = '7';
    this.selectedModalTag = null;
    this.deferredPrompt = null;
    this.timerInterval = null;

    this.init();
  }

  // --- Storage Management ---
  loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to load settings from storage', e);
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  loadLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load logs', e);
      return [];
    }
  }

  saveLogs() {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  }

  // --- Initialization ---
  init() {
    this.applyTheme(this.settings.theme);
    this.setupDateDisplay();
    this.bindEvents();
    this.renderCurrentView();
    this.startLiveTimer();
    this.registerServiceWorker();
  }

  setupDateDisplay() {
    const dateEl = document.getElementById('currentDateStr');
    if (!dateEl) return;
    const now = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    const formatted = now.toLocaleDateString('ru-RU', options);
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // --- DOM Event Binding ---
  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.switchView(view);
      });
    });

    // Main Log Action Button (+1)
    const mainLogBtn = document.getElementById('mainLogBtn');
    if (mainLogBtn) {
      mainLogBtn.addEventListener('click', () => this.handleMainLogClick());
    }

    // Quick Add Past
    const quickAddPastBtn = document.getElementById('quickAddPastBtn');
    if (quickAddPastBtn) {
      quickAddPastBtn.addEventListener('click', () => this.openEntryModal());
    }

    const addManualEntryBtn = document.getElementById('addManualEntryBtn');
    if (addManualEntryBtn) {
      addManualEntryBtn.addEventListener('click', () => this.openEntryModal());
    }

    // Analytics Period Filters
    document.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.analyticsPeriod = e.currentTarget.dataset.period;
        this.renderAnalytics();
      });
    });

    // Settings Inputs
    const settingPrice = document.getElementById('settingPrice');
    const settingPackSize = document.getElementById('settingPackSize');
    const settingCurrency = document.getElementById('settingCurrency');
    const settingItemType = document.getElementById('settingItemType');

    if (settingPrice) {
      settingPrice.value = this.settings.packPrice;
      settingPrice.addEventListener('change', (e) => {
        this.settings.packPrice = Math.max(0, parseFloat(e.target.value) || 0);
        this.saveSettings();
        this.renderCurrentView();
      });
    }

    if (settingPackSize) {
      settingPackSize.value = this.settings.packSize;
      settingPackSize.addEventListener('change', (e) => {
        this.settings.packSize = Math.max(1, parseInt(e.target.value, 10) || 20);
        this.saveSettings();
        this.renderCurrentView();
      });
    }

    if (settingCurrency) {
      settingCurrency.value = this.settings.currency;
      settingCurrency.addEventListener('change', (e) => {
        this.settings.currency = e.target.value;
        const suffix = document.getElementById('currencySuffixLabel');
        if (suffix) suffix.textContent = e.target.value;
        this.saveSettings();
        this.renderCurrentView();
      });
    }

    if (settingItemType) {
      settingItemType.value = this.settings.itemType;
      settingItemType.addEventListener('change', (e) => {
        this.settings.itemType = e.target.value;
        this.saveSettings();
      });
    }

    // Theme Switcher Buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const theme = e.currentTarget.dataset.theme;
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.applyTheme(theme);
      });
    });

    // Export & Import Handlers
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => this.exportJSON());
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => this.exportCSV());
    document.getElementById('importJsonFile')?.addEventListener('change', (e) => this.importJSON(e));
    document.getElementById('clearDataBtn')?.addEventListener('click', () => this.clearAllData());

    // Modal Events
    document.getElementById('modalCloseBtn')?.addEventListener('click', () => this.closeEntryModal());
    document.getElementById('modalSaveBtn')?.addEventListener('click', () => this.saveModalEntry());
    document.getElementById('modalDeleteBtn')?.addEventListener('click', () => this.deleteModalEntry());

    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('installAppBtn');
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.addEventListener('click', async () => {
          if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
              installBtn.classList.add('hidden');
            }
            this.deferredPrompt = null;
          }
        });
      }
    });
  }

  // --- Theme Controller ---
  applyTheme(theme) {
    this.settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'oled' ? '#000000' : theme === 'light' ? '#ffffff' : '#0e1116');
    }
    document.querySelectorAll('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === theme);
    });
    this.saveSettings();
  }

  // --- View Switcher ---
  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));

    const targetSec = document.getElementById(`view-${viewName}`);
    if (targetSec) targetSec.classList.add('active');

    this.renderCurrentView();
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'tracker':
        this.renderTracker();
        break;
      case 'analytics':
        this.renderAnalytics();
        break;
      case 'history':
        this.renderHistory();
        break;
      case 'settings':
        break;
    }
  }

  // --- Core Action: Main Log (+1) ---
  handleMainLogClick() {
    if (navigator.vibrate) {
      navigator.vibrate([40]);
    }

    const now = new Date().toISOString();
    const newEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      timestamp: now,
      tag: null,
      note: '',
      count: 1
    };

    this.logs.unshift(newEntry);
    this.saveLogs();

    this.showToast('+1 Зафиксировано');
    this.renderTracker();
  }

  updateLatestLogTag(tagId) {
    if (this.logs.length === 0) return;

    // Find the latest log from today
    const latest = this.logs[0];
    latest.tag = (latest.tag === tagId) ? null : tagId; // toggle
    this.saveLogs();
    
    if (navigator.vibrate) {
      navigator.vibrate([20]);
    }

    const tagObj = this.settings.tags.find(t => t.id === tagId);
    this.showToast(latest.tag ? `Тег: ${tagObj?.icon || ''} ${tagObj?.label || ''}` : 'Тег снят');
    this.renderTracker();
  }

  // --- Live Interval Timer ---
  startLiveTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.updateIntervalUI();
    this.timerInterval = setInterval(() => this.updateIntervalUI(), 1000);
  }

  updateIntervalUI() {
    const timeEl = document.getElementById('timeSinceLastText');
    const lastTimeEl = document.getElementById('lastSmokeTimeText');
    if (!timeEl || !lastTimeEl) return;

    if (this.logs.length === 0) {
      timeEl.textContent = '0ч 00м';
      lastTimeEl.textContent = 'Записей ещё нет';
      return;
    }

    const latest = new Date(this.logs[0].timestamp);
    const diffMs = Math.max(0, Date.now() - latest.getTime());

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = Math.floor((diffMs / 1000) % 60);

    if (hours < 1) {
      timeEl.textContent = `${minutes}м ${seconds.toString().padStart(2, '0')}с`;
    } else {
      timeEl.textContent = `${hours}ч ${minutes.toString().padStart(2, '0')}м`;
    }

    // Format last time
    const isToday = new Date().toDateString() === latest.toDateString();
    const timeStr = latest.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    lastTimeEl.textContent = isToday ? `Последняя сегодня в ${timeStr}` : `Последняя: ${latest.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в ${timeStr}`;
  }

  // --- Tracker View Rendering ---
  renderTracker() {
    this.updateIntervalUI();
    this.renderQuickTags();
    this.renderTodayMetrics();
  }

  renderQuickTags() {
    const container = document.getElementById('quickTagsGrid');
    const hintEl = document.getElementById('lastTagHint');
    if (!container) return;

    const latestLog = this.logs.length > 0 ? this.logs[0] : null;
    const currentTag = latestLog ? latestLog.tag : null;

    if (latestLog) {
      const timeStr = new Date(latestLog.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      hintEl.textContent = `к сигарете в ${timeStr}`;
    } else {
      hintEl.textContent = 'после нажатия';
    }

    container.innerHTML = '';
    this.settings.tags.forEach(tag => {
      const chip = document.createElement('button');
      chip.className = `tag-chip ${currentTag === tag.id ? 'selected' : ''}`;
      chip.innerHTML = `<span class="tag-emoji">${tag.icon}</span> <span>${tag.label}</span>`;
      chip.addEventListener('click', () => {
        if (!latestLog) {
          // If no logs exist, log one with this tag
          this.handleMainLogClick();
          this.updateLatestLogTag(tag.id);
        } else {
          this.updateLatestLogTag(tag.id);
        }
      });
      container.appendChild(chip);
    });
  }

  renderTodayMetrics() {
    const todayCountEl = document.getElementById('todayCount');
    const todayCostEl = document.getElementById('todayCost');
    const todayVsAvgSubEl = document.getElementById('todayVsAvgSub');
    const packRatioSubEl = document.getElementById('packRatioSub');
    const todayAvgIntervalEl = document.getElementById('todayAvgInterval');

    const todayLogs = this.getLogsForDate(new Date());
    const count = todayLogs.length;

    // Cost calculation
    const costPerItem = this.settings.packPrice / (this.settings.packSize || 20);
    const todayCost = (count * costPerItem).toFixed(1);
    const packRatio = (count / (this.settings.packSize || 20)).toFixed(1);

    if (todayCountEl) todayCountEl.textContent = count;
    if (todayCostEl) todayCostEl.textContent = `${todayCost} ${this.settings.currency}`;
    if (packRatioSubEl) packRatioSubEl.textContent = `${packRatio} пачки`;

    // 7-day average comparison
    const avgDaily7 = this.getDailyAverage(7);
    if (todayVsAvgSubEl) {
      const diff = count - avgDaily7;
      const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
      todayVsAvgSubEl.textContent = avgDaily7 > 0 ? `${diffStr} от ср. (${avgDaily7.toFixed(1)})` : 'первые дни учёта';
    }

    // Average interval today
    if (todayAvgIntervalEl) {
      if (todayLogs.length <= 1) {
        todayAvgIntervalEl.textContent = '—';
      } else {
        const sorted = [...todayLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        let totalDiffMin = 0;
        for (let i = 1; i < sorted.length; i++) {
          const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60);
          totalDiffMin += diff;
        }
        const avgMin = Math.round(totalDiffMin / (sorted.length - 1));
        const hrs = Math.floor(avgMin / 60);
        const mins = avgMin % 60;
        todayAvgIntervalEl.textContent = hrs > 0 ? `${hrs}ч ${mins}м` : `${mins} мин`;
      }
    }
  }

  // --- Analytics View Rendering ---
  renderAnalytics() {
    const daysLimit = this.analyticsPeriod === 'all' ? null : parseInt(this.analyticsPeriod, 10);
    const filteredLogs = this.getLogsInPeriod(daysLimit);

    // 1. Highlights
    const totalCount = filteredLogs.length;
    const daysCount = daysLimit || Math.max(1, this.getTotalDaysSpan());
    const avgPerDay = (totalCount / daysCount).toFixed(1);
    const costPerItem = this.settings.packPrice / (this.settings.packSize || 20);
    const totalCost = (totalCount * costPerItem).toFixed(0);

    document.getElementById('statTotalCount').textContent = totalCount;
    document.getElementById('statAvgPerDay').textContent = avgPerDay;
    document.getElementById('statTotalCost').textContent = `${totalCost} ${this.settings.currency}`;
    document.getElementById('statMaxInterval').textContent = this.calculateMaxInterval(filteredLogs);

    // 2. Daily Chart
    this.renderDailyChart(daysLimit || 14);

    // 3. Hourly Heatmap
    this.renderHourlyChart(filteredLogs);

    // 4. Triggers Breakdown
    this.renderTriggersBreakdown(filteredLogs);

    // 5. Smart Insight
    this.renderInsight(filteredLogs, avgPerDay);
  }

  renderDailyChart(days) {
    const container = document.getElementById('dailyChartContainer');
    if (!container) return;
    container.innerHTML = '';

    const dailyCounts = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const logsOnDay = this.getLogsForDate(d);
      dailyCounts.push({
        date: d,
        label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: days <= 7 ? 'short' : undefined }),
        count: logsOnDay.length
      });
    }

    const maxCount = Math.max(1, ...dailyCounts.map(d => d.count));

    dailyCounts.forEach(item => {
      const col = document.createElement('div');
      col.className = 'chart-bar-col';

      const heightPct = Math.max(6, Math.round((item.count / maxCount) * 100));

      col.innerHTML = `
        <span class="chart-bar-val">${item.count > 0 ? item.count : ''}</span>
        <div class="chart-bar" style="height: ${heightPct}%;"></div>
        <span class="chart-bar-label">${item.label}</span>
      `;
      container.appendChild(col);
    });
  }

  renderHourlyChart(logs) {
    const container = document.getElementById('hourlyChartContainer');
    if (!container) return;
    container.innerHTML = '';

    const hourCounts = new Array(24).fill(0);
    logs.forEach(l => {
      const h = new Date(l.timestamp).getHours();
      hourCounts[h]++;
    });

    const maxH = Math.max(1, ...hourCounts);

    for (let h = 0; h < 24; h++) {
      const count = hourCounts[h];
      const block = document.createElement('div');
      let intensityClass = '';
      if (count > 0) {
        const ratio = count / maxH;
        if (ratio > 0.6) intensityClass = 'active-high';
        else if (ratio > 0.3) intensityClass = 'active-med';
        else intensityClass = 'active-low';
      }

      block.className = `hour-block ${intensityClass}`;
      block.innerHTML = `
        <div class="hour-time">${h}:00</div>
        <div class="hour-count">${count}</div>
      `;
      container.appendChild(block);
    }
  }

  renderTriggersBreakdown(logs) {
    const container = document.getElementById('triggersBreakdownList');
    if (!container) return;
    container.innerHTML = '';

    if (logs.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); font-size:13px; padding:10px 0;">Нет данных о триггерах за выбранный период.</div>';
      return;
    }

    const tagCounts = {};
    let untaggedCount = 0;

    logs.forEach(l => {
      if (l.tag) {
        tagCounts[l.tag] = (tagCounts[l.tag] || 0) + 1;
      } else {
        untaggedCount++;
      }
    });

    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    if (untaggedCount > 0) {
      sortedTags.push(['untagged', untaggedCount]);
    }

    sortedTags.forEach(([tagId, count]) => {
      const tagObj = this.settings.tags.find(t => t.id === tagId);
      const label = tagObj ? `${tagObj.icon} ${tagObj.label}` : 'Без тега';
      const pct = Math.round((count / logs.length) * 100);

      const row = document.createElement('div');
      row.className = 'trigger-row';
      row.innerHTML = `
        <div class="trigger-name-col">${label}</div>
        <div class="trigger-progress-bar">
          <div class="trigger-progress-fill" style="width: ${pct}%;"></div>
        </div>
        <div class="trigger-pct-col">${pct}% (${count})</div>
      `;
      container.appendChild(row);
    });
  }

  renderInsight(logs, avgPerDay) {
    const textEl = document.getElementById('smartInsightText');
    if (!textEl) return;

    if (logs.length < 3) {
      textEl.textContent = 'Продолжайте отмечать сигареты. Через пару дней здесь появятся персональные паттерны и пиковые часы привычки.';
      return;
    }

    // Determine top trigger
    const tagCounts = {};
    logs.forEach(l => {
      if (l.tag) tagCounts[l.tag] = (tagCounts[l.tag] || 0) + 1;
    });

    let topTag = null;
    let maxTagCount = 0;
    Object.entries(tagCounts).forEach(([tag, count]) => {
      if (count > maxTagCount) {
        maxTagCount = count;
        topTag = tag;
      }
    });

    // Peak hours
    const hourCounts = new Array(24).fill(0);
    logs.forEach(l => hourCounts[new Date(l.timestamp).getHours()]++);
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakEnd = (peakHour + 2) % 24;

    const topTagObj = this.settings.tags.find(t => t.id === topTag);
    const topTagName = topTagObj ? `«${topTagObj.label}»` : 'разные ситуации';

    textEl.innerHTML = `В среднем <strong>${avgPerDay} шт./день</strong>. Пик перекуров приходится на интервал <strong>${peakHour}:00–${peakEnd}:00</strong>, а частый контекст — ${topTagName} (${Math.round((maxTagCount / logs.length) * 100)}% всех отметок).`;
  }

  // --- History View Rendering ---
  renderHistory() {
    const container = document.getElementById('historyListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (this.logs.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:40px 0; color:var(--text-muted);">История пока пуста. Нажмите «Выкурил» на вкладке Трекер.</div>';
      return;
    }

    // Group logs by date
    const groups = {};
    this.logs.forEach(log => {
      const d = new Date(log.timestamp);
      const dateKey = d.toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(dateKey => {
      const groupLogs = groups[dateKey];
      const d = new Date(dateKey);
      const isToday = new Date().toDateString() === dateKey;
      const isYesterday = new Date(Date.now() - 86400000).toDateString() === dateKey;

      let title = isToday ? 'Сегодня' : isYesterday ? 'Вчера' : d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });

      const groupDiv = document.createElement('div');
      groupDiv.className = 'history-group';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'history-group-header';
      headerDiv.innerHTML = `
        <span class="history-group-title">${title}</span>
        <span class="history-group-total">${groupLogs.length} шт.</span>
      `;
      groupDiv.appendChild(headerDiv);

      // Render items inside group
      groupLogs.forEach(item => {
        const itemDate = new Date(item.timestamp);
        const timeStr = itemDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const tagObj = this.settings.tags.find(t => t.id === item.tag);

        const row = document.createElement('div');
        row.className = 'history-item';
        row.innerHTML = `
          <div class="history-left">
            <span class="history-time">${timeStr}</span>
            ${tagObj ? `<span class="history-tag-badge">${tagObj.icon} ${tagObj.label}</span>` : ''}
            ${item.note ? `<span class="history-note" title="${item.note}">${item.note}</span>` : ''}
          </div>
          <div class="history-interval">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        `;
        row.addEventListener('click', () => this.openEntryModal(item));
        groupDiv.appendChild(row);
      });

      container.appendChild(groupDiv);
    });
  }

  // --- Modal Logic (Add/Edit Entry) ---
  openEntryModal(entry = null) {
    const modal = document.getElementById('entryModal');
    const titleEl = document.getElementById('modalTitle');
    const idInput = document.getElementById('modalEntryId');
    const dtInput = document.getElementById('modalDateTime');
    const noteInput = document.getElementById('modalNote');
    const deleteBtn = document.getElementById('modalDeleteBtn');
    const tagsGrid = document.getElementById('modalTagsGrid');

    if (!modal) return;

    if (entry) {
      titleEl.textContent = 'Редактировать запись';
      idInput.value = entry.id;
      dtInput.value = this.toLocalISOString(new Date(entry.timestamp));
      noteInput.value = entry.note || '';
      this.selectedModalTag = entry.tag || null;
      deleteBtn.classList.remove('hidden');
    } else {
      titleEl.textContent = 'Добавить запись';
      idInput.value = '';
      dtInput.value = this.toLocalISOString(new Date());
      noteInput.value = '';
      this.selectedModalTag = null;
      deleteBtn.classList.add('hidden');
    }

    // Render tag chips in modal
    tagsGrid.innerHTML = '';
    this.settings.tags.forEach(tag => {
      const chip = document.createElement('button');
      chip.className = `tag-chip ${this.selectedModalTag === tag.id ? 'selected' : ''}`;
      chip.innerHTML = `<span class="tag-emoji">${tag.icon}</span> <span>${tag.label}</span>`;
      chip.addEventListener('click', () => {
        this.selectedModalTag = (this.selectedModalTag === tag.id) ? null : tag.id;
        tagsGrid.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('selected'));
        if (this.selectedModalTag) chip.classList.add('selected');
      });
      tagsGrid.appendChild(chip);
    });

    modal.classList.remove('hidden');
  }

  closeEntryModal() {
    const modal = document.getElementById('entryModal');
    if (modal) modal.classList.add('hidden');
  }

  saveModalEntry() {
    const id = document.getElementById('modalEntryId').value;
    const dtStr = document.getElementById('modalDateTime').value;
    const note = document.getElementById('modalNote').value.trim();

    if (!dtStr) {
      alert('Пожалуйста, выберите дату и время.');
      return;
    }

    const timestamp = new Date(dtStr).toISOString();

    if (id) {
      // Edit existing
      const entry = this.logs.find(l => l.id === id);
      if (entry) {
        entry.timestamp = timestamp;
        entry.tag = this.selectedModalTag;
        entry.note = note;
      }
      this.showToast('Запись обновлена');
    } else {
      // Create new
      const newEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        timestamp: timestamp,
        tag: this.selectedModalTag,
        note: note,
        count: 1
      };
      this.logs.push(newEntry);
      this.showToast('Запись добавлена');
    }

    // Sort logs descending by timestamp
    this.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.saveLogs();

    this.closeEntryModal();
    this.renderCurrentView();
  }

  deleteModalEntry() {
    const id = document.getElementById('modalEntryId').value;
    if (!id) return;

    if (confirm('Удалить эту запись?')) {
      this.logs = this.logs.filter(l => l.id !== id);
      this.saveLogs();
      this.closeEntryModal();
      this.showToast('Запись удалена');
      this.renderCurrentView();
    }
  }

  // --- Helpers & Aggregators ---
  getLogsForDate(date) {
    const targetStr = date.toDateString();
    return this.logs.filter(l => new Date(l.timestamp).toDateString() === targetStr);
  }

  getLogsInPeriod(daysLimit = 7) {
    if (!daysLimit) return this.logs;
    const cutoff = Date.now() - (daysLimit * 24 * 60 * 60 * 1000);
    return this.logs.filter(l => new Date(l.timestamp).getTime() >= cutoff);
  }

  getDailyAverage(days = 7) {
    const logs = this.getLogsInPeriod(days);
    return logs.length / days;
  }

  getTotalDaysSpan() {
    if (this.logs.length <= 1) return 1;
    const oldest = new Date(this.logs[this.logs.length - 1].timestamp).getTime();
    const span = (Date.now() - oldest) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.ceil(span));
  }

  calculateMaxInterval(logs) {
    if (logs.length <= 1) return '—';
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    let maxDiffMs = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp);
      if (diff > maxDiffMs) maxDiffMs = diff;
    }
    const maxMin = Math.round(maxDiffMs / (1000 * 60));
    const hrs = Math.floor(maxMin / 60);
    const mins = maxMin % 60;
    return hrs > 0 ? `${hrs}ч ${mins}м` : `${mins}м`;
  }

  toLocalISOString(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2200);
  }

  // --- Export & Import ---
  exportJSON() {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: this.settings,
      logs: this.logs
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, `smokelog_backup_${new Date().toISOString().split('T')[0]}.json`);
  }

  exportCSV() {
    if (this.logs.length === 0) {
      alert('Нет записей для экспорта.');
      return;
    }
    const headers = ['ID', 'Timestamp_ISO', 'Date', 'Time', 'Tag_ID', 'Tag_Name', 'Note'];
    const rows = this.logs.map(l => {
      const d = new Date(l.timestamp);
      const tagObj = this.settings.tags.find(t => t.id === l.tag);
      return [
        l.id,
        l.timestamp,
        d.toLocaleDateString('ru-RU'),
        d.toLocaleTimeString('ru-RU'),
        l.tag || '',
        tagObj ? tagObj.label : '',
        `"${(l.note || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `smokelog_export_${new Date().toISOString().split('T')[0]}.csv`);
  }

  importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.logs)) {
          this.logs = data.logs;
          this.saveLogs();
        }
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
          this.saveSettings();
        }
        this.showToast('Данные успешно импортированы!');
        this.renderCurrentView();
      } catch (err) {
        alert('Ошибка при чтении файла JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearAllData() {
    if (confirm('Вы действительно хотите удалить ВСЕ записи? Это действие необратимо.')) {
      this.logs = [];
      this.saveLogs();
      this.showToast('Все данные очищены');
      this.renderCurrentView();
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('ServiceWorker registered:', reg.scope))
          .catch(err => console.log('ServiceWorker registration failed:', err));
      });
    }
  }
}

// Instantiate on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SmokeLogApp();
});
