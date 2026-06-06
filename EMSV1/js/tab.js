import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

  // --- إعداد Supabase (انسخ نفس القيم لديك) ---
  const SUPABASE_URL = 'https://ygfgsyzullfpibobxppj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZmdzeXp1bGxmcGlib2J4cHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTc0NDUsImV4cCI6MjA3MjgzMzQ0NX0.OqiLz5PYl4J4Mdk5NdRBWp5RxQE743ZBT0g52RS5I-c';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- عناصر DOM ---
  const phoneEl = document.getElementById('phone');
  const peopleEl = document.getElementById('people');
  const reserveBtn = document.getElementById('reserveBtn');
  const timeOpener = document.getElementById('timeOpener');
  const timeValue = document.getElementById('timeValue');
  const pickerBackdrop = document.getElementById('pickerBackdrop');
  const hoursWheel = document.getElementById('hoursWheel');
  const minsWheel = document.getElementById('minsWheel');
  const applyPicker = document.getElementById('applyPicker');
  const cancelPicker = document.getElementById('cancelPicker');
  const noReserveAlert = document.getElementById('noReserveAlert');
  const circleSent = document.getElementById('circleSent');
  const circleState = document.getElementById('circleState');
  const stateLabel = document.getElementById('stateLabel');

  // ===== إعدادات جديدة لحقل اليوم =====
  const dateOpener = document.getElementById('dateOpener');
  const dateValue = document.getElementById('dateValue');
  const daysWheel = document.getElementById('daysWheel');

  const DAYS_TO_SHOW = 10; // ← عدد الأيام المراد إظهارها (يمكنك تغييره؛ 10 يعني اليوم + 9 أيام لاحقة)

  let selectedDateISO = null; // سيخزن yyyy-mm-dd


  // حالة مختارة
  let allowedHours = []; // array of allowed hours in 0..23
  let selectedHour24 = null; // 0..23
  let selectedMin = null; // 0..59
  let infoRow = null;

  // poller محلي مركزي
  let localPoller = null;

  // مفتاح التخزين المحلي
  const LOCAL_RESERV_KEY = 'table_reservations_local_v1';

// دالة لتجنب هجمات XSS - تحويل الأحرف الخاصة
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// دالة لعرض التنبيه العصري (للأخطار)
    function showAlert(message, duration = 3000) {
      // إنصراف إذا كان هناك تنبيه مفتوح بالفعل
      if (document.querySelector('.custom-alert')) return;
      
      // إنشاء عنصر التنبيه
      const alertEl = document.createElement('div');
      alertEl.className = 'custom-alert error';
      alertEl.innerHTML = `
        <div class="alert-icon">!</div>
        <div class="alert-content">${escapeHtml(message)}</div>
      `;
      
      // إضافة التنبيه إلى الصفحة
      document.body.appendChild(alertEl);
      
      // عرض التنبيه مع تأثير
      setTimeout(() => {
        alertEl.classList.add('show');
      }, 10);
      
      // إخفاء التنبيه بعد المدة المحددة
      setTimeout(() => {
        alertEl.classList.remove('show');
        alertEl.classList.add('hide');
        
        // إزالة التنبيه من DOM بعد انتهاء الرسوم المتحركة
        setTimeout(() => {
          if (alertEl.parentNode) {
            alertEl.parentNode.removeChild(alertEl);
          }
        }, 300);
      }, duration);
    }


// دالة لعرض تنبيه النجاح العصري
function showSuccess(message, duration = 3000) {
  // إنصراف إذا كان هناك تنبيه مفتوح بالفعل
  if (document.querySelector('.custom-alert')) return;
  
  // إنشاء عنصر التنبيه
  const alertEl = document.createElement('div');
  alertEl.className = 'custom-alert success';
  alertEl.innerHTML = `
    <div class="alert-icon"></div>
    <div class="alert-content">${escapeHtml(message)}</div>
  `;
  
  // إضافة التنبيه إلى الصفحة
  document.body.appendChild(alertEl);
  
  // عرض التنبيه مع تأثير
  setTimeout(() => {
    alertEl.classList.add('show');
  }, 10);
  
  // إخفاء التنبيه بعد المدة المحددة
  setTimeout(() => {
    alertEl.classList.remove('show');
    alertEl.classList.add('hide');
    
    // إزالة التنبيه من DOM بعد انتهاء الرسوم المتحركة
    setTimeout(() => {
      if (alertEl.parentNode) {
        alertEl.parentNode.removeChild(alertEl);
      }
    }, 300);
  }, duration);
}




  // helper: تحويل 24 -> عرض 12 مع رمز صباح/م
  function format12(h24, m){
    const period = h24 < 12 ? 'ص' : 'م';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
  }

  // helper parse time string "HH:MM:SS" أو "HH:MM"
  function parseTime(t){
    if(!t) return null;
    const parts = t.split(':').map(p => parseInt(p,10));
    return {h:parts[0]||0, m: parts[1]||0};
  }

  function pad2(n){ return String(n).padStart(2,'0'); }
  function toISODate(d){
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }


  // عرض/إخفاء زر الإرسال بناء على reser_state
  function updateReserveUI(){
    if (!infoRow || infoRow.reser_state !== true){
      reserveBtn.style.display = 'none';
      noReserveAlert.style.display = 'block';
    } else {
      reserveBtn.style.display = 'block';
      noReserveAlert.style.display = 'none';
    }
  }

  // ---- وظائف التخزين المحلي ----
  function getLocalReservations(){
    try {
      return JSON.parse(localStorage.getItem(LOCAL_RESERV_KEY) || '[]');
    } catch(e){
      return [];
    }
  }

  function saveLocalReservationRow(row){
    // row: object returned by supabase insert (يحتوي id, phone_num, reser_time, people_num, state?)
    let arr = getLocalReservations().filter(r => r.id !== row.id);
    arr.unshift({
      id: row.id,
      phone_num: row.phone_num ?? row.phone,
      reser_time: row.reser_time,
      date: row.date ?? null,
      people_num: row.people_num,
      sentAt: Date.now(),
      state: (row.state === undefined) ? null : row.state
    });
    localStorage.setItem(LOCAL_RESERV_KEY, JSON.stringify(arr));
    updateStatusUI();
  }

  function updateLocalReservationState(id, state){
    let arr = getLocalReservations();
    const idx = arr.findIndex(r => r.id === id);
    if (idx !== -1){
      arr[idx].state = state;
      localStorage.setItem(LOCAL_RESERV_KEY, JSON.stringify(arr));
      updateStatusUI();
    }
  }

  function getLastLocalReservation(){
    const arr = getLocalReservations();
    return (arr && arr.length) ? arr[0] : null;
  }

  // يحدث دوائر الحالة بناءً على آخر حجز محلي
  function updateStatusUI(){
    const last = getLastLocalReservation();
    if (!last){
      circleSent.classList.remove('sent');
      circleState.classList.remove('sent','rejected');
      stateLabel.textContent = 'حالة القبول';
      return;
    }

    // اعتبر وجود سجل => تم إرسال (نُظهر الدائرة الأولى)
    circleSent.classList.add('sent');

    // حالة القبول حسب last.state
    circleState.classList.remove('sent','rejected');
    if (last.state === true){
      circleState.classList.add('sent'); // أخضر
      stateLabel.textContent = 'تم قبول الحجز';
    } else if (last.state === false){
      circleState.classList.add('rejected'); // أحمر
      stateLabel.textContent = 'تم رفض الحجز';
    } else {
      // لا شيء بعد (قيد الانتظار)
      stateLabel.textContent = 'قيد الانتظار';
    }
  }

  // poller مركزي يراجع كل الحجوزات المحلية المعلقة (state === null)
  function startLocalPendingPoller(){
    if (localPoller) return;
    localPoller = setInterval(async () => {
      const arr = getLocalReservations();
      // إذا لا يوجد معلقين — أوقف الدورية
      const pending = arr.filter(r => r.state === null || r.state === undefined);
      if (pending.length === 0){
        clearInterval(localPoller);
        localPoller = null;
        return;
      }

      for (const r of pending){
        try {
          const { data, error } = await supabase
            .from('table_reservations')
            .select('state')
            .eq('id', r.id)
            .single();

          if (!error && data){
            if (data.state !== null && data.state !== undefined){
              // حدث تغيير — خزّنه محلياً
              updateLocalReservationState(r.id, data.state);
            }
          }
        } catch(e){
          console.warn('local poll error', e);
        }
      }
    }, 3000);
  }

  // ملء العجلات بناء على allowedHours
  function populateDaysWheel(){
    daysWheel.innerHTML = '';
    const today = new Date();
    for (let i = 0; i < DAYS_TO_SHOW; i++){
      const dt = new Date(today);
      dt.setDate(today.getDate() + i); // هذا يعالج عبور الأشهر والسنة تلقائيًا
      const iso = toISODate(dt);
      const day = dt.getDate();
      const month = dt.getMonth() + 1;
      // عرض طويل للمستخدم (مثال: 'السبت 10 مايو') — يمكنك تغييره
      const longLabel = dt.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' });

      const el = document.createElement('div');
      el.dataset.iso = iso;
      el.dataset.day = String(day);
      el.dataset.month = String(month);
      el.textContent = longLabel;
      el.addEventListener('click', () => {
        selectedDateISO = el.dataset.iso;
        // تحديث بصري
        [...daysWheel.children].forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        // عرض مختصر كما طلبت (10/5)
        dateValue.textContent = `${el.dataset.day}/${el.dataset.month}`;
      });
      daysWheel.appendChild(el);
    }

    // اختيار افتراضي لليوم الأول إذا لم يحدد
    if (!selectedDateISO && daysWheel.children.length){
      const first = daysWheel.children[0];
      selectedDateISO = first.dataset.iso;
      first.classList.add('selected');
      dateValue.textContent = `${first.dataset.day}/${first.dataset.month}`;
    }
  }

  // حدث: تحديث عجلات كل شيء (ندعوها عند تحميل الإعدادات)
  function populateWheels(){
    hoursWheel.innerHTML = '';
    minsWheel.innerHTML = '';

    // ساعات: نعرض كل ساعة مسموح (24h value) لكن بشكل 12h + ص/م
    allowedHours.forEach(h=>{
      const el = document.createElement('div');
      el.textContent = (h % 12 === 0 ? 12 : h % 12) + ' ' + (h < 12 ? 'ص' : 'م');
      el.dataset.hour = String(h);
      el.addEventListener('click', ()=> {
        selectedHour24 = Number(el.dataset.hour);
        // update selection visuals
        [...hoursWheel.children].forEach(c=>c.classList.remove('selected'));
        el.classList.add('selected');
      });
      hoursWheel.appendChild(el);
    });

    // دقائق: 0..59 خطوة 5 دقائق
    for (let m=0;m<60;m+=5){
      const el = document.createElement('div');
      el.textContent = String(m).padStart(2,'0');
      el.dataset.min = String(m);
      el.addEventListener('click', ()=> {
        selectedMin = Number(el.dataset.min);
        [...minsWheel.children].forEach(c=>c.classList.remove('selected'));
        el.classList.add('selected');
      });
      minsWheel.appendChild(el);
    }

    // اختياري: اختر افتراضياً أول عنصر
    if (selectedHour24 === null && allowedHours.length>0){
      selectedHour24 = allowedHours[0];
      if (hoursWheel.children[0]) hoursWheel.children[0].classList.add('selected');
    }
    if (selectedMin === null){
      selectedMin = 0;
      if (minsWheel.children[0]) minsWheel.children[0].classList.add('selected');
    }
    // ensure timeValue reflects selection
    if (selectedHour24 !== null && selectedMin !== null){
      timeValue.textContent = format12(selectedHour24, selectedMin);
    }
  }


  // تحميل صف info من supabase
  async function loadInfo(){
    try{
      const { data, error } = await supabase.from('info').select('reser_time_from,reser_time_to,reser_state').single();
      if (error){
        console.error('load info error', error);
        // fallback محلي: ساعات تجريبية
        infoRow = null;
        allowedHours = Array.from({length:12}, (_,i)=>9+i); // 9..20 افتراضاً
        updateReserveUI();
        populateWheels();
        return;
      }
      infoRow = data;
      updateReserveUI();

      // parse allowed hours range
      const from = parseTime(infoRow.reser_time_from);
      const to = parseTime(infoRow.reser_time_to);
      if (!from || !to) {
        allowedHours = Array.from({length:12}, (_,i)=>9+i);
      } else {
        let start = from.h;
        let end = to.h;
        if (end < start) end = 23;
        allowedHours = [];
        for (let h=start; h<=end; h++){
          allowedHours.push(h);
        }
      }
      populateWheels();
    }catch(e){
      console.error('exception loadInfo', e);
    }
  }

  // فتح / إغلاق البيكر
  function openPicker(){
    pickerBackdrop.style.display = 'flex';
    setTimeout(()=> {
      const selHourEl = [...hoursWheel.children].find(c => c.classList.contains('selected'));
      if (selHourEl) selHourEl.scrollIntoView({block:'center'});
      const selMinEl = [...minsWheel.children].find(c => c.classList.contains('selected'));
      if (selMinEl) selMinEl.scrollIntoView({block:'center'});
    },60);
      setTimeout(()=> {
      const selDayEl = [...daysWheel.children].find(c => c.classList.contains('selected'));
      if (selDayEl) selDayEl.scrollIntoView({block:'center'});
      const selHourEl = [...hoursWheel.children].find(c => c.classList.contains('selected'));
      if (selHourEl) selHourEl.scrollIntoView({block:'center'});
      const selMinEl = [...minsWheel.children].find(c => c.classList.contains('selected'));
      if (selMinEl) selMinEl.scrollIntoView({block:'center'});
    },60);

  }
  function closePicker(){
    pickerBackdrop.style.display = 'none';
  }

  // عند تأكيد البيكر: نحط القيمة في العرض
  applyPicker.addEventListener('click', ()=>{
    if (selectedHour24 === null || selectedMin === null){
      showAlert('اختر ساعة ودقيقة صالحتين');
      return;
    }
    if (!selectedDateISO){
      showAlert('اختر اليوم أولاً');
      return;
    }

    // عرض الوقت المختار
    timeValue.textContent = format12(selectedHour24, selectedMin);

    // عرض التاريخ المختصر (مثال: 10/5)
    const [y, m, d] = selectedDateISO.split('-');
    dateValue.textContent = `${Number(d)}/${Number(m)}`;

    closePicker();
  });

  cancelPicker.addEventListener('click', ()=> closePicker());

  // فتح البيكر عند الضغط
  timeOpener.addEventListener('click', openPicker);
  timeOpener.addEventListener('keydown', (e)=> { if(e.key==='Enter'||e.key===' ') openPicker(); });
  dateOpener.addEventListener('click', openPicker);
  dateOpener.addEventListener('keydown', (e)=> { if(e.key==='Enter'||e.key===' ') openPicker(); });

  // التحقق من صحة رقم الهاتف (يعتمد على المطلوب: يبدأ ب09 ويحتوي 10 أرقام)
  function validPhone(p){
    return /^09\d{8}$/.test(p);
  }

  // وظيفة إرسال الحجز (محدث مع التأثيرات الجديدة)
reserveBtn.addEventListener('click', async ()=>{
  const phone = (phoneEl.value || '').trim();
  const people = Number((peopleEl.value || '').trim());
  if (!validPhone(phone)){
    showAlert('الرجاء إدخال رقم هاتف صحيح يبدأ بـ 09 ويتألف من 10 أرقام.');
    phoneEl.focus();
    return;
  }
  if (selectedHour24 === null || selectedMin === null){
    showAlert('الرجاء اختيار وقت الحجز.');
    openPicker();
    return;
  }
  if (!people || people <= 0){
    showAlert('الرجاء إدخال عدد الأشخاص بشكل صحيح.');
    peopleEl.focus();
    return;
  }

  // تحويل الوقت إلى 24h string "HH:MM:SS"
  const hh = String(selectedHour24).padStart(2,'0');
  const mm = String(selectedMin).padStart(2,'0');
  const time24 = `${hh}:${mm}:00`;

  try {
    // تطبيق تأثير الإرسال
    applyReserveSendingEffect();

    // تأكد من وجود تاريخ محدد
    if (!selectedDateISO){
      showAlert('اختر يوم الحجز أولاً');
      openPicker();
      return;
    }

    const payload = {
      phone_num: phone,
      reser_time: time24,
      people_num: people,
      date: selectedDateISO
    };

    // محاكاة التأثير لمدة 1.5 ثانية (يمكن إزالته لاحقاً)
    setTimeout(async () => {
      const { data, error } = await supabase.from('table_reservations').insert(payload).select().single();

      if (error){
        console.error('insert reservation error', error);
        showAlert('حدث خطأ أثناء إرسال الحجز، حاول لاحقاً.');
        removeReserveSendingEffect();
        return;
      }

      // حفظ محلياً
      saveLocalReservationRow(data);

      // اضاءة الدائرة الأولى مباشرة
      circleSent.classList.add('sent');

      // شغل poller مركزي
      startLocalPendingPoller();

      // تطبيق تأثير النجاح
      applyReserveSuccessEffect();
      
      showSuccess('تم إرسال طلب الحجز بنجاح، سيتم إبلاغك فور تحديث الحالة.');

      // إعادة تعيين النموذج بعد النجاح
      setTimeout(() => {
        removeReserveSendingEffect();
        // تنظيف الحقول (اختياري)
        phoneEl.value = '';
        peopleEl.value = '';
        selectedDateISO = null;
        selectedHour24 = null;
        selectedMin = null;
        dateValue.textContent = '— اختر يوماً —';
        timeValue.textContent = '— اختر وقتاً —';
      }, 3000);

    }, 1500);

  } catch (err) {
    console.error('exception send', err);
    showAlert('حصل خطأ أثناء الإرسال.');
    removeReserveSendingEffect();
  }
});

  // --- تقييد الحقول: السماح بالأرقام فقط في الحقل الهاتف + الناس
  phoneEl.addEventListener('input', (e)=>{
    const cleaned = (e.target.value || '').replace(/[^\d]/g,'');
    e.target.value = cleaned.slice(0,10);
  });
  peopleEl.addEventListener('input',(e)=>{
    e.target.value = e.target.value.replace(/[^\d]/g,'').slice(0,3);
  });

  // تحميل إعدادات info عند بداية الصفحة ثم استئناف poller المحلي وتحديث الواجهة
  await loadInfo();

  populateDaysWheel();
  // تحديث واجهة الحالة بحسب أي بيانات محلية محفوظة واستئناف poller إن لزم
  updateStatusUI();
  startLocalPendingPoller();

  // accessibility: close picker if user clicks backdrop area
  pickerBackdrop.addEventListener('click', (ev)=>{
    if (ev.target === pickerBackdrop) closePicker();
  });


  // دالة لتطبيق تأثير الإرسال على زر الحجز
function applyReserveSendingEffect() {
  const reserveBtn = document.getElementById('reserveBtn');
  const btnText = reserveBtn.querySelector('.btn-text');
  const btnIcon = reserveBtn.querySelector('.btn-icon');
  
  // تطبيق تأثير الإرسال
  reserveBtn.classList.add('sending');
  reserveBtn.disabled = true;
}

// دالة لإزالة تأثير الإرسال
function removeReserveSendingEffect() {
  const reserveBtn = document.getElementById('reserveBtn');
  reserveBtn.classList.remove('sending');
  reserveBtn.disabled = false;
}

// دالة لتطبيق تأثير النجاح
function applyReserveSuccessEffect() {
  const reserveBtn = document.getElementById('reserveBtn');
  reserveBtn.classList.remove('sending');
  reserveBtn.classList.add('success');
  
  // إعادة الزر إلى حالته الأصلية بعد 3 ثوانٍ
  setTimeout(() => {
    reserveBtn.classList.remove('success');
  }, 3000);
}