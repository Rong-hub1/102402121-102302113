/**
 * app.js —— 校园失物招领 应用逻辑（SPA 路由 + 渲染 + 交互）
 * 依赖：store.js (window.LostFoundStore)、seed.js (window.LostFoundSeed)
 */
(function () {
  'use strict';

  var Store = window.LostFoundStore;
  var SEED = window.LostFoundSeed;
  var $ = function (id) { return document.getElementById(id); };
  // 浏览量去重：同一会话内同一详情页只加一次浏览量
  var VIEWED_KEY = 'lost_found_viewed_ids';

  /* ---------------- 状态 ---------------- */
  var state = {
    items: [],
    view: 'home',          // home / publish / detail / mine
    filterType: 'all',     // all / lost / found
    filterCategory: 'all', // all 或具体分类
    keyword: '',           // 搜索关键词
    detailId: null
  };

  /* ---------------- 初始化 ---------------- */
  function init() {
    var stored = Store.loadItems();
    if (stored && stored.length > 0) {
      state.items = stored;
    } else {
      state.items = SEED.slice();
      Store.saveItems(state.items);
    }
    bindEvents();
    renderHome();
    updateClock();
    setInterval(updateClock, 30000);
  }

  function updateClock() {
    var d = new Date();
    $('clock').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ---------------- 持久化 ---------------- */
  function persist() {
    Store.saveItems(state.items);
  }

  /* ---------------- 路由 / 页面切换 ---------------- */
  var NAV_TITLES = { home: '校园失物招领', publish: '发布信息', detail: '信息详情', mine: '我的发布' };

  function go(view, param) {
    state.view = view;
    // 切换 page
    var pages = ['home', 'publish', 'detail', 'mine'];
    pages.forEach(function (p) {
      $('page-' + p).classList.toggle('active', p === view);
    });
    // 导航栏
    $('navTitle').textContent = NAV_TITLES[view] || '';
    $('navBack').style.display = (view === 'home' || view === 'mine') ? 'none' : 'block';
    // 底部 tab-bar：仅 home / mine 显示；详情显示联系栏
    $('tabBar').style.display = (view === 'detail') ? 'none' : 'flex';
    $('contactBar').style.display = (view === 'detail') ? 'flex' : 'none';
    // tab-item 高亮
    document.querySelectorAll('.tab-item').forEach(function (t) {
      t.classList.toggle('active', t.dataset.go === view);
    });
    // 滚动回顶
    $('content').scrollTop = 0;

    if (view === 'home') renderHome();
    else if (view === 'detail') renderDetail(param);
    else if (view === 'mine') renderMine();
    else if (view === 'publish') preparePublish();
  }

  /* ---------------- 首页渲染 ---------------- */
  function sortedItems() {
    // 按创建时间倒序
    return state.items.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
  }

  function collectCategories(pool) {
    var set = {};
    (pool || state.items).forEach(function (it) { if (it.category) set[it.category] = 1; });
    return Object.keys(set);
  }

  function renderCategoryChips(pool) {
    var cats = collectCategories(pool);
    var html = '<div class="chip' + (state.filterCategory === 'all' ? ' active' : '') + '" data-cat="all">全部分类</div>';
    cats.forEach(function (c) {
      html += '<div class="chip' + (state.filterCategory === c ? ' active' : '') + '" data-cat="' + Store.escapeHtml(c) + '">' + Store.escapeHtml(c) + '</div>';
    });
    $('categoryChips').innerHTML = html;
  }

  function cardHTML(it, keyword) {
    var typeTag = it.type === 'lost'
      ? '<span class="tag tag-lost">寻物</span>'
      : '<span class="tag tag-found">招领</span>';
    var isDone = it.status === 'done';
    if (isDone) typeTag = '<span class="tag tag-done">已完成</span>';
    var statusText = isDone
      ? '<span class="card-status done">● 已' + (it.type === 'lost' ? '找回' : '归还') + '</span>'
      : '<span class="card-status active">● ' + (it.type === 'lost' ? '寻找中' : '待认领') + '</span>';

    return '<div class="card" data-id="' + it.id + '">' +
      '<div class="card-header">' +
        '<span class="card-title">' + Store.highlight(it.title, keyword) + '</span>' + typeTag +
      '</div>' +
      '<div class="card-meta">📍 ' + Store.escapeHtml(it.location) + ' · ' + Store.escapeHtml(it.time) + '</div>' +
      '<div class="card-desc">' + Store.highlight(it.description || '（暂无描述）', keyword) + '</div>' +
      '<div class="card-footer"><span class="card-time">' + Store.timeAgo(it.createdAt) + '</span>' + statusText + '</div>' +
    '</div>';
  }

  function renderHome() {
    var list = sortedItems();
    // 第一步：按 filterType 同时过滤 type 和 status
    if (state.filterType === 'done') {
      // "已完成" tab：只取 status==='done'
      list = list.filter(function (it) { return it.status === 'done'; });
    } else {
      // 其他 tab：只取 status==='active'，再按 type 细分
      list = list.filter(function (it) { return it.status !== 'done'; });
      if (state.filterType === 'lost') {
        list = list.filter(function (it) { return it.type === 'lost'; });
      } else if (state.filterType === 'found') {
        list = list.filter(function (it) { return it.type === 'found'; });
      }
      // filterType === 'all' 时 active 的全部保留
    }
    // 第二步：渲染分类 chip（基于这一批 list 里的 category）
    renderCategoryChips(list);
    // 第三步：按 category chip 过滤
    if (state.filterCategory !== 'all') {
      list = list.filter(function (it) { return it.category === state.filterCategory; });
    }
    var container = $('homeList');
    if (list.length === 0) {
      var emptyMsg = state.filterType === 'done'
        ? '<div class="empty"><div class="empty-icon">🎉</div>还没有已完成的信息</div>'
        : '<div class="empty"><div class="empty-icon">📭</div>暂无相关信息</div>';
      container.innerHTML = emptyMsg;
      return;
    }
    container.innerHTML = list.map(function (it) { return cardHTML(it, ''); }).join('');
  }

  /* ---------------- 搜索 ---------------- */
  function doSearch() {
    var kw = $('homeSearch').value.trim();
    if (!kw) { toast('请输入搜索关键词'); return; }
    state.keyword = kw;
    var list = Store.searchItems(sortedItems(), kw);
    var container = $('homeList');
    var header = '<div class="search-result-header">找到 ' + list.length + ' 条与“<b>' + Store.escapeHtml(kw) + '</b>”相关的信息</div>';
    if (list.length === 0) {
      container.innerHTML = header + '<div class="empty"><div class="empty-icon">🔍</div>没有找到相关信息，换个关键词试试</div>';
    } else {
      container.innerHTML = header + list.map(function (it) { return cardHTML(it, kw); }).join('');
    }
  }

  /* ---------------- 详情页 ---------------- */
  function openDetail(id) {
    // 浏览量 +1（同一会话内同一条目不重复累加）
    var viewed = [];
    try {
      viewed = JSON.parse(sessionStorage.getItem(VIEWED_KEY) || '[]');
    } catch (e) { viewed = []; }
    if (viewed.indexOf(id) === -1) {
      state.items = Store.incrementViews(state.items, id);
      viewed.push(id);
      try { sessionStorage.setItem(VIEWED_KEY, JSON.stringify(viewed)); } catch (e) {}
      persist();
    }
    go('detail', id);
  }

  function renderDetail(id) {
    state.detailId = id;
    var it = state.items.filter(function (x) { return x.id === id; })[0];
    if (!it) { $('detailBody').innerHTML = '<div class="empty">信息不存在或已删除</div>'; return; }

    var typeTag = it.type === 'lost' ? '<span class="tag tag-lost">寻物</span>' : '<span class="tag tag-found">招领</span>';
    if (it.status === 'done') typeTag = '<span class="tag tag-done">已完成</span>';
    var typeLabel = it.type === 'lost' ? '丢失' : '拾获';
    var statusText = it.status === 'done'
      ? ('● 已' + (it.type === 'lost' ? '找回' : '归还'))
      : ('● ' + (it.type === 'lost' ? '寻找中' : '待认领'));
    var statusColor = it.status === 'done' ? '#999' : 'var(--lost)';

    $('detailBody').innerHTML =
      '<div class="detail-header">' +
        '<div class="detail-tags">' + typeTag + '<span class="tag tag-cat">' + Store.escapeHtml(it.category) + '</span></div>' +
        '<div class="detail-title">' + Store.escapeHtml(it.title) + '</div>' +
        '<div class="detail-sub">发布于 ' + Store.timeAgo(it.createdAt) + ' · 浏览 ' + it.views + ' 次</div>' +
      '</div>' +
      '<div class="detail-info">' +
        '<div class="detail-info-row"><span class="detail-info-label">' + typeLabel + '地点</span><span class="detail-info-value">' + Store.escapeHtml(it.location) + '</span></div>' +
        '<div class="detail-info-row"><span class="detail-info-label">' + typeLabel + '时间</span><span class="detail-info-value">' + Store.escapeHtml(it.time) + '</span></div>' +
        '<div class="detail-info-row"><span class="detail-info-label">当前状态</span><span class="detail-info-value" style="color:' + statusColor + ';">' + statusText + '</span></div>' +
      '</div>' +
      '<div class="detail-desc">' + (it.description ? Store.escapeHtml(it.description) : '（暂无详细描述）') + '</div>' +
      '<div class="detail-info">' +
        '<div class="detail-info-row"><span class="detail-info-label">发布者</span><span class="detail-info-value">' + Store.escapeHtml(it.author || '匿名同学') + '</span></div>' +
      '</div>';

    // 底部联系栏
    if (it.status === 'done') {
      $('contactInfo').innerHTML = '<b style="color:#999;">该信息已' + (it.type === 'lost' ? '找回' : '归还') + '，无需联系</b>';
      $('copyContact').style.display = 'none';
      $('contactBtn').style.display = 'none';
    } else {
      $('contactInfo').innerHTML = '联系方式：<b>' + Store.escapeHtml(it.contactType) + ' ' + Store.escapeHtml(it.contact) + '</b>';
      $('copyContact').style.display = 'inline-block';
      $('contactBtn').style.display = 'inline-block';
    }
  }

  /* ---------------- 发布 ---------------- */
  function preparePublish() {
    // 时间默认当前
    var d = new Date();
    var v = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (!$('f-time').value) $('f-time').value = v;
    $('formError').style.display = 'none';
  }

  var publishType = 'lost';

  function submitPublish() {
    var rawTime = $('f-time').value; // "2026-10-04T14:30"
    var timeText = rawTime ? rawTime.replace('T', ' ') : '';
    var data = {
      type: publishType,
      title: $('f-title').value,
      location: $('f-location').value,
      time: timeText,
      category: $('f-category').value,
      description: $('f-desc').value,
      contact: $('f-contact').value,
      contactType: $('f-contactType').value
    };
    var errors = Store.validateItem(data);
    if (errors.length > 0) {
      var el = $('formError');
      el.textContent = '⚠ ' + errors.join('；');
      el.style.display = 'block';
      return;
    }
    var item = Store.createItem(data);
    state.items.unshift(item);
    persist();
    toast('发布成功！');
    // 清空表单
    $('f-title').value = '';
    $('f-location').value = '';
    $('f-desc').value = '';
    $('f-contact').value = '';
    $('f-time').value = '';
    go('home');
  }

  /* ---------------- 我的发布 ---------------- */
  // 因无登录，所有本地发布均视为“我的”。已标记完成的归为已完成。
  function renderMine() {
    var list = sortedItems();
    var activeCount = list.filter(function (i) { return i.status === 'active'; }).length;
    var doneCount = list.filter(function (i) { return i.status === 'done'; }).length;
    $('myStats').innerHTML =
      '<span>📌 共 ' + list.length + ' 条</span>' +
      '<span>🔍 进行中 ' + activeCount + '</span>' +
      '<span>✅ 已完成 ' + doneCount + '</span>';

    if (list.length === 0) {
      $('mineList').innerHTML = '<div class="empty"><div class="empty-icon">📝</div>还没有发布过信息</div>';
      return;
    }
    $('mineList').innerHTML = list.map(function (it) {
      var typeTag = it.type === 'lost' ? '<span class="tag tag-lost">寻物</span>' : '<span class="tag tag-found">招领</span>';
      var isDone = it.status === 'done';
      if (isDone) typeTag = '<span class="tag tag-done">已完成</span>';
      var actions = isDone
        ? '<button class="status-btn" data-act="reopen" data-id="' + it.id + '">重新打开</button>' +
          '<button class="status-btn danger" data-act="del" data-id="' + it.id + '">删除</button>'
        : '<button class="status-btn done" data-act="done" data-id="' + it.id + '">标记已' + (it.type === 'lost' ? '找回' : '归还') + '</button>' +
          '<button class="status-btn danger" data-act="del" data-id="' + it.id + '">删除</button>';
      var statusText = isDone ? ('已' + (it.type === 'lost' ? '找回' : '归还')) : (it.type === 'lost' ? '寻找中' : '待认领');
      return '<div class="card" data-id="' + it.id + '">' +
        '<div class="card-header"><span class="card-title">' + Store.escapeHtml(it.title) + '</span>' + typeTag + '</div>' +
        '<div class="card-meta">📍 ' + Store.escapeHtml(it.location) + ' · ' + Store.timeAgo(it.createdAt) + '</div>' +
        '<div class="card-footer"><span class="card-status ' + (isDone ? 'done' : 'active') + '">● ' + statusText + '</span>' +
        '<div class="status-actions">' + actions + '</div></div></div>';
    }).join('');
  }

  function handleMineAction(act, id) {
    if (act === 'done') {
      state.items = Store.markDone(state.items, id);
      toast('已标记为完成');
    } else if (act === 'reopen') {
      state.items = Store.reopenItem(state.items, id);
      toast('已重新打开');
    } else if (act === 'del') {
      if (!confirm('确定删除这条信息吗？')) return;
      state.items = Store.removeItem(state.items, id);
      toast('已删除');
    }
    persist();
    renderMine();
  }

  /* ---------------- 复制联系方式（附加功能） ---------------- */
  function copyContact() {
    var it = state.items.filter(function (x) { return x.id === state.detailId; })[0];
    if (!it) return;
    var text = it.contactType + '：' + it.contact;
    var done = function () { toast('联系方式已复制：' + it.contact); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { toast('复制失败，请手动长按选择'); }
    document.body.removeChild(ta);
  }

  /* ---------------- Toast ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindEvents() {
    // 小工具：给横向 overflow 容器加上 PC 端鼠标拖拽滚动
    function enableDragScroll(el) {
      if (!el) return;
      var isDown = false, startX = 0, scrollLeft = 0, moved = false;
      el.addEventListener('mousedown', function (e) {
        isDown = true; moved = false;
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        el.style.cursor = 'grabbing';
      });
      el.addEventListener('mouseleave', function () {
        if (!moved) el.style.cursor = '';
        isDown = false;
      });
      el.addEventListener('mouseup', function () {
        if (!moved) el.style.cursor = '';
        isDown = false;
      });
      el.addEventListener('mousemove', function (e) {
        if (!isDown) return;
        e.preventDefault();
        moved = true;
        var x = e.pageX - el.offsetLeft;
        var walk = (x - startX) * 1.5;
        el.scrollLeft = scrollLeft - walk;
      });
      // 防止拖拽后触发 chip 的 click
      el.addEventListener('click', function (e) {
        if (moved) { e.stopPropagation(); e.preventDefault(); }
      }, true);
    }
    enableDragScroll($('typeTabs'));
    enableDragScroll($('categoryChips'));

    // 底部导航
    document.querySelectorAll('.tab-item').forEach(function (t) {
      t.addEventListener('click', function () { go(t.dataset.go); });
    });
    // 返回
    $('navBack').addEventListener('click', function () {
      if (state.view === 'detail' || state.view === 'publish') go('home');
    });
    // 搜索
    $('homeSearchDo').addEventListener('click', doSearch);
    $('homeSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
    // 类型 tab（切 tab 时重置分类筛选，避免残留）
    document.querySelectorAll('#typeTabs .tab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('#typeTabs .tab').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        state.filterType = t.dataset.type;
        state.filterCategory = 'all';  // 切 tab 后重置分类 chip
        renderHome();
      });
    });
    // 分类筛选 chip（事件委托）
    $('categoryChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      state.filterCategory = chip.dataset.cat;
      renderHome();
    });
    // 列表点击进详情（委托）
    $('homeList').addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (card) openDetail(card.dataset.id);
    });
    // 发布类型选择
    document.querySelectorAll('#typeSelector .type-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#typeSelector .type-btn').forEach(function (x) { x.classList.remove('selected'); });
        b.classList.add('selected');
        publishType = b.dataset.type;
      });
    });
    // 提交
    $('submitBtn').addEventListener('click', submitPublish);
    // 我的列表操作（委托）
    $('mineList').addEventListener('click', function (e) {
      var btn = e.target.closest('.status-btn');
      if (btn) { handleMineAction(btn.dataset.act, btn.dataset.id); return; }
      var card = e.target.closest('.card');
      if (card) openDetail(card.dataset.id);
    });
    // 清空数据
    $('resetData').addEventListener('click', function () {
      if (!confirm('确定清空所有本地数据并恢复示例吗？')) return;
      Store.clearItems();
      state.items = SEED.slice();
      persist();
      toast('已恢复示例数据');
      renderMine();
      if (state.view === 'home') renderHome();
    });
    // 联系/复制
    $('contactBtn').addEventListener('click', function () {
      var it = state.items.filter(function (x) { return x.id === state.detailId; })[0];
      if (it) toast('请通过 ' + it.contactType + ' ' + it.contact + ' 联系发布者');
    });
    $('copyContact').addEventListener('click', copyContact);
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
