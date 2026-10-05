/**
 * seed.js —— 首次访问时的示例数据（种子）
 * 让页面初次打开就有内容可看、可搜。
 */
(function (global) {
  'use strict';

  var now = Date.now();
  var MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  // 固定示例，时间相对“现在”偏移，保证 timeAgo 展示自然
  var SEED = [
    {
      id: 'seed_1',
      type: 'found',
      title: '黑色长柄雨伞',
      category: '雨具',
      location: '图书馆三楼自习区',
      time: '2026-10-04 14:30',
      description: '在图书馆三楼自习区靠窗座位捡到一把黑色长柄雨伞，伞柄系有蓝色挂绳，望失主联系认领。',
      contact: 'wx_umbrella_2026',
      contactType: '微信',
      status: 'active',
      createdAt: now - 2 * HOUR,
      views: 12
    },
    {
      id: 'seed_2',
      type: 'lost',
      title: '校园卡（张同学）',
      category: '证件卡片',
      location: '第二食堂二楼',
      time: '2026-10-04 12:10',
      description: '中午在第二食堂二楼吃饭时遗失校园卡一张，卡面贴有写着“张同学”的蓝色姓名贴纸，透明卡套。卡里还有余额，急用，望拾到的好心同学联系，必有重谢！',
      contact: 'zhang_2026',
      contactType: '微信',
      status: 'active',
      createdAt: now - 4 * HOUR,
      views: 28
    },
    {
      id: 'seed_3',
      type: 'found',
      title: 'AirPods Pro 耳机',
      category: '电子产品',
      location: '教学楼 A301',
      time: '2026-10-03 18:00',
      description: 'A301 教室后排捡到白色耳机盒一副，内有耳机。请失主描述耳机盒内的小特征后联系认领，以防冒领。',
      contact: '13800001234',
      contactType: '手机',
      status: 'active',
      createdAt: now - 20 * HOUR,
      views: 35
    },
    {
      id: 'seed_4',
      type: 'lost',
      title: '蓝色象印保温杯',
      category: '生活用品',
      location: '运动场',
      time: '2026-10-03 09:00',
      description: '在运动场跑步时遗失蓝色象印保温杯一个，杯底有轻微划痕，对我很重要，求好心人联系。',
      contact: 'bottle_owner',
      contactType: '微信',
      status: 'active',
      createdAt: now - 1 * DAY - 5 * HOUR,
      views: 19
    },
    {
      id: 'seed_5',
      type: 'found',
      title: '一串钥匙（3 把）',
      category: '钥匙',
      location: '宿舍 3 号楼楼道',
      time: '2026-10-02 21:00',
      description: '3 号楼楼道捡到一串钥匙，共 3 把，含一把银色小挂饰，已交至宿管阿姨处，可前往认领。',
      contact: 'suguan_3',
      contactType: '微信',
      status: 'active',
      createdAt: now - 2 * DAY - 2 * HOUR,
      views: 8
    },
    {
      id: 'seed_6',
      type: 'lost',
      title: '校园卡（李明）',
      category: '证件卡片',
      location: '宿舍 5 号楼',
      time: '2026-10-01 19:00',
      description: '遗失的校园卡已通过本平台找回，感谢热心同学！特此告知，请勿再联系。',
      contact: 'liming_2026',
      contactType: '微信',
      status: 'done',
      createdAt: now - 3 * DAY,
      views: 42
    }
  ];

  global.LostFoundSeed = SEED;
})(typeof window !== 'undefined' ? window : this);
