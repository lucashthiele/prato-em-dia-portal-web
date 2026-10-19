/* @ds-bundle: {"format":4,"namespace":"PratoPortal","components":[{"name":"Button"},{"name":"StatusChip"},{"name":"TextField"},{"name":"Tabs"},{"name":"SideNav"},{"name":"PatientHeader"},{"name":"MetricTile"},{"name":"MealTable"},{"name":"VersionHistory"},{"name":"PolicyPicker"},{"name":"WeekSummary"},{"name":"Alert"},{"name":"EmptyState"},{"name":"ConfirmDialog"},{"name":"SaveStatus"},{"name":"Icon"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 15.3c1.9.6 3.1 2.2 3.5 4.7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    swap: '<path d="M4 8h14l-3.5-3.5"/><path d="M20 16H6l3.5 3.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    alert: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4.5h4.5"/><path d="M12 8v4.5l3 2"/>',
    logout: '<path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    minus: '<path d="M5 12h14"/>'
  };

  function Icon(p) {
    var size = p.size || 20;
    return h('svg', {
      className: cx('pd-icon', p.className), width: size, height: size, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': p.label ? undefined : true, 'aria-label': p.label, role: p.label ? 'img' : undefined,
      dangerouslySetInnerHTML: { __html: ICONS[p.name] || '' }
    });
  }

  function Button(p) {
    var variant = p.variant || 'primary', size = p.size || 'md';
    var rest = Object.assign({}, p);
    ['variant', 'size', 'icon', 'loading', 'children', 'className'].forEach(function (k) { delete rest[k]; });
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('pd-btn', 'pd-btn--' + variant, 'pd-btn--' + size, p.loading && 'is-loading', p.className),
      disabled: p.disabled || p.loading, 'aria-busy': p.loading || undefined
    }),
      p.loading ? h('span', { className: 'pd-spinner', 'aria-hidden': true }) : (p.icon ? h(Icon, { name: p.icon, size: 18 }) : null),
      h('span', null, p.children));
  }

  var STATUS = {
    done: ['Realizada', 'check', 'success'],
    skipped: ['Não realizada', 'x', 'danger'],
    substituted: ['Alterada', 'swap', 'warm', 'Realizada com substituição'],
    none: ['Sem registro', 'minus', 'neutral'],
    draft: ['Rascunho', 'file', 'warm'],
    published: ['Publicada', 'check', 'success'],
    archived: ['Arquivada', 'history', 'neutral'],
    active: ['Vínculo ativo', 'check', 'success'],
    ended: ['Vínculo encerrado', 'x', 'neutral'],
    pending: ['Envio pendente', 'clock', 'neutral'],
    sent: ['Acesso enviado', 'mail', 'success'],
    failed: ['Falha no envio', 'alert', 'danger']
  };

  function StatusChip(p) {
    var s = STATUS[p.status] || STATUS.none;
    return h('span', { className: cx('pd-chip', 'pd-chip--' + s[2], p.className), title: p.label ? undefined : s[3] },
      h(Icon, { name: s[1], size: 14 }), h('span', null, p.label || s[0]));
  }

  var fieldSeq = 0;
  function TextField(p) {
    var idRef = React.useRef(null);
    if (!idRef.current) idRef.current = p.id || 'pd-field-' + (++fieldSeq);
    var id = idRef.current, hintId = id + '-hint';
    var rest = Object.assign({}, p);
    ['label', 'hint', 'error', 'icon', 'className', 'id', 'multiline'].forEach(function (k) { delete rest[k]; });
    var Tag = p.multiline ? 'textarea' : 'input';
    return h('div', { className: cx('pd-field', p.error && 'is-error', p.className) },
      h('label', { className: 'pd-field__label', htmlFor: id }, p.label),
      h('div', { className: 'pd-field__control' },
        p.icon ? h(Icon, { name: p.icon, size: 18, className: 'pd-field__icon' }) : null,
        h(Tag, Object.assign({ id: id, className: cx('pd-field__input', p.icon && 'has-icon'), 'aria-invalid': p.error ? true : undefined, 'aria-describedby': (p.error || p.hint) ? hintId : undefined }, rest))),
      p.error ? h('p', { id: hintId, className: 'pd-field__hint pd-field__hint--error' }, h(Icon, { name: 'alert', size: 14 }), p.error)
        : p.hint ? h('p', { id: hintId, className: 'pd-field__hint' }, p.hint) : null);
  }

  function Tabs(p) {
    return h('div', { className: 'pd-tabs', role: 'tablist', 'aria-label': p.label },
      p.items.map(function (it) {
        var sel = it.id === p.value;
        return h('button', { key: it.id, type: 'button', role: 'tab', 'aria-selected': sel, className: cx('pd-tab', sel && 'is-selected'), onClick: function () { p.onChange && p.onChange(it.id); } },
          it.label, it.count != null ? h('span', { className: 'pd-tab__count' }, it.count) : null);
      }));
  }

  function SideNav(p) {
    return h('nav', { className: 'pd-sidenav', 'aria-label': 'Principal' },
      h('div', { className: 'pd-brand' },
        p.logoSrc ? h('img', { className: 'pd-brand__mark', src: p.logoSrc, alt: '' }) : null,
        h('div', null, h('div', { className: 'pd-brand__name' }, 'Prato em Dia'), h('div', { className: 'pd-brand__sub' }, 'Portal Pro Nutri'))),
      h('ul', { className: 'pd-sidenav__list' },
        p.items.map(function (it) {
          var sel = it.id === p.value;
          return h('li', { key: it.id },
            h('a', { href: it.href || '#', className: cx('pd-navitem', sel && 'is-selected'), 'aria-current': sel ? 'page' : undefined, onClick: function (e) { if (p.onChange) { e.preventDefault(); p.onChange(it.id); } } },
              h(Icon, { name: it.icon }), h('span', null, it.label)));
        })),
      p.user ? h('div', { className: 'pd-sidenav__user' },
        h('span', { className: 'pd-avatar', 'aria-hidden': true }, p.user.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('')),
        h('div', { className: 'pd-sidenav__who' }, h('div', { className: 'pd-sidenav__uname' }, p.user.name), p.user.registry ? h('div', { className: 'pd-sidenav__reg' }, p.user.registry) : null),
        h('button', { type: 'button', className: 'pd-iconbtn', 'aria-label': 'Sair', onClick: p.onLogout }, h(Icon, { name: 'logout', size: 18 }))) : null);
  }

  function PatientHeader(p) {
    return h('header', { className: 'pd-phead' },
      h('div', { className: 'pd-phead__id' },
        h('h1', { className: 'pd-phead__name' }, p.name),
        h('div', { className: 'pd-phead__meta' },
          h('span', null, p.email), h(StatusChip, { status: p.linkStatus || 'active' }),
          p.accessStatus ? h(StatusChip, { status: p.accessStatus }) : null),
        p.description ? h('p', { className: 'pd-phead__desc' }, p.description) : null),
      p.actions ? h('div', { className: 'pd-phead__actions' }, p.actions) : null);
  }

  function MetricTile(p) {
    return h('div', { className: 'pd-metric' },
      h('div', { className: 'pd-metric__label' }, p.label),
      h('div', { className: 'pd-metric__value' }, p.value, p.unit ? h('span', { className: 'pd-metric__unit' }, ' ' + p.unit) : null),
      p.hint ? h('div', { className: 'pd-metric__hint' }, p.hint) : null);
  }

  function MealTable(p) {
    var showStatus = p.rows.some(function (r) { return r.status; });
    return h('div', { className: 'pd-tablewrap' },
      h('table', { className: 'pd-table' },
        p.caption ? h('caption', { className: 'pd-sr' }, p.caption) : null,
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, 'Horário'), h('th', { scope: 'col' }, 'Refeição'),
          h('th', { scope: 'col', className: 'is-num' }, 'kcal'), showStatus ? h('th', { scope: 'col' }, 'Status') : null)),
        h('tbody', null, p.rows.map(function (r, i) {
          return h('tr', { key: i },
            h('td', { className: 'is-num pd-muted' }, r.time),
            h('td', null, h('div', { className: 'pd-table__meal' }, r.meal), r.items ? h('div', { className: 'pd-table__items' }, r.items) : null),
            h('td', { className: 'is-num' }, r.kcal),
            showStatus ? h('td', null, r.status ? h(StatusChip, { status: r.status }) : null) : null);
        }))));
  }

  function VersionHistory(p) {
    return h('ol', { className: 'pd-versions' }, p.versions.map(function (v) {
      return h('li', { key: v.number, className: cx('pd-version', v.current && 'is-current') },
        h('span', { className: 'pd-version__num' }, 'v' + v.number),
        h('div', { className: 'pd-version__body' },
          h('div', { className: 'pd-version__title' }, v.summary),
          h('div', { className: 'pd-version__meta' }, v.date + (v.author ? ' · ' + v.author : ''))),
        h(StatusChip, { status: v.status }));
    }));
  }

  var POLICIES = [
    { id: 'RESTRICTED', title: 'Seguir o plano', body: 'O paciente registra exatamente o que foi prescrito. Recomendado para começar.' },
    { id: 'SUBSTITUTIONS_ONLY', title: 'Permitir substituições', body: 'O paciente pode trocar um alimento apenas pelas opções que você autorizar em cada item.' },
    { id: 'FREE', title: 'Montagem livre', body: 'O paciente monta as refeições da semana a partir da prescrição, adicionando ou removendo itens.' }
  ];
  function PolicyPicker(p) {
    var name = p.name || 'policy';
    return h('fieldset', { className: 'pd-policy' },
      h('legend', { className: 'pd-policy__legend' }, p.legend || 'Como o paciente pode planejar a semana'),
      POLICIES.map(function (o) {
        var sel = o.id === p.value;
        return h('label', { key: o.id, className: cx('pd-policy__opt', sel && 'is-selected') },
          h('input', { type: 'radio', name: name, value: o.id, checked: sel, onChange: function () { p.onChange && p.onChange(o.id); } }),
          h('span', { className: 'pd-policy__dot', 'aria-hidden': true }),
          h('span', null, h('span', { className: 'pd-policy__title' }, o.title, o.id === 'RESTRICTED' ? h('span', { className: 'pd-policy__tag' }, 'Sugerido') : null),
            h('span', { className: 'pd-policy__body' }, o.body)));
      }));
  }

  function WeekSummary(p) {
    var c = p.counts;
    var cells = [['done', c.done], ['substituted', c.substituted], ['skipped', c.skipped], ['none', c.none]];
    return h('section', { className: 'pd-week' },
      h('div', { className: 'pd-week__head' },
        h('div', null, h('div', { className: 'pd-week__title' }, p.title), p.subtitle ? h('div', { className: 'pd-week__sub' }, p.subtitle) : null),
        h('div', { className: 'pd-week__planned' }, h('span', { className: 'pd-week__n' }, c.planned), ' refeições planejadas')),
      h('ul', { className: 'pd-week__grid' }, cells.map(function (x) {
        var s = STATUS[x[0]];
        return h('li', { key: x[0], className: cx('pd-week__cell', 'pd-week__cell--' + s[2]), title: s[3] },
          h('span', { className: 'pd-week__label' }, h(Icon, { name: s[1], size: 16 }), h('span', null, s[0])),
          h('span', { className: 'pd-week__n' }, x[1]));
      })));
  }

  function Alert(p) {
    var tone = p.tone || 'info';
    var icon = { info: 'alert', success: 'check', danger: 'alert', warm: 'swap' }[tone];
    return h('div', { className: cx('pd-alert', 'pd-alert--' + tone), role: tone === 'danger' ? 'alert' : 'status' },
      h(Icon, { name: icon, size: 20 }),
      h('div', { className: 'pd-alert__body' }, p.title ? h('div', { className: 'pd-alert__title' }, p.title) : null, h('div', null, p.children)),
      p.action ? h('div', { className: 'pd-alert__action' }, p.action) : null);
  }

  function EmptyState(p) {
    return h('div', { className: 'pd-empty' },
      h('span', { className: 'pd-empty__icon' }, h(Icon, { name: p.icon || 'file', size: 24 })),
      h('div', { className: 'pd-empty__title' }, p.title),
      p.children ? h('p', { className: 'pd-empty__body' }, p.children) : null,
      p.action || null);
  }

  function ConfirmDialog(p) {
    if (p.open === false) return null;
    var tone = p.tone || 'primary';
    return h('div', { className: cx('pd-scrim', p.inline && 'is-inline') },
      h('div', { className: 'pd-dialog', role: 'alertdialog', 'aria-modal': true, 'aria-labelledby': 'pd-dialog-title' },
        h('h2', { id: 'pd-dialog-title', className: 'pd-dialog__title' }, p.title),
        h('div', { className: 'pd-dialog__body' }, p.children),
        h('div', { className: 'pd-dialog__actions' },
          h(Button, { variant: 'ghost', onClick: p.onCancel }, p.cancelLabel || 'Cancelar'),
          h(Button, { variant: tone === 'danger' ? 'danger' : 'primary', onClick: p.onConfirm, loading: p.loading }, p.confirmLabel))));
  }

  function SaveStatus(p) {
    var st = p.state || 'saved';
    var map = { saving: [null, 'Salvando…'], saved: ['check', 'Rascunho salvo'], error: ['alert', 'Não foi possível salvar'] };
    return h('span', { className: cx('pd-save', 'pd-save--' + st), role: 'status', 'aria-live': 'polite' },
      st === 'saving' ? h('span', { className: 'pd-spinner pd-spinner--sm', 'aria-hidden': true }) : h(Icon, { name: map[st][0], size: 16 }),
      p.label || map[st][1]);
  }

  window.PratoPortal = Object.assign(window.PratoPortal || {}, {
    Icon: Icon, Button: Button, StatusChip: StatusChip, TextField: TextField, Tabs: Tabs, SideNav: SideNav,
    PatientHeader: PatientHeader, MetricTile: MetricTile, MealTable: MealTable, VersionHistory: VersionHistory,
    PolicyPicker: PolicyPicker, WeekSummary: WeekSummary, Alert: Alert, EmptyState: EmptyState,
    ConfirmDialog: ConfirmDialog, SaveStatus: SaveStatus
  });
})();
