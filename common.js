// 看板與請假表單共用的小工具
(function () {
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  // 每種事由一個磁鐵顏色；試算表新增的事由會依序用 EXTRA 的顏色
  const FIXED = {
    '病假': '#8457B8',
    '請假': '#8457B8',
    '事假': '#D98A1E',
    '出差': '#2E6BD3',
    '平鎮工廠': '#1F8467',
  };
  const EXTRA = ['#C7406F', '#3D8FA3', '#8B6A3A', '#5E6E2E', '#B4532A'];

  function reasonColor(reason, reasons) {
    if (FIXED[reason]) return FIXED[reason];
    const custom = (reasons || []).filter(r => !FIXED[r]);
    const i = Math.max(0, custom.indexOf(reason));
    return EXTRA[i % EXTRA.length];
  }

  const pad = n => String(n).padStart(2, '0');
  const ymdOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseYmd = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymdOf(d); };
  const weekday = s => WEEKDAYS[parseYmd(s).getDay()];
  const md = s => Number(s.slice(5, 7)) + '/' + Number(s.slice(8, 10));

  function overlapsDay(l, day) {
    return l.start < addDays(day, 1) + ' 00:00' && l.end > day + ' 00:00';
  }

  // 某筆請假在某一天的時段描述，例如「全天」「13:00 起」「至 12:00」
  function describeOnDay(l, day, hours) {
    const sd = l.start.slice(0, 10), st = l.start.slice(11);
    const ed = l.end.slice(0, 10), et = l.end.slice(11);
    const coversStart = sd < day || st <= hours.start;
    const coversEnd = ed > day || et >= hours.end;
    const until = ed > day ? '，至 ' + md(ed) : '';
    if (coversStart && coversEnd) return '全天' + until;
    if (coversStart) return '至 ' + et;
    if (coversEnd) return st + ' 起' + until;
    return st + '–' + et;
  }

  function rangeText(l, hours) {
    const sd = l.start.slice(0, 10), ed = l.end.slice(0, 10);
    const st = l.start.slice(11), et = l.end.slice(11);
    if (sd === ed) {
      const allDay = st <= hours.start && et >= hours.end;
      return md(sd) + '（' + weekday(sd) + '）' + (allDay ? '全天' : st + '–' + et);
    }
    return md(sd) + '（' + weekday(sd) + '）' + st + ' – ' + md(ed) + '（' + weekday(ed) + '）' + et;
  }

  // 全處活動（不綁人）：某天是否在活動期間、日期文字
  const eventOnDay = (e, day) => e.start <= day && e.end >= day;
  const eventRange = e => e.start === e.end
    ? md(e.start) + '（' + weekday(e.start) + '）'
    : md(e.start) + '（' + weekday(e.start) + '）– ' + md(e.end) + '（' + weekday(e.end) + '）';

  // 名字依英文字母排序（不分大小寫）
  const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ?demo=1 預覽用的資料：工程處 12 人，與 2026 年 11 月 Outlook 上的請假
  const DEMO_PEOPLE = [
    ['Leo', '葉泰宏', 'Leo Yeh'], ['Justin', '石宛明', 'Justin Shih'], ['Allen', '沈祐嘉', 'Allen Shen'],
    ['Andow', '陳韋志', 'Andow Chen'], ['Kenny', '楊濟丞', 'Kenny Yang'], ['Johnson', '陳俊宇', 'Johnson Chen'],
    ['Lucy', '吳羿樺', 'Lucy Wu'], ['James', '李明坤', 'James Lee'], ['Patrick', '林松源', 'Patrick Lin'],
    ['Neo', '林政暐', 'Neo Lin'], ['Frank', '陳詠澂', 'Frank Chen'], ['Mike', '馮祥豪', 'Mike Feng'],
  ].map(([name, zh, en]) => ({ name, zh, en }));

  function demoData() {
    const t = ymdOf(new Date());
    const hours = { start: '08:30', lunchStart: '12:00', lunchEnd: '13:00', end: '17:30' };
    const L = (id, name, start, end, reason) => ({ id, name, start, end, reason });
    return {
      ok: true,
      today: t,
      now: t + ' ' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()),
      hours,
      members: DEMO_PEOPLE.map(p => p.name),
      people: DEMO_PEOPLE.map(p => Object.assign({}, p)),
      reasons: ['事假', '出差', '平鎮工廠', '請假'],
      holidays: [
        { date: '2026-01-01', off: true, name: '開國紀念日' },
        { date: '2026-02-15', off: true, name: '小年夜' },
        { date: '2026-02-16', off: true, name: '農曆除夕' },
        { date: '2026-02-17', off: true, name: '春節' },
        { date: '2026-02-18', off: true, name: '春節' },
        { date: '2026-02-19', off: true, name: '春節' },
        { date: '2026-02-20', off: true, name: '補假' },
        { date: '2026-02-27', off: true, name: '補假' },
        { date: '2026-02-28', off: true, name: '和平紀念日' },
        { date: '2026-04-03', off: true, name: '補假' },
        { date: '2026-04-04', off: true, name: '兒童節' },
        { date: '2026-04-05', off: true, name: '清明節' },
        { date: '2026-04-06', off: true, name: '補假' },
        { date: '2026-05-01', off: true, name: '勞動節' },
        { date: '2026-06-19', off: true, name: '端午節' },
        { date: '2026-09-25', off: true, name: '中秋節' },
        { date: '2026-09-28', off: true, name: '孔子誕辰紀念日/教師節' },
        { date: '2026-10-09', off: true, name: '補假' },
        { date: '2026-10-10', off: true, name: '國慶日' },
        { date: '2026-10-25', off: true, name: '臺灣光復暨金門古寧頭大捷紀念日' },
        { date: '2026-10-26', off: true, name: '補假' },
        { date: '2026-12-25', off: true, name: '行憲紀念日' },
        { date: '2027-01-01', off: true, name: '開國紀念日' },
        { date: '2027-02-04', off: true, name: '小年夜' },
        { date: '2027-02-05', off: true, name: '農曆除夕' },
        { date: '2027-02-06', off: true, name: '春節' },
        { date: '2027-02-07', off: true, name: '春節' },
        { date: '2027-02-08', off: true, name: '春節' },
        { date: '2027-02-09', off: true, name: '補假' },
        { date: '2027-02-10', off: true, name: '補假' },
        { date: '2027-02-28', off: true, name: '和平紀念日' },
        { date: '2027-03-01', off: true, name: '補假' },
        { date: '2027-04-04', off: true, name: '兒童節' },
        { date: '2027-04-05', off: true, name: '清明節' },
        { date: '2027-04-06', off: true, name: '補假' },
        { date: '2027-04-30', off: true, name: '補假' },
        { date: '2027-05-01', off: true, name: '勞動節' },
        { date: '2027-06-09', off: true, name: '端午節' },
        { date: '2027-09-15', off: true, name: '中秋節' },
        { date: '2027-09-28', off: true, name: '孔子誕辰紀念日/教師節' },
        { date: '2027-10-10', off: true, name: '國慶日' },
        { date: '2027-10-11', off: true, name: '補假' },
        { date: '2027-10-25', off: true, name: '臺灣光復暨金門古寧頭大捷紀念日' },
        { date: '2027-12-24', off: true, name: '補假' },
        { date: '2027-12-25', off: true, name: '行憲紀念日' },
        { date: '2027-12-31', off: true, name: '補假' },
      ],
      events: [{ id: 'e1', title: '員工旅遊', start: '2026-11-14', end: '2026-11-18', note: '' }],
      leaves: [
        L('d1', 'Mike', '2026-11-01 08:30', '2026-12-05 17:30', '出差'),
        L('d2', 'Johnson', '2026-11-04 08:30', '2026-11-04 17:30', '事假'),
        L('d3', 'Lucy', '2026-11-05 08:30', '2026-11-05 17:30', '事假'),
        L('d4', 'Kenny', '2026-11-05 16:00', '2026-11-05 17:30', '事假'),
        L('d5', 'Kenny', '2026-11-10 15:00', '2026-11-10 17:30', '事假'),
        L('d6', 'Kenny', '2026-11-13 08:30', '2026-11-13 17:30', '事假'),
      ],
    };
  }

  window.LeaveCommon = {
    WEEKDAYS, reasonColor, pad, ymdOf, parseYmd, addDays, weekday, md,
    overlapsDay, describeOnDay, rangeText, esc, demoData, byName, eventOnDay, eventRange,
  };
})();
