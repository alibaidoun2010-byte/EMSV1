import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
    const SUPABASE_URL = 'https://ygfgsyzullfpibobxppj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZmdzeXp1bGxmcGlib2J4cHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTc0NDUsImV4cCI6MjA3MjgzMzQ0NX0.OqiLz5PYl4J4Mdk5NdRBWp5RxQE743ZBT0g52RS5I-c';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // جلب الطلب المخزن محلياً
    const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const savedOrder = allOrders.length > 0 ? allOrders[allOrders.length - 1] : null;

    const container = document.getElementById("orderContainer");


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





    // عرض الطلب كبطاقات مع الصور
    async function renderOrderWithImages(order) {
      container.innerHTML = '';
      if (!order || !Array.isArray(order.items) || order.items.length === 0) {
        container.innerHTML = "<p style='color:#777;'>لا يوجد طلب محفوظ للتقييم.</p>";
        return;
      }

      for (const it of order.items) {
        let imgSrc = 'https://via.placeholder.com/70';

        // جلب الصورة من Supabase حسب id أو الاسم
        try {
          if (typeof it.id === 'number') {
            const { data } = await supabase.from('menu_items').select('image_url').eq('id', it.id).single();
            if (data?.image_url) imgSrc = data.image_url;
          } else if (typeof it.id === 'string' && it.id.startsWith('offer-')) {
            const offerId = Number(it.id.split('-')[1]);
            const { data } = await supabase.from('offers').select('image_url').eq('id', offerId).single();
            if (data?.image_url) imgSrc = data.image_url;
          } else {
            const baseName = (it.name || '').split(' (')[0].trim();
            const { data } = await supabase.from('menu_items').select('image_url').ilike('name', `%${baseName}%`).limit(1).single();
            if (data?.image_url) imgSrc = data.image_url;
          }
        } catch (e) {
          console.warn("تعذر جلب صورة:", e);
        }

        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
          <img src="${imgSrc}" alt="${escapeHtml(it.name)}">
          <div class="order-info">
            <h3>${escapeHtml(it.name)}</h3>
            <p>الكمية: ${escapeHtml(String(it.qty || '1'))}</p>
          </div>
        `;
        container.appendChild(card);
      }
    }

    // escape
    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    // ⭐ النجوم
    const starsContainer = document.getElementById("starsContainer");
    let currentRating = 0;
    for (let i = 5; i >= 1; i--) {
      const star = document.createElement("span");
      star.className = "star";
      star.textContent = "★";
      star.dataset.value = i;
      star.addEventListener("click", () => {
        currentRating = i;
        updateStars();
      });
      starsContainer.appendChild(star);
    }

    function updateStars() {
      document.querySelectorAll(".star").forEach(star => {
        star.classList.toggle("active", Number(star.dataset.value) <= currentRating);
      });
    }

    // زر إرسال التقييم
document.getElementById("sendReviewBtn").addEventListener("click", async () => {
  const notes = document.getElementById("reviewNotes").value.trim();

  if (!savedOrder || !savedOrder.id) {
    showAlert("لم يتم العثور على رقم الطلب لحفظ التقييم.");
    return;
  }

  // التحقق من وجود تقييم
  if (currentRating === 0) {
    showAlert("يرجى اختيار تقييم بالنجوم قبل الإرسال.");
    return;
  }

  // تطبيق تأثير الإرسال
  applySendingEffect();

  // محاكاة التأثير لمدة 1.5 ثانية (يمكن إزالته لاحقاً)
  setTimeout(async () => {
    try {
      // تحديث الطلب في قاعدة البيانات
      const { error } = await supabase
        .from('orders')
        .update({
          rates: currentRating,
          review: notes
        })
        .eq('id', savedOrder.id);

      if (error) {
        console.error("خطأ أثناء تحديث التقييم:", error);
        showAlert("حصل خطأ أثناء إرسال التقييم.");
        removeSendingEffect();
      } else {
        console.log("تم تحديث التقييم بنجاح:", { rating: currentRating, notes });
        
        // تطبيق تأثير النجاح
        applySuccessEffect();
        showSuccess("شكراً على تقييمك!");
        
        // إعادة تعيين النموذج
        document.getElementById("reviewNotes").value = "";
        currentRating = 0;
        updateStars();
        
        // إزالة تأثير النجاح بعد 3 ثوانٍ
        setTimeout(() => {
          removeSendingEffect();
        }, 3000);
      }
    } catch (error) {
      console.error("خطأ غير متوقع:", error);
      showAlert("حصل خطأ غير متوقع.");
      removeSendingEffect();
    }
  }, 1500);
});


    // تنفيذ العرض
    renderOrderWithImages(savedOrder);

    // دالة لتطبيق تأثير الإرسال
function applySendingEffect() {
  const sendBtn = document.getElementById('sendReviewBtn');
  const btnText = sendBtn.querySelector('.btn-text');
  const btnIcon = sendBtn.querySelector('.btn-icon');
  
  // تطبيق تأثير الإرسال
  sendBtn.classList.add('sending');
  sendBtn.disabled = true;
}

// دالة لإزالة تأثير الإرسال
function removeSendingEffect() {
  const sendBtn = document.getElementById('sendReviewBtn');
  sendBtn.classList.remove('sending');
  sendBtn.disabled = false;
}

// دالة لتطبيق تأثير النجاح
function applySuccessEffect() {
  const sendBtn = document.getElementById('sendReviewBtn');
  sendBtn.classList.remove('sending');
  sendBtn.classList.add('success');
  
  // إعادة الزر إلى حالته الأصلية بعد 3 ثوانٍ
  setTimeout(() => {
    sendBtn.classList.remove('success');
  }, 3000);
}