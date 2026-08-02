/* ============================================================================
   문구 → 화면 변환기
   ----------------------------------------------------------------------------
   index.html 과 admin.html 이 이 파일을 함께 씁니다.
   덕분에 admin.html 의 미리보기가 실제 사이트와 항상 똑같이 보입니다.
   (이 파일은 고치실 일이 없습니다. 문구는 content.js 에 있습니다.)
   ============================================================================ */

(function (global) {
  'use strict';

  /* 사용자가 적은 글은 무조건 HTML로 해석되지 않게 막습니다. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── 글자 꾸미기 ─────────────────────────────────────────────
     admin 의 글이든 업무사례 폴더의 txt 든 똑같이 적용됩니다.
       **굵게**             → 굵게
       {크게|글자}           → 크기   (작게 · 크게 · 아주크게)
       /크게 (줄 맨 앞)      → 그 줄 전체가 크게   (/작게 /아주크게 도 같음)
       빈 줄                → 화면에도 빈 줄 그대로
     겹쳐 쓸 수도 있습니다 —  {크게|**중요**}

     크기는 배수(em)로 두었습니다. 휴대폰·PC 어디서나 본문에 대한 비율이
     같게 유지되고, 나중에 본문 크기를 손대도 함께 따라갑니다.
     ------------------------------------------------------------ */
  var RICH_SIZE = {
    '작게':     '0.86em',
    '크게':     '1.18em',
    '아주크게': '1.4em'
  };
  var RICH_RE = /\{(작게|크게|아주크게)\|([^{}]*)\}/g;
  var LINE_RE = /^\/(작게|크게|아주크게)\s+(.+)$/;

  /* **굵게** 와 {크게|…} — 이미 esc 를 거친 글에만 씁니다 */
  function applyInline(out) {
    out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    /* 안쪽 괄호부터 차례로 풀어 나갑니다. 겹쳐 쓴 것도 이 반복으로 처리됩니다.
       (아는 이름이 아니면 그대로 글자로 남습니다) */
    for (var i = 0; i < 6; i++) {
      var next = out.replace(RICH_RE, function (m, name, inner) {
        return '<span style="font-size:' + RICH_SIZE[name] + '">' + inner + '</span>';
      });
      if (next === out) break;
      out = next;
    }
    return out;
  }

  /* 한 줄짜리 글(말풍선·선택지·버튼 이름) */
  function rich(s) {
    return applyInline(esc(s));
  }

  /* 여러 줄짜리 글(문단·안내글·사례 본문).
     브라우저는 원래 줄바꿈을 띄어쓰기 한 칸으로 뭉개 버립니다.
     여기서 줄바꿈을 화면용 줄바꿈(<br>)으로 바꿔 주기 때문에,
     엔터와 빈 줄이 적은 그대로 화면에 나타납니다. */
  function richText(s) {
    var lines = String(s == null ? '' : s).replace(/\r\n?/g, '\n').split('\n')
      .map(function (line) {
        var m = line.match(LINE_RE);
        if (m) return '<span style="font-size:' + RICH_SIZE[m[1]] + '">' + esc(m[2]) + '</span>';
        return esc(line);
      });
    return applyInline(lines.join('\n')).replace(/\n/g, '<br>');
  }

  /* @disclaimer 같은 자리 표시자를 실제 문구로 바꿉니다. */
  function expand(text, C) {
    if (text === '@disclaimer') return C.disclaimer || '';
    return text;
  }

  /* 버튼 한 개
     'cases' 는 바깥 링크가 아니라 이 사이트 안의 '업무 사례' 화면을 엽니다.
     (index.html 이 data-goto 표시를 보고 화면을 전환합니다) */
  function ctaHTML(key, C) {
    var L = C.links || {}, B = C.buttons || {};
    var map = {
      form:    { cls: 'form',    href: L.form,    label: B.form || '상담 예약' },
      cases:   { cls: 'cases',   href: '#cases',  label: B.cases || '업무 사례',
                 attr: ' data-goto="cases"' }
    };
    var m = map[key];
    if (!m || !m.href) return '';
    return '<a class="cta ' + m.cls + '" href="' + esc(m.href) + '"' + (m.attr || '') + '>' +
           esc(m.label) + '</a>';
  }

  /* 블록 하나 */
  function blockHTML(b, C) {
    if (!b || !b.type) return '';
    switch (b.type) {
      case 'h4':
        return '<h4>' + esc(expand(b.text, C)) + '</h4>';
      case 'p':
        return '<p>' + richText(expand(b.text, C)) + '</p>';
      case 'note':
        return '<p class="note">' + richText(expand(b.text, C)) + '</p>';
      case 'ul':
        return '<ul>' + (b.items || []).map(function (i) {
          return '<li>' + richText(expand(i, C)) + '</li>';
        }).join('') + '</ul>';
      case 'tags':
        return '<p class="tagrow">' + (b.items || []).map(function (i) {
          return '<span class="tag">' + esc(i) + '</span>';
        }).join('') + '</p>';
      case 'image':
        if (!b.src) return '';
        return '<div class="panel-profile-wrap"><img class="panel-profile" src="' + esc(b.src) +
               '" alt="' + esc(b.alt || '') + '" loading="lazy" decoding="async"></div>';
      case 'cta':
        var inner = (b.items || []).map(function (k) { return ctaHTML(k, C); }).join('');
        if (!inner) return '';
        var solo = (b.items || []).length === 1 ? ' solo' : '';
        return '<div class="cta-row' + solo + '">' + inner + '</div>';
      default:
        return '';
    }
  }

  /* 패널 전체 */
  function panelHTML(node, C) {
    if (!node) return '';
    var out = '';
    if (node.title) out += '<h3>' + esc(node.title) + '</h3>';
    out += (node.blocks || []).map(function (b) { return blockHTML(b, C); }).join('');
    return out;
  }

  global.SiteRender = {
    esc: esc,
    rich: rich,
    richText: richText,
    /* 편집기(admin.html)의 꾸미기 단추가 이 목록을 그대로 씁니다 */
    richSizes: RICH_SIZE,
    ctaHTML: ctaHTML,
    blockHTML: blockHTML,
    panelHTML: panelHTML
  };

})(window);
