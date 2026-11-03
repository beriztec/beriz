/* ================= BERIZ V16 — UX, MOVIMENTO E CONVERSÃO =================
   Carregado depois de main.js. Não substitui nada do main.js: adiciona
   abas de áreas, exemplos interativos com "Hoje / Com a Beriz",
   cascata de entrada, marca-texto nas palavras-chave, frase rotativa de dor,
   cartões de sinais de alerta, simulador de vendas, diagnóstico,
   barra de ação no celular e pré-preenchimento do formulário. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (root, sel) => root.querySelector(sel);
  const $$ = (root, sel) => [...root.querySelectorAll(sel)];
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const pressed = el => el.getAttribute('aria-pressed') === 'true';
  const checked = el => el.getAttribute('aria-checked') === 'true';
  const setPressed = (el, on) => el.setAttribute('aria-pressed', String(on));
  const setChecked = (el, on) => el.setAttribute('aria-checked', String(on));
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const int = n => Math.round(n).toLocaleString('pt-BR');

  /* Anima um número de onde está até o alvo (easeOutCubic). */
  function countTo(el, to, format, ms = 700) {
    const from = Number(el.dataset.value ?? to);
    el.dataset.value = to;
    if (reduce || from === to) { el.textContent = format(to); return; }
    const start = performance.now();
    cancelAnimationFrame(el._raf);
    const step = now => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = format(from + (to - from) * e);
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  const AREAS = {
    marketplace: { name: 'Marketplaces', goal: 'Crescer nos marketplaces', text: 'Anúncios bem posicionados, preço com margem e reputação cuidada são o caminho para vender mais nos marketplaces.' },
    loja: { name: 'Loja virtual', goal: 'Estruturar ou melhorar o e-commerce', text: 'Uma loja própria rápida e com compra simples transforma visitas em pedidos, sem depender só de terceiros.' },
    trafego: { name: 'Tráfego pago', goal: 'Aumentar vendas com tráfego pago', text: 'Você precisa de anúncios medidos pela venda, não pelo alcance. Assim cada real investido tem retorno acompanhado.' },
    social: { name: 'Redes sociais', goal: 'Organizar marketing e redes sociais', text: 'Seu perfil precisa mostrar com clareza o que você vende e ter uma rotina de conteúdo. É o primeiro passo para gerar confiança.' }
  };
  const order = Object.keys(AREAS);

  /* ---------- Cascata de entrada (listas aparecem item a item) ---------- */
  const STG = '.pain, .do-list li, .compare > div, .toggle-row, .faq-item, .chain-item, .problem-card, .sim-field, .method-step .content';
  const stgIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      stgIO.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$(document, STG).forEach(el => {
    const siblings = [...el.parentElement.children].filter(c => c.matches(STG));
    el.style.setProperty('--i', Math.min(siblings.indexOf(el), 8));
    el.classList.add('stg');
    stgIO.observe(el);
  });

  /* ---------- Marca-texto nas palavras de conversão e de dor ---------- */
  const hlIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('on');
      hlIO.unobserve(entry.target);
    });
  }, { threshold: 0.9 });
  $$(document, '.hl, .hl-pain').forEach(el => hlIO.observe(el));

  /* ---------- Abas de áreas ---------- */
  const tabs = $$(document, '[data-area-tab]');
  const panels = $$(document, '[data-area-panel]');
  const demos = {};

  function selectArea(key, { focus = false } = {}) {
    if (!AREAS[key]) return;
    tabs.forEach(tab => {
      const on = tab.dataset.areaTab === key;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    panels.forEach(panel => {
      const on = panel.dataset.areaPanel === key;
      if (on && panel.hidden) {
        panel.hidden = false;
        panel.classList.add('in');
        panel.classList.remove('is-entering');
        void panel.offsetWidth;
        panel.classList.add('is-entering');
        // Reexecuta a cascata dos itens do painel recém-aberto
        $$(panel, '.stg').forEach(el => el.classList.remove('in'));
        requestAnimationFrame(() => requestAnimationFrame(() => $$(panel, '.stg').forEach(el => el.classList.add('in'))));
        demos[key]?.autoplay();
      } else if (!on) {
        panel.hidden = true;
      }
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectArea(tab.dataset.areaTab));
    tab.addEventListener('keydown', e => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      selectArea(next.dataset.areaTab, { focus: true });
    });
  });

  // Links de outras seções (frase do topo, sinais de alerta, pilares, diagnóstico)
  $$(document, '[data-area]').forEach(link => {
    link.addEventListener('click', () => selectArea(link.dataset.area));
  });

  /* ---------- Controle "Hoje / Com a Beriz" ---------- */
  function setSeg(seg, state) {
    if (!seg) return;
    $$(seg, '[data-seg]').forEach(b => setChecked(b, b.dataset.seg === state));
    seg.dataset.state = state || '';
  }

  /* Monta um exemplo interativo: render(), state() → 'on'|'off'|'', apply(on) assíncrono */
  function mountDemo(key, root, { render, state, apply }) {
    const seg = $(root, '.seg');
    let token = 0;
    let played = false;
    const sync = () => { render(); setSeg(seg, state()); };
    const run = async on => {
      const my = ++token;
      setSeg(seg, on ? 'on' : 'off');
      await apply(on, () => my === token, sync);
      if (my === token) sync();
    };
    $$(root, '[data-seg]').forEach(b => b.addEventListener('click', () => { played = true; run(b.dataset.seg === 'on'); }));
    const demo = {
      sync,
      autoplay() {
        if (played) return;
        played = true;
        wait(900).then(() => { if (!root.closest('[hidden]')) run(true); });
      }
    };
    demos[key] = demo;
    // Toca a transformação na primeira vez que o exemplo aparece na tela
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      demo.autoplay();
    }, { threshold: 0.3 });
    io.observe(root);
    sync();
    return demo;
  }

  /* Liga/desliga uma lista em sequência, com pequeno intervalo entre itens */
  async function sequence(list, isActive, setFn, gap = 160) {
    for (const item of list) {
      if (!isActive()) return;
      if (setFn(item)) await wait(gap);
    }
  }

  /* ---------- Exemplo: Marketplaces ---------- */
  const mkt = $(document, '[data-demo="marketplace"]');
  if (mkt) {
    const chips = $$(mkt, '[data-mkt-chip]');
    const channels = $$(mkt, '.channel');
    const PILLS = ['sem destaque', 'pouca visibilidade', 'subindo na busca', 'quase lá', 'no topo da busca'];
    const POS = ['página 5', 'página 4', 'página 3', 'página 2', '1ª página'];
    const STARS = ['★★★☆☆', '★★★☆☆', '★★★★☆', '★★★★☆', '★★★★★'];
    const render = () => {
      const n = chips.filter(pressed).length;
      const v = 20 + n * 20;
      countTo($(mkt, '[data-mkt-score]'), v, x => `${Math.round(x)}%`);
      $(mkt, '[data-mkt-bar]').style.setProperty('--v', `${v}%`);
      const pill = $(mkt, '[data-mkt-pill]');
      pill.textContent = PILLS[n];
      pill.classList.toggle('is-top', n === 4);
      $(mkt, '[data-mkt-pos]').textContent = `Posição na busca: ${POS[n]}`;
      $(mkt, '[data-mkt-stars]').firstChild.textContent = STARS[n];
      const c = channels.filter(pressed).length;
      $(mkt, '[data-mkt-channels]').textContent = `${c} ${c === 1 ? 'canal ativo' : 'canais ativos'}`;
    };
    const demo = mountDemo('marketplace', mkt, {
      render,
      state: () => chips.every(pressed) ? 'on' : (!chips.some(pressed) ? 'off' : ''),
      apply: async (on, active, sync) => {
        await sequence(chips, active, c => { if (pressed(c) === on) return false; setPressed(c, on); sync(); return true; });
        const target = on ? [0, 1, 2] : [0];
        await sequence(channels, active, (ch, i = channels.indexOf(ch)) => {
          const want = target.includes(i);
          if (pressed(ch) === want) return false;
          setPressed(ch, want); sync(); return true;
        }, 120);
      }
    });
    chips.forEach(chip => chip.addEventListener('click', () => { setPressed(chip, !pressed(chip)); demo.sync(); }));
    channels.forEach(ch => ch.addEventListener('click', () => {
      if (pressed(ch) && channels.filter(pressed).length === 1) return; // mantém ao menos 1 canal
      setPressed(ch, !pressed(ch)); demo.sync();
    }));
    chips.forEach(c => setPressed(c, false));
    demo.sync();
  }

  /* ---------- Exemplo: Loja virtual ---------- */
  const shop = $(document, '[data-demo="loja"]');
  if (shop) {
    const steps = $$(shop, '[data-shop-steps] span');
    const items = $$(shop, '[data-shop-item]');
    const buy = $(shop, '[data-shop-buy]');
    const hero = $(shop, '[data-shop-hero]');
    const platforms = $$(shop, '.channel');
    const LABELS = ['Adicionar ao carrinho', 'Ir para o pagamento', 'Finalizar compra', 'Simular de novo'];
    let stage = 0;
    const render = () => {
      steps.forEach((s, i) => s.classList.toggle('done', i <= stage));
      buy.textContent = LABELS[stage];
      hero.classList.toggle('is-done', stage === 3);
      const ready = items.filter(pressed).length;
      $(shop, '[data-shop-ready]').textContent = `${ready} de ${items.length} ativos`;
    };
    const demo = mountDemo('loja', shop, {
      render,
      state: () => (items.every(pressed) && stage === 3) ? 'on' : (!items.some(pressed) && stage === 0 ? 'off' : ''),
      apply: async (on, active, sync) => {
        if (!on) { stage = 0; sync(); }
        await sequence(items, active, it => { if (pressed(it) === on) return false; setPressed(it, on); sync(); return true; });
        if (on) {
          stage = 0; sync();
          for (let i = 1; i <= 3 && active(); i++) { await wait(420); if (!active()) return; stage = i; sync(); }
        }
      }
    });
    buy.addEventListener('click', () => { stage = (stage + 1) % 4; demo.sync(); });
    items.forEach(item => item.addEventListener('click', () => { setPressed(item, !pressed(item)); demo.sync(); }));
    platforms.forEach(p => p.addEventListener('click', () => {
      platforms.forEach(o => setChecked(o, o === p));
      $(shop, '[data-shop-platform]').textContent = p.title;
    }));
    items.forEach(i => setPressed(i, false));
    demo.sync();
  }

  /* ---------- Exemplo: Tráfego pago ---------- */
  const ads = $(document, '[data-demo="trafego"]');
  if (ads) {
    const opts = $$(ads, '[data-ads-opt]');
    const bars = $$(ads, '[data-ads-funnel] > div');
    const COST = ['alto', 'caindo', 'caindo', 'bom', 'otimizado'];
    const LABEL = ['sem otimização', '1 otimização', '2 otimizações', '3 otimizações', 'tudo otimizado'];
    const render = () => {
      const n = opts.filter(checked).length;
      const widths = [100, 56 + n * 7, 30 + n * 9, 16 + n * 9];
      bars.forEach((b, i) => b.style.setProperty('--w', `${widths[i]}%`));
      bars[3].querySelector('span').textContent = n ? '✓' : '';
      $(ads, '[data-ads-label]').textContent = LABEL[n];
      const cost = $(ads, '[data-ads-cost]');
      cost.textContent = COST[n];
      cost.classList.toggle('is-good', n >= 3);
      const end = 18 + n * 10.5;
      const mid = 18 + n * 6;
      const line = `M0 18 C60 ${18 + n * 1.5} 120 ${mid - 2} 160 ${mid} S250 ${end - 2} 300 ${end}`;
      $(ads, '[data-ads-line]').setAttribute('d', line);
      $(ads, '[data-ads-area]').setAttribute('d', `${line} V70 H0Z`);
    };
    const demo = mountDemo('trafego', ads, {
      render,
      state: () => opts.every(checked) ? 'on' : (!opts.some(checked) ? 'off' : ''),
      apply: (on, active, sync) => sequence(opts, active, o => { if (checked(o) === on) return false; setChecked(o, on); sync(); return true; }, 260)
    });
    opts.forEach(o => o.addEventListener('click', () => { setChecked(o, !checked(o)); demo.sync(); }));
    demo.sync();
  }

  /* ---------- Exemplo: Redes sociais ---------- */
  const social = $(document, '[data-demo="social"]');
  if (social) {
    const days = $$(social, '.day');
    const items = $$(social, '[data-profile-item]');
    const CYCLE = ['', 'reel', 'carr', 'story'];
    const NAMES = { '': 'sem post', reel: 'vídeo', carr: 'carrossel', story: 'stories' };
    const ICONS = { '': '+', reel: '▶', carr: '▤', story: '●' };
    const PLAN_ON = ['reel', 'carr', 'story', 'reel', 'carr', 'story', ''];
    const PLAN_OFF = ['', '', 'reel', '', '', '', ''];
    const render = () => {
      days.forEach(d => {
        d.className = `day ${d.dataset.type}`.trim();
        d.textContent = ICONS[d.dataset.type];
        d.setAttribute('aria-label', `${d.parentElement.firstChild.textContent.trim()}: ${NAMES[d.dataset.type]}`);
      });
      const posts = days.filter(d => d.dataset.type).length;
      $(social, '[data-week-count]').textContent = `${posts} ${posts === 1 ? 'post' : 'posts'}`;
      const ok = items.filter(pressed).length;
      const pill = $(social, '[data-profile-pill]');
      pill.textContent = ok === items.length ? 'pronto' : `${ok} de ${items.length}`;
      pill.classList.toggle('is-top', ok === items.length);
    };
    const plan = () => days.map(d => d.dataset.type).join();
    const demo = mountDemo('social', social, {
      render,
      state: () => (plan() === PLAN_ON.join() && items.every(pressed)) ? 'on' : (plan() === PLAN_OFF.join() && !items.some(pressed) ? 'off' : ''),
      apply: async (on, active, sync) => {
        const target = on ? PLAN_ON : PLAN_OFF;
        await sequence(days, active, d => {
          const t = target[days.indexOf(d)];
          if (d.dataset.type === t) return false;
          d.dataset.type = t; sync(); return true;
        }, 110);
        await sequence(items, active, it => { if (pressed(it) === on) return false; setPressed(it, on); sync(); return true; }, 200);
      }
    });
    days.forEach(d => d.addEventListener('click', () => {
      d.dataset.type = CYCLE[(CYCLE.indexOf(d.dataset.type) + 1) % CYCLE.length];
      demo.sync();
    }));
    items.forEach(item => item.addEventListener('click', () => { setPressed(item, !pressed(item)); demo.sync(); }));
    days.forEach((d, i) => { d.dataset.type = PLAN_OFF[i]; });
    items.forEach(i => setPressed(i, false));
    demo.sync();
  }

  /* ---------- Frase rotativa de dor no topo ---------- */
  const rotator = document.getElementById('painRotator');
  if (rotator) {
    const word = $(rotator, '.pr-word');
    const win = $(rotator, '.pr-window');
    const PAINS = [
      { t: 'anúncio que ninguém acha?', a: 'marketplace' },
      { t: 'loja que não vende?', a: 'loja' },
      { t: 'tráfego que só gasta?', a: 'trafego' },
      { t: 'perfil que não converte?', a: 'social' }
    ];
    let idx = 0;
    let paused = false;
    const measure = text => {
      const probe = word.cloneNode();
      probe.textContent = text;
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;transform:none';
      win.append(probe);
      const w = probe.getBoundingClientRect().width;
      probe.remove();
      return w;
    };
    const fit = () => { win.style.width = `${Math.ceil(measure(word.textContent)) + 2}px`; };
    fit();
    window.addEventListener('resize', fit, { passive: true });
    rotator.addEventListener('mouseenter', () => { paused = true; });
    rotator.addEventListener('mouseleave', () => { paused = false; });
    rotator.addEventListener('focus', () => { paused = true; });
    rotator.addEventListener('blur', () => { paused = false; });
    if (!reduce) {
      setInterval(async () => {
        if (paused || document.hidden) return;
        idx = (idx + 1) % PAINS.length;
        const next = PAINS[idx];
        word.classList.add('is-out');
        win.style.width = `${Math.ceil(measure(next.t)) + 2}px`;
        await wait(380);
        word.textContent = next.t;
        rotator.dataset.area = next.a;
        word.classList.remove('is-out');
        word.classList.add('is-pre');
        void word.offsetWidth;
        word.classList.remove('is-pre');
      }, 3000);
    }
  }

  /* ---------- Sinais de alerta: problema vira solução ao aparecer ---------- */
  const pcIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      const i = $$(document, '.problem-card').indexOf(card);
      wait(900 + i * 220).then(() => card.classList.add('solved'));
      pcIO.unobserve(card);
    });
  }, { threshold: 0.6 });
  $$(document, '.problem-card').forEach(card => pcIO.observe(card));

  /* ---------- Pré-preenchimento do formulário ---------- */
  const contactForm = document.getElementById('contactForm');
  const goalSelect = contactForm?.querySelector('[name="main_goal"]');
  const messageField = contactForm?.querySelector('[name="message"]');
  let autoMessage = '';

  function prefill(goal, message) {
    if (goalSelect && goal) goalSelect.value = goal;
    if (messageField && message && (!messageField.value.trim() || messageField.value === autoMessage)) {
      messageField.value = message;
      autoMessage = message;
    }
  }

  $$(document, '[data-goal]').forEach(btn => {
    btn.addEventListener('click', () => prefill(btn.dataset.goal, btn.dataset.message));
  });

  /* ---------- Simulador de vendas ---------- */
  const simForm = document.getElementById('simForm');
  if (simForm) {
    const visits = document.getElementById('simVisits');
    const conv = document.getElementById('simConv');
    const ticket = document.getElementById('simTicket');
    const lifts = $$(simForm, '[data-lift]');
    const liftSeg = $(simForm, '.sim-seg');
    const simCta = document.getElementById('simCta');
    const fillRange = r => r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
    const pct = n => `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

    const renderSim = () => {
      const v = Number(visits.value);
      const c = Number(conv.value);
      const t = Number(ticket.value);
      const liftBtn = lifts.find(checked) || lifts[1];
      const l = Number(liftBtn.dataset.lift);
      liftSeg.dataset.index = lifts.indexOf(liftBtn);
      [visits, conv, ticket].forEach(fillRange);

      document.getElementById('simVisitsOut').textContent = int(v);
      document.getElementById('simConvOut').textContent = pct(c);
      document.getElementById('simTicketOut').textContent = brl(t);

      const salesNow = v * c / 100;
      const salesNew = v * (c + l) / 100;
      const revNow = salesNow * t;
      const revNew = salesNew * t;
      const gain = revNew - revNow;

      countTo(document.getElementById('simGain'), gain, brl);
      document.getElementById('simGainSales').textContent = `+${int(salesNew - salesNow)} vendas no mês`;
      document.getElementById('simNow').textContent = `${int(salesNow)} vendas · ${brl(revNow)}`;
      document.getElementById('simNew').textContent = `${int(salesNew)} vendas · ${brl(revNew)} (conversão de ${pct(c + l)})`;
      countTo(document.getElementById('simYear'), gain * 12, n => `+ ${brl(n)}`);

      document.getElementById('simBarNow').style.setProperty('--h', `${(revNow / revNew) * 100}%`);
      document.getElementById('simBarNew').style.setProperty('--h', '100%');

      simCta.dataset.message = `Simulador do site: ${int(v)} visitas/mês, conversão de ${pct(c)}, ticket médio de ${brl(t)}. `
        + `Com +${String(l).replace('.', ',')} ponto de conversão, o ganho estimado seria de ${brl(gain)} por mês.`;
    };
    [visits, conv, ticket].forEach(r => r.addEventListener('input', renderSim));
    lifts.forEach(b => b.addEventListener('click', () => { lifts.forEach(o => setChecked(o, o === b)); renderSim(); }));
    simCta.addEventListener('click', () => prefill(simCta.dataset.goal, simCta.dataset.message));
    renderSim();
  }

  /* ---------- Barra de ação fixa no celular ---------- */
  const mCta = document.getElementById('mCta');
  if (mCta) {
    const hero = document.querySelector('.opening-hero');
    let nearEnd = false;
    const endIO = new IntersectionObserver(entries => {
      nearEnd = entries.some(e => e.isIntersecting);
      update();
    }, { threshold: 0.05 });
    $$(document, '.cta-final, footer').forEach(el => endIO.observe(el));
    function update() {
      const show = window.scrollY > (hero?.offsetHeight || 600) * 0.7 && !nearEnd && !document.body.classList.contains('modal-open');
      mCta.classList.toggle('is-on', show);
      document.body.classList.toggle('mcta-on', show);
    }
    let queued = false;
    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; update(); });
    }, { passive: true });
    update();
  }

  /* ---------- Diagnóstico rápido ---------- */
  const form = document.getElementById('diagForm');
  if (!form) return;
  const switches = $$(form, '[data-diag]');
  const totals = {};
  switches.forEach(s => { totals[s.dataset.diag] = (totals[s.dataset.diag] || 0) + 1; });

  const countEl = document.getElementById('diagCount');
  const titleEl = document.getElementById('diagTitle');
  const textEl = document.getElementById('diagText');
  const cta = document.getElementById('diagCta');
  const see = document.getElementById('diagSee');
  const reset = document.getElementById('diagReset');
  const diagBars = Object.fromEntries($$(document, '[data-bar]').map(b => [b.dataset.bar, b]));

  function renderDiagnosis() {
    const on = switches.filter(s => s.checked);
    const score = Object.fromEntries(order.map(k => [k, 0]));
    on.forEach(s => { score[s.dataset.diag] += 1; });

    order.forEach(k => {
      const bar = diagBars[k];
      if (!bar) return;
      const p = totals[k] ? (score[k] / totals[k]) * 100 : 0;
      bar.querySelector('i').style.setProperty('--v', `${p}%`);
      bar.querySelector('small').textContent = score[k] ? `${score[k]} de ${totals[k]}` : '0';
      bar.classList.toggle('on', score[k] > 0);
    });

    if (!on.length) {
      countEl.textContent = 'Nenhum item marcado';
      titleEl.textContent = 'Marque ao menos uma situação.';
      textEl.textContent = 'Assim que você ativar um item, mostramos qual área da Beriz resolve isso e como ela funciona.';
      cta.setAttribute('aria-disabled', 'true');
      cta.tabIndex = -1;
      delete cta.dataset.goal;
      delete cta.dataset.message;
      return;
    }

    // Prioridade: maior proporção marcada; empate segue a ordem das áreas.
    const ranked = order.filter(k => score[k] > 0)
      .sort((a, b) => (score[b] / totals[b]) - (score[a] / totals[a]) || order.indexOf(a) - order.indexOf(b));
    const top = ranked[0];

    countEl.textContent = `${on.length} ${on.length === 1 ? 'item marcado' : 'itens marcados'}`;
    titleEl.innerHTML = `Comece por: <span>${AREAS[top].name}</span>`;
    titleEl.classList.remove('pop'); void titleEl.offsetWidth; titleEl.classList.add('pop');
    let text = AREAS[top].text;
    if (ranked.length >= 3) text += ' Como você tem várias frentes abertas, a gente ajuda a definir a ordem certa para atacar cada uma.';
    textEl.textContent = text;

    cta.removeAttribute('aria-disabled');
    cta.removeAttribute('tabindex');
    cta.dataset.goal = AREAS[top].goal;
    cta.dataset.message = 'Diagnóstico rápido do site:\n- ' + on.map(s => s.closest('label').querySelector('span').textContent.trim()).join('\n- ');
    see.dataset.area = top;
    see.textContent = `Ver como funciona: ${AREAS[top].name}`;
  }

  switches.forEach(s => s.addEventListener('change', renderDiagnosis));
  reset?.addEventListener('click', () => {
    switches.forEach(s => { s.checked = false; });
    see.textContent = 'Ver como funciona';
    see.dataset.area = 'marketplace';
    renderDiagnosis();
  });
  cta.addEventListener('click', () => prefill(cta.dataset.goal, cta.dataset.message));
  renderDiagnosis();
})();

/* ================= BERIZ V17 — MOBILE FIRST + DETALHES iOS =================
   Lista "O que a Beriz faz" recolhível no celular, paginação dos carrosséis,
   vibração leve em toques (Android), e "puxar para baixo" para fechar o
   formulário de contato no celular. */
(() => {
  const mobile = window.matchMedia('(max-width: 760px)');

  /* Lista recolhível: fechada no celular, sempre aberta no computador */
  const mores = [...document.querySelectorAll('.do-more')];
  const syncMore = () => mores.forEach(d => { d.open = !mobile.matches; });
  syncMore();
  mobile.addEventListener?.('change', syncMore);
  mores.forEach(d => d.querySelector('summary').addEventListener('click', e => {
    if (!mobile.matches) e.preventDefault();
  }));

  /* Paginação estilo iOS para carrosséis horizontais */
  document.querySelectorAll('[data-dots-for]').forEach(dots => {
    const track = document.querySelector(dots.dataset.dotsFor);
    if (!track) return;
    const items = [...track.children];
    dots.innerHTML = items.map(() => '<i></i>').join('');
    const marks = [...dots.children];
    const update = () => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      const tr = track.getBoundingClientRect();
      const pos = it => { const r = it.getBoundingClientRect(); return r.left + r.width / 2 - tr.left + track.scrollLeft - it.offsetWidth / 2; };
      items.forEach((it, i) => {
        if (Math.abs(pos(it) + it.offsetWidth / 2 - center) < Math.abs(pos(items[best]) + items[best].offsetWidth / 2 - center)) best = i;
      });
      marks.forEach((m, i) => m.classList.toggle('on', i === best));
    };
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  });

  /* Vibração leve ao tocar em controles (só aparelhos que suportam) */
  if ('vibrate' in navigator) {
    document.addEventListener('click', e => {
      if (e.target.closest('.switch, .mini-switch, .seg button, .chip, .day, .w-toggle, .channel, .area-tab, .buy-btn')) {
        try { navigator.vibrate(8); } catch (_) {}
      }
    });
  }

  /* Formulário de contato: arrastar para baixo fecha (celular) */
  const modal = document.getElementById('contactModal');
  const sheet = modal?.querySelector('.contact-dialog');
  if (sheet) {
    let startY = 0, dy = 0, dragging = false;
    sheet.addEventListener('touchstart', e => {
      if (!mobile.matches || sheet.scrollTop > 0) return;
      dragging = true; startY = e.touches[0].clientY; dy = 0;
      sheet.style.transition = 'none';
    }, { passive: true });
    sheet.addEventListener('touchmove', e => {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    sheet.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 110) modal.querySelector('.contact-close')?.click();
    });
  }
})();

/* ================= BERIZ V18 — LOGO-ENGRENAGEM NO TOPO =================
   A logo grande ao fundo gira conforme a rolagem. Onde o navegador suporta
   animação guiada pela rolagem (CSS animation-timeline), o CSS faz tudo
   fora da thread principal. Nos demais, este fallback usa rAF. */
(() => {
  const gear = document.querySelector('.hero-gear');
  if (!gear || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.CSS?.supports?.('animation-timeline: scroll()')) return;
  let queued = false;
  const paint = () => {
    queued = false;
    if (window.scrollY > window.innerHeight * 1.6) return;
    gear.style.setProperty('--gear', `${window.scrollY * 0.16}deg`);
  };
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }, { passive: true });
  paint();
})();

/* ================= BERIZ V19 — MENU iOS + LOGO "NASCENDO" =================
   Trava a rolagem da página com o menu aberto e, onde o navegador não tem
   animação guiada pela rolagem (view-timeline), faz a logo do CTA final
   "nascer" quando a seção aparece. */
(() => {
  const nav = document.getElementById('mobileNav');
  if (nav) {
    new MutationObserver(() => {
      document.documentElement.classList.toggle('menu-open', nav.classList.contains('open'));
    }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  }

  const sun = document.querySelector('.cta-final');
  if (sun && !window.CSS?.supports?.('animation-timeline: view()')) {
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      sun.classList.add('risen');
      io.disconnect();
    }, { threshold: 0.35 });
    io.observe(sun);
  }
})();

/* ================= BERIZ V22 — TÍTULO DO TOPO SEMPRE EM 1 LINHA POR FRASE =================
   O CSS já calcula o tamanho pela largura da tela. Esta proteção mede as
   3 frases depois que a fonte carrega e, se alguma não couber (fonte do
   aparelho mais larga, zoom etc.), reduz o título proporcionalmente. */
(() => {
  const h1 = document.querySelector('.hero-phrases');
  const box = h1?.closest('.opening-inner');
  if (!h1 || !box) return;
  const lines = [...h1.querySelectorAll('.line-inner')];
  const fit = () => {
    h1.style.fontSize = '';
    const cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const widest = Math.max(...lines.map(l => l.scrollWidth));
    if (widest > avail) {
      const size = parseFloat(getComputedStyle(h1).fontSize);
      h1.style.fontSize = `${Math.floor(size * (avail / widest) * 0.98)}px`;
    }
  };
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); }, { passive: true });
  (document.fonts?.ready || Promise.resolve()).then(fit);
  fit();
})();

/* ================= BERIZ V24 — LOGO NASCENDO NO RODAPÉ (fallback) =================
   Onde não há animação guiada pela rolagem (view-timeline), a logo do
   rodapé sobe quando o rodapé aparece. */
(() => {
  const foot = document.querySelector('footer');
  if (!foot || window.CSS?.supports?.('animation-timeline: view()')) return;
  const io = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    foot.classList.add('risen');
    io.disconnect();
  }, { threshold: 0.3 });
  io.observe(foot);
})();

/* ================= BERIZ V30 — PROJETOS REAIS =================
   Cada aparelho mostra a captura da loja e rola devagar sozinho quando
   aparece na tela (prévia). Ao primeiro toque/rolagem do visitante a
   prévia para e ele navega com o dedo ou o mouse. O toque no aparelho
   abre o site real; se a prévia estava rodando, o primeiro toque só a
   pausa (para não abrir o site sem querer). Arrastar para rolar não
   abre nada (o navegador não gera clique ao arrastar). */
(() => {
  const devices = [...document.querySelectorAll('.case-device')];
  if (!devices.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 34; // px por segundo da prévia

  devices.forEach(device => {
    const screen = device.querySelector('.cd-screen');
    let auto = false, raf = null, last = 0, held = false, visible = false, touched = false, pauseUntil = 0;

    const step = now => {
      if (!auto) return;
      const dt = Math.min(64, now - last); last = now;
      if (now > pauseUntil) {
        const max = screen.scrollHeight - screen.clientHeight;
        if (screen.scrollTop >= max - 1) {
          pauseUntil = now + 1800;                          // respira no fim
          setTimeout(() => { if (auto) screen.scrollTo({ top: 0, behavior: 'smooth' }); }, 1500);
          pauseUntil = now + 3200;                          // e recomeça do topo
        } else {
          screen.scrollTop += SPEED * dt / 1000;
        }
      }
      raf = requestAnimationFrame(step);
    };
    const start = () => { if (reduce || touched || auto || !visible) return; auto = true; last = performance.now(); raf = requestAnimationFrame(step); };
    const stop = () => { auto = false; if (raf) cancelAnimationFrame(raf); raf = null; };

    // Interação do visitante: para a prévia de vez
    const userTakesOver = () => {
      held = auto;          // se a prévia rodava, o próximo clique só pausa
      touched = true; stop();
      device.classList.add('is-armed');
    };
    screen.addEventListener('wheel', () => { touched = true; stop(); device.classList.add('is-armed'); }, { passive: true });
    device.addEventListener('pointerdown', userTakesOver);
    device.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { touched = true; stop(); screen.scrollTop += e.key === 'ArrowDown' ? 120 : -120; e.preventDefault(); } });
    device.addEventListener('click', e => {
      if (held) { e.preventDefault(); held = false; }   // 1º toque durante a prévia: só pausa
    });

    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) setTimeout(start, 600); else stop();
    }, { threshold: 0.55 }).observe(device);
  });
})();

/* ================= BERIZ V31 — PÁGINA DE PRODUTO DENTRO DO APARELHO =================
   Em aparelhos com [data-open-page]: tocar no produto marcado abre a
   página dele dentro do próprio aparelho (desliza da direita, como no
   iOS); as fotos alternam sozinhas; a seta de voltar retorna à vitrine.
   Esses toques não abrem o site real. Fora deles, o toque continua
   abrindo a loja real (comportamento da V30). */
(() => {
  document.querySelectorAll('.case-device').forEach(device => {
    const open = device.querySelector('[data-open-page]');
    if (!open) return;
    const photos = [...device.querySelectorAll('.cd-page-photos > img')];
    const dots = [...device.querySelectorAll('.cd-dots i')];
    let timer = null, idx = 0;
    const show = i => {
      idx = i;
      photos.forEach((p, k) => p.classList.toggle('on', k === i));
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    };
    show(0);
    const openPage = () => {
      device.classList.add('is-page', 'is-armed');
      clearInterval(timer);
      timer = setInterval(() => show((idx + 1) % photos.length), 2600);
    };
    const closePage = () => {
      device.classList.remove('is-page');
      clearInterval(timer); timer = null; show(0);
    };
    // captura antes do clique da V30: hotspots nunca abrem o site real
    device.addEventListener('click', e => {
      if (e.target.closest('[data-open-page]')) { e.preventDefault(); e.stopImmediatePropagation(); openPage(); return; }
      if (e.target.closest('[data-close-page]')) { e.preventDefault(); e.stopImmediatePropagation(); closePage(); return; }
      if (device.classList.contains('is-page') && e.target.closest('.cd-page-photos')) {
        e.preventDefault(); e.stopImmediatePropagation(); show((idx + 1) % photos.length);
      }
    }, true);
  });
})();

/* ================= BERIZ V32 — CARROSSEL DE PROJETOS =================
   Um aparelho por vez no centro (scroll-snap). Marca o card central com
   .is-active, liga as setas e, ao tocar num aparelho vizinho, centraliza
   esse aparelho em vez de abrir a loja. */
(() => {
  const track = document.querySelector('.case-track');
  if (!track) return;
  const cases = [...track.querySelectorAll('.case')];
  const prev = document.querySelector('[data-case-prev]');
  const next = document.querySelector('[data-case-next]');
  let active = 0;
  // posição do card dentro da faixa rolável (sem escala do card e independente do offsetParent)
  // centro do card dentro do conteúdo rolável (o centro não muda com a escala do card)
  const midOf = c => { const r = c.getBoundingClientRect(), t = track.getBoundingClientRect(); return r.left + r.width / 2 - t.left + track.scrollLeft; };
  const posOf = c => midOf(c) - c.offsetWidth / 2;
  const center = i => {
    const c = cases[i];
    // a trava "1 aparelho por gesto" (scroll-snap) impediria saltar 2+ posições; desliga só durante o movimento
    track.style.scrollSnapType = 'none';
    clearTimeout(center._t);
    track.scrollTo({ left: posOf(c) - (track.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' });
    center._t = setTimeout(() => { track.style.scrollSnapType = ''; }, 900);
  };
  const update = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bestD = Infinity;
    cases.forEach((c, i) => { const d = Math.abs(posOf(c) + c.offsetWidth / 2 - mid); if (d < bestD) { bestD = d; best = i; } });
    active = best;
    cases.forEach((c, i) => c.classList.toggle('is-active', i === best));
    if (prev) prev.disabled = best === 0;
    if (next) next.disabled = best === cases.length - 1;
  };
  let raf = null;
  track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = null; update(); }); }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  prev?.addEventListener('click', () => center(Math.max(0, active - 1)));
  next?.addEventListener('click', () => center(Math.min(cases.length - 1, active + 1)));
  // toque em aparelho vizinho: centraliza (não abre a loja)
  cases.forEach((c, i) => c.querySelector('.case-device')?.addEventListener('click', e => {
    if (i === active) return;
    e.preventDefault(); e.stopImmediatePropagation(); center(i);
  }, true));
  // começa sempre no primeiro projeto, centralizado
  const first = () => { const c = cases[0]; track.scrollLeft = posOf(c) - (track.clientWidth - c.offsetWidth) / 2; update(); };
  requestAnimationFrame(first);
  window.addEventListener('load', first, { once: true });
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { center(Math.min(cases.length - 1, active + 1)); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { center(Math.max(0, active - 1)); e.preventDefault(); }
  });
  update();
})();

/* ================= BERIZ V34 — RESUMO DO DIAGNÓSTICO NO CELULAR =================
   No celular o resultado fica abaixo das perguntas. Uma pílula fixa no rodapé
   da tela mostra "Comece por: X" enquanto a pessoa responde e leva ao resultado. */
(() => {
  const mini = document.getElementById('diagMini');
  const text = document.getElementById('diagMiniText');
  const form = document.getElementById('diagForm');
  const title = document.getElementById('diagTitle');
  if (!mini || !form || !title) return;
  const sync = () => {
    const n = form.querySelectorAll('[data-diag]:checked').length;
    const area = title.querySelector('span')?.textContent;
    text.textContent = n && area ? `Comece por: ${area}` : 'Marque o que acontece no seu negócio';
    mini.classList.toggle('has-result', !!(n && area));
    mini.classList.remove('pop'); void mini.offsetWidth; if (n) mini.classList.add('pop');
  };
  form.addEventListener('change', () => requestAnimationFrame(sync));
  document.getElementById('diagReset')?.addEventListener('click', () => requestAnimationFrame(sync));
  mini.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('diagResult')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
