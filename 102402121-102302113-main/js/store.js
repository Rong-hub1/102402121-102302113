/**
 * store.js —— 校园失物招领 数据层
 * 纯函数为主，不依赖 DOM，可被单元测试直接调用。
 * 暴露全局对象 window.LostFoundStore
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'lost_found_items_v1';
  // 自增计数器，确保同一次运行内生成的 id 永不碰撞
  var ID_COUNTER = 0;

  /* ============================================================
   * 1. 数据校验  validateItem
   *    输入：表单数据对象
   *    输出：错误信息数组（空数组表示校验通过）
   * ============================================================ */
  function validateItem(data) {
    var errors = [];
    if (!data || typeof data !== 'object') {
      return ['数据格式非法'];
    }
    // type 必须是 lost / found
    if (data.type !== 'lost' && data.type !== 'found') {
      errors.push('类型必须为“寻物”或“招领”');
    }
    // 物品名称必填且非空
    if (!data.title || !String(data.title).trim()) {
      errors.push('物品名称不能为空');
    }
    // 地点必填
    if (!data.location || !String(data.location).trim()) {
      errors.push('地点不能为空');
    }
    // 时间必填且格式合理（兼容 "YYYY-MM-DD HH:mm" 和 "YYYY-MM-DDTHH:mm"）
    // 同时不允许填写未来时间
    if (!data.time || !String(data.time).trim()) {
      errors.push('时间不能为空');
    } else {
      var timeStr = String(data.time).trim();
      var timeRe = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/;
      if (!timeRe.test(timeStr)) {
        errors.push('时间格式不正确');
      } else {
        // 格式通过，再检查是否是未来时间
        var ts = new Date(timeStr.replace(' ', 'T')).getTime();
        if (!isNaN(ts) && ts > Date.now() + 60000) {
          // 宽容 1 分钟误差（用户在整点附近提交）
          errors.push('时间非法，请不要填写未来时间');
        }
      }
    }
    // 联系方式必填
    if (!data.contact || !String(data.contact).trim()) {
      errors.push('联系方式不能为空');
    }
    return errors;
  }

  /* ============================================================
   * 2. 创建条目  createItem
   *    校验通过后生成完整 item 对象（含 id、时间戳、默认状态）
   * ============================================================ */
  function createItem(data) {
    var errors = validateItem(data);
    if (errors.length > 0) {
      throw new Error(errors.join('；'));
    }
    return {
      id: 'item_' + (++ID_COUNTER) + '_' + Date.now(),
      type: data.type,
      title: String(data.title).trim(),
      category: data.category ? String(data.category).trim() : '其他',
      location: String(data.location).trim(),
      time: String(data.time).trim(),
      description: data.description ? String(data.description).trim() : '',
      contact: String(data.contact).trim(),
      contactType: data.contactType ? String(data.contactType).trim() : '微信',
      // author：发布者名称。默认 '匿名同学'；未来做登录后可改成 data.author
      author: data.author ? String(data.author).trim() : '匿名同学',
      status: 'active',
      createdAt: Date.now(),
      views: 0
    };
  }

  /* ============================================================
   * 3. 关键词搜索  searchItems
   *    在 title / description / location / category 中匹配（不区分大小写）
   *    空关键词返回全部
   * ============================================================ */
  function searchItems(items, keyword) {
    if (!Array.isArray(items)) return [];
    var kw = (keyword || '').trim().toLowerCase();
    if (kw === '') return items.slice();
    return items.filter(function (it) {
      var haystack = [
        it.title,
        it.description,
        it.location,
        it.category,
        it.time,
        it.author || '',
        (it.type === 'lost' ? '寻物 lost' : '招领 found')
      ].join(' ')
        .toLowerCase();
      return haystack.indexOf(kw) !== -1;
    });
  }

  /* ============================================================
   * 4. 按类型筛选  filterByType
   *    type: 'all' | 'lost' | 'found'
   * ============================================================ */
  function filterByType(items, type) {
    if (!Array.isArray(items)) return [];
    if (type === 'all' || !type) return items.slice();
    return items.filter(function (it) { return it.type === type; });
  }

  /* ============================================================
   * 5. 关键词高亮  highlight
   *    把文本中命中关键词的部分用 <em class="hl"> 包裹
   *    先转义 HTML，防 XSS；关键词为空则原样返回转义文本
   * ============================================================ */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlight(text, keyword) {
    var safe = escapeHtml(text == null ? '' : text);
    var kw = (keyword || '').trim();
    if (kw === '') return safe;
    // 转义正则特殊字符
    var escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp(escaped, 'gi');
    return safe.replace(re, function (m) {
      return '<em class="hl">' + m + '</em>';
    });
  }

  /* ============================================================
   * 6. 相对时间  timeAgo
   *    输入时间戳，输出“刚刚 / x分钟前 / x小时前 / x天前 / 日期”
   * ============================================================ */
  function timeAgo(ts, now) {
    if (!ts) return '';
    now = now || Date.now();
    var diff = Math.floor((now - ts) / 1000); // 秒
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
    var d = new Date(ts);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ============================================================
   * 7. 标记状态  markDone / reopen
   *    不修改原数组，返回新数组（不可变）
   * ============================================================ */
  function markDone(items, id) {
    if (!Array.isArray(items)) return [];
    return items.map(function (it) {
      return it.id === id ? Object.assign({}, it, { status: 'done' }) : it;
    });
  }

  function reopenItem(items, id) {
    if (!Array.isArray(items)) return [];
    return items.map(function (it) {
      return it.id === id ? Object.assign({}, it, { status: 'active' }) : it;
    });
  }

  /* ============================================================
   * 8. 删除条目  removeItem
   * ============================================================ */
  function removeItem(items, id) {
    if (!Array.isArray(items)) return [];
    return items.filter(function (it) { return it.id !== id; });
  }

  /* ============================================================
   * 9. 增加浏览量  incrementViews（返回新对象）
   * ============================================================ */
  function incrementViews(items, id) {
    if (!Array.isArray(items)) return [];
    return items.map(function (it) {
      return it.id === id ? Object.assign({}, it, { views: (it.views || 0) + 1 }) : it;
    });
  }

  /* ============================================================
   * 10. localStorage 持久化
   * ============================================================ */
  function loadItems() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch (e) {
      return null;
    }
  }

  function saveItems(items) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearItems() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 导出
  global.LostFoundStore = {
    validateItem: validateItem,
    createItem: createItem,
    searchItems: searchItems,
    filterByType: filterByType,
    highlight: highlight,
    escapeHtml: escapeHtml,
    timeAgo: timeAgo,
    markDone: markDone,
    reopenItem: reopenItem,
    removeItem: removeItem,
    incrementViews: incrementViews,
    loadItems: loadItems,
    saveItems: saveItems,
    clearItems: clearItems
  };
})(typeof window !== 'undefined' ? window : this);
