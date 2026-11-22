'use strict';

const slides = [...document.querySelectorAll('.stage > [data-slide]')];
const controls = 'a, button, input, select, textarea, summary, video, iframe, [contenteditable], [data-slide-interactive]';
let active = -1;

function showSlide(index, navigate = false) {
  if (!slides[index] || index === active) return false;

  const slide = slides[index];
  slides.forEach((item) => { item.hidden = item !== slide; });
  active = index;
  document.body.dataset.canAdvance = String(index < slides.length - 1);
  window.scrollTo(0, 0);

  if (navigate) {
    history.pushState(null, '', `#${slide.id}`);
    slide.querySelector('h1, h2')?.focus({ preventScroll: true });
  }
  return true;
}

function syncSlide() {
  const index = slides.findIndex((slide) => `#${slide.id}` === location.hash);
  showSlide(Math.max(0, index));
}

const isControl = (target) => target instanceof Element && target.closest(controls);
const capturesGesture = (target) => isControl(target) && !target.closest('.carousel-example');

const gallery = document.querySelector('.examples-gallery');
if (gallery) {
  const track = gallery.querySelector('.carousel-examples');
  const previous = gallery.querySelector('.gallery-button--previous');
  const next = gallery.querySelector('.gallery-button--next');

  function updateGalleryButtons() {
    const end = track.scrollWidth - track.clientWidth;
    previous.hidden = next.hidden = end <= 1;
    previous.setAttribute('aria-disabled', String(track.scrollLeft <= 1));
    next.setAttribute('aria-disabled', String(track.scrollLeft >= end - 1));
  }

  function moveGallery(direction, button) {
    if (button.getAttribute('aria-disabled') === 'true') return;

    const [first, second] = track.children;
    const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    const current = Math.round(track.scrollLeft / step);
    track.scrollTo({ left: (current + direction) * step, behavior: 'instant' });
  }

  previous.addEventListener('click', () => moveGallery(-1, previous));
  next.addEventListener('click', () => moveGallery(1, next));
  track.addEventListener('scroll', updateGalleryButtons, { passive: true });
  new ResizeObserver(updateGalleryButtons).observe(track);
}

const workflow = document.querySelector('.workflow-slide');
if (workflow) {
  function setStepExpanded(step, expanded) {
    step.setAttribute('aria-expanded', String(expanded));
    document.getElementById(step.getAttribute('aria-controls')).hidden = !expanded;
  }

  workflow.addEventListener('click', (event) => {
    const step = event.target.closest('.workflow-step');
    if (!step) return;

    const openStep = workflow.querySelector('.workflow-step[aria-expanded="true"]');
    if (openStep) setStepExpanded(openStep, false);
    if (openStep !== step) setStepExpanded(step, true);
  });

  workflow.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const step = workflow.querySelector('.workflow-step[aria-expanded="true"]');
    if (!step) return;
    setStepExpanded(step, false);
    step.focus();
  });
}

document.querySelectorAll('[data-tab-list]').forEach((tabList) => {
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];

  function selectTab(selected) {
    tabs.forEach((tab) => {
      const activeTab = tab === selected;
      tab.setAttribute('aria-selected', String(activeTab));
      tab.tabIndex = activeTab ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !activeTab;
    });
  }

  tabList.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) selectTab(tab);
  });

  tabList.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const index = tabs.indexOf(event.target);
    if (index < 0) return;

    const target = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (target === undefined) return;

    event.preventDefault();
    selectTab(tabs[target]);
    tabs[target].focus();
  });
});

const storySlide = document.querySelector('.story-slide');
if (storySlide) {
  const people = new Intl.NumberFormat('id-ID');
  const rate = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const storyTables = [
    {
      id: 'story-unemployment',
      dimension: 'Umur',
      values: (row) => [people.format(row.unemployed), people.format(row.labor), rate.format(row.tpt)],
    },
    {
      id: 'story-employment',
      dimension: 'Pendidikan',
      values: (row) => [people.format(row.employed), people.format(row.unemployed), rate.format(row.tpt)],
    },
  ];

  function appendStoryRow(section, label, values) {
    const row = section.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = label;
    row.appendChild(heading);
    values.forEach((value) => { row.insertCell().textContent = value; });
  }

  storyTables.forEach(({ id, dimension, values }) => {
    const table = document.getElementById(id);
    const rows = laborData.filter((row) => row.dimension === dimension && row.sex === 'Total');
    rows.forEach((row) => appendStoryRow(table.tBodies[0], row.group, values(row)));
    appendStoryRow(table.tFoot, 'Total', values(laborTotals.Total));
  });
}

const tptTable = document.getElementById('tpt-jambi-table');
if (tptTable) {
  const aiTable = tptTable.cloneNode(true);
  aiTable.removeAttribute('id');
  document.getElementById('tpt-jambi-table-ai').replaceWith(aiTable);
}

document.querySelectorAll('[data-copy-prompt], [data-copy-table]').forEach((button) => {
  button.addEventListener('click', async () => {
    const prompt = document.getElementById(button.dataset.copyPrompt);
    const table = document.getElementById(button.dataset.copyTable);
    const status = document.getElementById(button.dataset.copyStatus);
    const fallback = document.getElementById(button.dataset.copyFallback);
    const parts = [];

    if (prompt) parts.push(prompt.innerText);
    if (table) {
      const rows = Array.from(table.querySelectorAll('tbody tr'), ({ cells }) => {
        const name = cells[0].textContent;
        const rate = cells[1].textContent.replace(',', '.');
        return `${name},${rate}`;
      });
      if (prompt) rows.unshift('Kabupaten/kota,TPT_persen');
      parts.push(rows.join('\n'));
    }
    const text = parts.join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      status.textContent = button.dataset.copyMessage || 'Prompt tersalin.';
      if (fallback) fallback.hidden = true;
    } catch {
      if (fallback) {
        fallback.hidden = false;
        fallback.value = text;
        fallback.focus();
        fallback.select();
      } else {
        const range = document.createRange();
        range.selectNodeContents(prompt);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      status.textContent = 'Teks sudah dipilih untuk disalin.';
    }
  });
});

const cleaningQuiz = document.getElementById('cleaning-quiz');
if (cleaningQuiz) {
  const cards = [...cleaningQuiz.querySelectorAll('.cleaning-card')];
  const answers = [...cleaningQuiz.querySelectorAll('.cleaning-answer')];
  const choices = [...cleaningQuiz.querySelectorAll('fieldset')];
  const previousTable = cleaningQuiz.querySelector('.gallery-button--previous');
  const nextTable = cleaningQuiz.querySelector('.gallery-button--next');
  const position = document.getElementById('cleaning-position');
  const checkButton = cleaningQuiz.querySelector('button[type="submit"]');
  const resetButton = cleaningQuiz.querySelector('button[type="reset"]');
  const score = document.getElementById('cleaning-score');
  let tableIndex = 0;

  function showCleaningTable(index) {
    if (!cards[index]) return;

    tableIndex = index;
    cards.forEach((card, idx) => { card.hidden = idx !== index; });
    previousTable.setAttribute('aria-disabled', String(index === 0));
    nextTable.setAttribute('aria-disabled', String(index === cards.length - 1));
    position.textContent = `${index + 1} dari ${cards.length}`;
    if (!checkButton.disabled) score.textContent = '';
  }

  previousTable.addEventListener('click', () => showCleaningTable(tableIndex - 1));
  nextTable.addEventListener('click', () => showCleaningTable(tableIndex + 1));
  cleaningQuiz.addEventListener('change', () => { score.textContent = ''; });

  cleaningQuiz.addEventListener('submit', (event) => {
    event.preventDefault();
    const submitted = new FormData(cleaningQuiz);
    const unanswered = answers.findIndex(({ dataset }) => !submitted.has(dataset.question));
    if (unanswered !== -1) {
      showCleaningTable(unanswered);
      const title = cards[unanswered].querySelector('h3').textContent;
      score.textContent = `Pilih jawaban untuk ${title}.`;
      choices[unanswered].querySelector('input').focus();
      return;
    }

    const correct = answers.filter(({ dataset }) => submitted.get(dataset.question) === dataset.answer).length;

    answers.forEach((answer) => { answer.hidden = false; });
    choices.forEach((group) => { group.disabled = true; });
    checkButton.disabled = true;
    resetButton.hidden = false;
    score.textContent = `${correct} dari ${answers.length} jawaban tepat.`;
  });

  cleaningQuiz.addEventListener('reset', () => {
    answers.forEach((answer) => { answer.hidden = true; });
    choices.forEach((group) => { group.disabled = false; });
    checkButton.disabled = false;
    resetButton.hidden = true;
    showCleaningTable(0);
  });
}

function canScroll(direction) {
  const { scrollHeight, scrollTop, clientHeight } = document.scrollingElement;
  return direction > 0 ? scrollHeight - clientHeight - scrollTop > 1 : scrollTop > 1;
}

syncSlide();
window.addEventListener('hashchange', syncSlide);

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || isControl(event.target)) return;
  if (window.getSelection()?.isCollapsed === false) return;
  showSlide(active + 1, true);
});

const keyDirections = new Map([
  ['ArrowDown', 1], ['ArrowRight', 1], ['PageDown', 1], ['Enter', 1],
  ['ArrowUp', -1], ['ArrowLeft', -1], ['PageUp', -1],
]);
document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || isControl(event.target)) return;
  const direction = event.key === ' ' ? (event.shiftKey ? -1 : 1) : keyDirections.get(event.key);
  if (direction && !canScroll(direction) && showSlide(active + direction, true)) event.preventDefault();
});

let previousWheel = -Infinity;
let wheelDirection = 0;
let wheelDistance = 0;
let wheelUsed = false;

window.addEventListener('wheel', (event) => {
  if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX) || capturesGesture(event.target)) return;
  const direction = Math.sign(event.deltaY);
  if (canScroll(direction)) return;
  if (event.cancelable) event.preventDefault();

  if (direction !== wheelDirection || event.timeStamp - previousWheel > 190) {
    wheelDirection = direction;
    wheelDistance = 0;
    wheelUsed = false;
  }
  previousWheel = event.timeStamp;
  if (wheelUsed) return;

  const unit = [1, 16, window.innerHeight][event.deltaMode] || 1;
  wheelDistance += Math.abs(event.deltaY) * unit;
  if (wheelDistance >= 16) {
    wheelUsed = true;
    showSlide(active + direction, true);
  }
}, { passive: false });

let touchStart = null;
window.addEventListener('touchstart', (event) => {
  touchStart = event.touches.length === 1 && !capturesGesture(event.target)
    ? { touch: event.touches[0], scrollTop: document.scrollingElement.scrollTop }
    : null;
}, { passive: true });
window.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
window.addEventListener('touchend', (event) => {
  if (!touchStart || event.touches.length || event.defaultPrevented) return;
  const { touch, scrollTop } = touchStart;
  touchStart = null;
  const end = [...event.changedTouches].find((item) => item.identifier === touch.identifier);
  if (!end || Math.abs(document.scrollingElement.scrollTop - scrollTop) > 1) return;

  const distance = touch.clientY - end.clientY;
  const direction = Math.sign(distance);
  if (Math.abs(distance) < 45 || Math.abs(distance) < Math.abs(touch.clientX - end.clientX) || canScroll(direction)) return;
  if (showSlide(active + direction, true) && event.cancelable) event.preventDefault();
}, { passive: false });
