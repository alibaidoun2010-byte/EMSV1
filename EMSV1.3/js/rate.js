import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
    const SUPABASE_URL = 'https://ygfgsyzullfpibobxppj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZmdzeXp1bGxmcGlib2J4cHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTc0NDUsImV4cCI6MjA3MjgzMzQ0NX0.OqiLz5PYl4J4Mdk5NdRBWp5RxQE743ZBT0g52RS5I-c';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let selectedStars = 0;

const starsWrap = document.getElementById('starsWrap');
const starsHint = document.getElementById('starsHint');
const form = document.getElementById('rateForm');
const submitBtn = document.getElementById('rateSubmit');

const HINTS = {
  1: 'سيئ',
  2: 'مقبول',
  3: 'جيد',
  4: 'جيد جداً',
  5: 'ممتاز'
};

// اختيار النجوم
starsWrap.querySelectorAll('.star').forEach(star => {
  const value = Number(star.dataset.value);

  star.addEventListener('click', () => {
    selectedStars = value;
    paintStars(selectedStars);
    starsHint.textContent = HINTS[value] || '';
  });

  star.addEventListener('mouseenter', () => paintStars(value));
  star.addEventListener('mouseleave', () => paintStars(selectedStars));
});

function paintStars(count) {
  starsWrap.querySelectorAll('.star').forEach(star => {
    star.classList.toggle('filled', Number(star.dataset.value) <= count);
  });
}

// إرسال التقييم
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('rateName').value.trim();
  const feedback = document.getElementById('rateFeedback').value.trim();

  if (!name) {
    showAlert('الرجاء إدخال الاسم');
    return;
  }

  if (!selectedStars) {
    showAlert('الرجاء اختيار عدد النجوم');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'جارٍ الإرسال...';

  try {
    const { error } = await supabase
      .from('ratings')
      .insert([{ name, stars: selectedStars, feedback }]);

    if (error) {
      console.error('خطأ في حفظ التقييم:', error);
      showAlert('تعذر إرسال التقييم، حاول مرة أخرى');
      return;
    }

    showSuccess('شكراً لك! تم إرسال تقييمك بنجاح');
    form.reset();
    selectedStars = 0;
    paintStars(0);
    starsHint.textContent = 'اختر عدد النجوم';

  } catch (err) {
    console.error('خطأ غير متوقع:', err);
    showAlert('حدث خطأ غير متوقع');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'إرسال التقييم';
  }
});

// دالة لعرض التنبيه العصري (للأخطار)
function showAlert(message, duration = 3000) {
  if (document.querySelector('.custom-alert')) return;

  const alertEl = document.createElement('div');
  alertEl.className = 'custom-alert error';
  alertEl.innerHTML = `
    <div class="alert-icon">!</div>
    <div class="alert-content">${escapeHtml(message)}</div>
  `;

  document.body.appendChild(alertEl);
  setTimeout(() => alertEl.classList.add('show'), 10);

  setTimeout(() => {
    alertEl.classList.remove('show');
    alertEl.classList.add('hide');
    setTimeout(() => alertEl.remove(), 300);
  }, duration);
}

// دالة لعرض تنبيه النجاح العصري
function showSuccess(message, duration = 3000) {
  if (document.querySelector('.custom-alert')) return;

  const alertEl = document.createElement('div');
  alertEl.className = 'custom-alert success';
  alertEl.innerHTML = `
    <div class="alert-icon"></div>
    <div class="alert-content">${escapeHtml(message)}</div>
  `;

  document.body.appendChild(alertEl);
  setTimeout(() => alertEl.classList.add('show'), 10);

  setTimeout(() => {
    alertEl.classList.remove('show');
    alertEl.classList.add('hide');
    setTimeout(() => alertEl.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
