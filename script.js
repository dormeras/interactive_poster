// Интерактивные элементы плаката и мини-тест без передачи данных на сервер.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function setExpanded(button, expanded) {
  button.setAttribute('aria-expanded', String(expanded));
}

$('.message-card')?.addEventListener('click', (event) => {
  if (event.target.closest('a')) return;
  const button = event.currentTarget;
  const explanation = $('.message-explanation', button);
  const open = button.getAttribute('aria-expanded') !== 'true';
  setExpanded(button, open);
  explanation.hidden = !open;
  $('.message-cta b', button).textContent = open ? '−' : '＋';
});

$$('.scenario').forEach((button) => button.addEventListener('click', () => {
  const open = button.getAttribute('aria-expanded') !== 'true';
  setExpanded(button, open);
  $('.scenario-plus', button).textContent = open ? '−' : '＋';
}));

$('.password-card')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const open = button.getAttribute('aria-expanded') !== 'true';
  setExpanded(button, open);
  $('em', button).hidden = !open;
  $('.password-toggle', button).textContent = open ? '−' : '＋';
});

const quizApp = $('#quiz-app');
const startButton = $('#start-quiz');
let allQuestions = [];
let round = [];
let questionIndex = 0;
let score = 0;
let correctCount = 0;
let hasAnswered = false;

// Fisher–Yates создаёт честную случайную перестановку массива на месте.
function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function loadQuestions() {
  if (allQuestions.length) return allQuestions;
  const response = await fetch(new URL('questions.json', window.location.href));
  if (!response.ok) throw new Error(`Не удалось загрузить вопросы (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length < 10) throw new Error('В базе должно быть не меньше 10 вопросов.');
  if (data.some((item) => !item.question || !Array.isArray(item.answers) || item.answers.length !== 4 || !Number.isInteger(item.correctAnswer) || !item.explanation || !item.category)) {
    throw new Error('В базе обнаружен вопрос с неверным форматом.');
  }
  allQuestions = data;
  return allQuestions;
}

function renderQuestion() {
  hasAnswered = false;
  const question = round[questionIndex];
  const stage = $('.quiz-stage', quizApp);
  const progress = ((questionIndex) / round.length) * 100;
  // Сохраняем исходный индекс ответа при перемешивании вариантов.
  const answers = shuffle(question.answers.map((text, originalIndex) => ({ text, originalIndex })));
  stage.hidden = false;
  $('.quiz-start', quizApp).hidden = true;
  $('.quiz-result', quizApp).hidden = true;
  stage.innerHTML = `
    <div class="quiz-progress-row"><span>ВОПРОС ${questionIndex + 1} / ${round.length}</span><span>${score} БАЛЛОВ</span></div>
    <div class="progress-track" role="progressbar" aria-label="Прогресс теста" aria-valuemin="0" aria-valuemax="${round.length}" aria-valuenow="${questionIndex}"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="question-category">${question.category.toLocaleUpperCase('ru')}</div>
    <h3 id="question-text">${question.question}</h3>
    <div class="answer-grid" role="group" aria-labelledby="question-text">${answers.map((answer, index) => `<button class="answer-option" type="button" data-original-index="${answer.originalIndex}" aria-pressed="false"><span class="answer-letter">${String.fromCharCode(1040 + index)}.</span> ${answer.text}</button>`).join('')}</div>
    <div class="quiz-feedback" hidden></div>
    <div class="quiz-actions"><button class="button button-primary submit-answer" type="button" disabled>Ответить <span>→</span></button></div>`;
  $$('.answer-option', stage).forEach((button) => button.addEventListener('click', () => {
    if (hasAnswered) return;
    $$('.answer-option', stage).forEach((option) => {
      option.setAttribute('aria-pressed', String(option === button));
    });
    $('.submit-answer', stage).disabled = false;
  }));
  $('.submit-answer', stage).addEventListener('click', answerQuestion);
  stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function answerQuestion() {
  if (hasAnswered) return;
  const stage = $('.quiz-stage', quizApp);
  const question = round[questionIndex];
  const selected = $('.answer-option[aria-pressed="true"]', stage);
  if (!selected) return;
  hasAnswered = true;
  const isCorrect = Number(selected.dataset.originalIndex) === question.correctAnswer;
  if (isCorrect) { score += 10; correctCount += 1; }
  $$('.answer-option', stage).forEach((option) => {
    option.disabled = true;
    if (Number(option.dataset.originalIndex) === question.correctAnswer) option.classList.add('correct');
    else if (option === selected) option.classList.add('incorrect');
  });
  $('.quiz-progress-row span:last-child', stage).textContent = `${score} БАЛЛОВ`;
  const feedback = $('.quiz-feedback', stage);
  feedback.hidden = false;
  feedback.classList.toggle('wrong', !isCorrect);
  feedback.innerHTML = `<strong>${isCorrect ? 'Верно! +10 баллов' : 'В этот раз мимо'}</strong>${question.explanation}`;
  const next = $('.submit-answer', stage);
  next.disabled = false;
  next.innerHTML = questionIndex === round.length - 1 ? 'К результатам <span>→</span>' : 'Следующий вопрос <span>→</span>';
  next.classList.add('next-question');
  next.addEventListener('click', advanceQuestion, { once: true });
}

function advanceQuestion() {
  questionIndex += 1;
  if (questionIndex >= round.length) showResult();
  else renderQuestion();
}

function showResult() {
  const stage = $('.quiz-stage', quizApp);
  const result = $('.quiz-result', quizApp);
  stage.hidden = true;
  result.hidden = false;
  let title = 'Начинающий пользователь';
  if (score >= 95) title = 'Мастер кибербезопасности';
  else if (score >= 80) title = 'Цифровой эксперт';
  else if (score >= 60) title = 'Страж Интернета';
  else if (score >= 40) title = 'Исследователь сети';
  result.innerHTML = `<img src="assets/images/certificate.svg" alt="Награда за завершение теста"><p class="quiz-overline">ТВОЙ РЕЗУЛЬТАТ</p><h3>Отличная работа!</h3><div class="result-score">${score}<small> / 100</small></div><div class="result-stats"><span>✓ ${correctCount} правильных</span><span>↗ ${round.length - correctCount} неправильных</span></div><div class="result-badge">✦ ${title}</div><p>Знания помогают замечать риски и поддерживать безопасную атмосферу в сети.</p><div class="result-actions"><button class="button button-primary" type="button" id="retry-quiz">Пройти заново <span>↻</span></button><a class="button button-outline" href="index.html">Вернуться к плакату <span>↑</span></a></div>`;
  $('#retry-quiz', result).addEventListener('click', beginQuiz);
  result.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function beginQuiz() {
  startButton.disabled = true;
  startButton.textContent = 'Загружаем вопросы…';
  try {
    await loadQuestions();
    round = shuffle(allQuestions).slice(0, 10);
    questionIndex = 0;
    score = 0;
    correctCount = 0;
    renderQuestion();
  } catch (error) {
    $('.quiz-start', quizApp).hidden = false;
    $('.quiz-stage', quizApp).hidden = true;
    $('.quiz-result', quizApp).hidden = true;
    let message = $('.quiz-load-error', quizApp);
    if (!message) {
      message = document.createElement('p');
      message.className = 'quiz-load-error';
      message.setAttribute('role', 'alert');
      $('.quiz-start', quizApp).append(message);
    }
    message.textContent = `${error.message} Запусти проект через локальный веб-сервер, чтобы браузер мог загрузить JSON.`;
  } finally {
    startButton.disabled = false;
    startButton.innerHTML = 'Начать тест <span>→</span>';
  }
}

startButton.addEventListener('click', beginQuiz);
