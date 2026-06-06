import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
    const SUPABASE_URL = 'https://ygfgsyzullfpibobxppj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZmdzeXp1bGxmcGlib2J4cHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTc0NDUsImV4cCI6MjA3MjgzMzQ0NX0.OqiLz5PYl4J4Mdk5NdRBWp5RxQE743ZBT0g52RS5I-c';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    

    // حفظ حالة العناصر المختارة (عبر التنقل بين القوائم)
    // structure: { "<itemId>": { name, qty, price, selected: true|false } }
    const selectedItemsState = {};

    // ===== إضافات للعروض الاختيارية =====
    const offerSelectionsState = {}; // { [offerId]: { [itemId]: { name, qty } } }
    let currentOpenOfferId = null;   // رقم العرض المفتوح حاليًا في نافذة الاختيار (أو null)
    let currentOfferData = null;     // يخزن كائن العرض عند فتح النافذة
    let offerPickerElements = null;  // مرجع لعناصر النافذة إذا كانت مفتوحة

    
    

    // شاشة البداية + إظهار الواجهة
    setTimeout(async () => {
      
    
      document.getElementById('splash').style.display = 'none';
      const main = document.getElementById('main');
      main.style.display = 'block';
       

      // إظهار زر الطلبي بعد أن تختفي شاشة البداية
      const orderBtn = document.getElementById('orderBtn');
      if (orderBtn) {
        orderBtn.classList.add('show');
        updateCartBadge(); // تحديث العداد أول مرة
      }
      if (orderBtn) orderBtn.classList.add('show');
      setTimeout(() => main.style.opacity = '1', 50);
      await loadAndRenderCategories(); // load categories and first menu
      
    }, 3000);

    
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




    // القِائمة الجانبية
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const menuBtn = document.querySelector('.menu-btn');
      sidebar.classList.toggle('open');
      menuBtn.classList.toggle('open'); // لتفعيل حركة الخطوط
    }
    // توفير الدالة للنطاق العام (important when using type="module")
    window.toggleSidebar = toggleSidebar;

    

    // عناصر DOM
    const tabsContainer = document.getElementById('tabsContainer');
    const indicator = document.getElementById('tabsIndicator');
    const content = document.getElementById('content');
    const emptyHint = document.getElementById('emptyHint');

    // جلب القوائم من Supabase
    async function fetchCategories() {
      const { data, error } = await supabase.from('categories').select('*').order('id');
      if (error) { console.error('fetchCategories:', error); return []; }
      return data || [];
    }

    // 🔹 جديد: جلب العروض
    async function fetchOffers() {
      const { data, error } = await supabase.from('offers').select('*').order('id');
      if (error) { console.error('fetchOffers:', error); return []; }
      return data || [];
    }


    async function fetchMenuItems(catId) {
      const { data, error } = await supabase.rpc('get_menu_sorted', {
        order_type: 'weekly' // أو 'monthly' حسب الحالة
      });
      if (error) { console.error('fetchMenuItems:', error); return []; }
      // فلترة النتائج عشان تجيب عناصر الفئة المطلوبة فقط
      return data.filter(it => it.category_id === catId);
    }


    

    // إنشاء التبويبات ديناميكياً
async function loadAndRenderCategories() {
  tabsContainer.innerHTML = ''; // clear
  tabsContainer.appendChild(indicator); // re-attach indicator

  const cats = await fetchCategories();

  // ✨ تعديل جديد: ترتيب بحيث "العروض" أولاً
  const offersCat = cats.find(c => c.name === 'العروض');
  const otherCats = cats.filter(c => c.name !== 'العروض');
  const sortedCats = offersCat ? [offersCat, ...otherCats] : cats;

  if (!cats || cats.length === 0) {
    emptyHint.textContent = 'لا توجد قوائم حالياً.';
    return;
  }
  
  emptyHint.style.display = 'none';
  
  sortedCats.forEach((cat, idx) => {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.catId = cat.id;
    
    // إنشاء محتوى التبويب مع الأيقونة
    const tabContent = document.createElement('div');
    tabContent.style.display = 'flex';
    tabContent.style.alignItems = 'center';
    tabContent.style.gap = '8px';
    
    // إضافة الأيقونة إذا كانت موجودة
    if (cat.icon_url) {
      const icon = document.createElement('img');
      icon.className = 'tab-icon';
      icon.src = cat.icon_url;
      icon.alt = cat.name;
      icon.style.width = '20px';
      icon.style.height = '20px';
      tabContent.appendChild(icon);
    }
    
    // إضافة اسم الفئة
    const nameSpan = document.createElement('span');
    nameSpan.textContent = cat.name;
    tabContent.appendChild(nameSpan);
    
    tab.appendChild(tabContent);
    
    if (idx === 0) tab.classList.add('active');
    
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      moveIndicator(tab);
      await renderMenuForCategory(cat.id);
    });
    
    tabsContainer.appendChild(tab);
  });

  // small delay to ensure layout, then move indicator & render first category
  setTimeout(async () => {
    const active = document.querySelector('.tab.active');
    const initialOffset = 20; // عدد البيكسلات
    
    if (active) moveIndicator(active);
    
    const firstCatId = sortedCats[0]?.id;
    if (firstCatId) await renderMenuForCategory(firstCatId);
  }, 100);
}

    // تحريك المؤشر البرتقالي
// تحريك المؤشر البرتقالي
function moveIndicator(activeTab) {
  // الحصول على عرض المؤشر الحالي
  const indicatorWidth = indicator.offsetWidth || 0;

  // استخدام scrollWidth للنص داخل التبويب
  const textWidth = activeTab.scrollWidth;

  // حساب مركز النص بالنسبة لحاوية التبويبات
  const textCenter = activeTab.offsetLeft + (textWidth / 2);

  // وضع منتصف المؤشر على منتصف النص
  indicator.style.width = `${textWidth}px`; // إذا أردت أن يكون بعرض النص
  indicator.style.left = `${textCenter - textWidth / 2}px`; // منتصف المؤشر = منتصف النص

  // تمرير الشريط بحيث يظهر التبويب في منتصف الشاشة
  const containerWidth = tabsContainer.offsetWidth;
  const scrollPos = activeTab.offsetLeft - (containerWidth / 2) + (activeTab.offsetWidth / 2);
  tabsContainer.scrollTo({ left: scrollPos, behavior: 'smooth' });
}

let currentCatId = null;

    async function renderMenuForCategory(catId) {
      // خزّن رقم القائمة الحالية
      currentCatId = catId;

      // امسح المحتوى فورًا عند الضغط
      content.innerHTML = "<p>جارٍ التحميل...</p>";

      const activeTab = document.querySelector(`.tab[data-cat-id="${catId}"]`);
      const isOffersTab = activeTab && activeTab.textContent.trim() === 'العروض';

      const items = isOffersTab ? await fetchOffers() : await fetchMenuItems(catId);

      // 🔴 إذا تغيرت القائمة أثناء التحميل لا تكمل
      if (currentCatId !== catId) return;

      // الآن امسح مرة أخرى قبل الرسم
      content.innerHTML = "";

      if (!items || items.length === 0) {
        content.innerHTML = `<p style="color:#666;">لا توجد عناصر في هذه القائمة.</p>`;
        return;
      }

      items.forEach((it, i) => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.style.animationDelay = `${i * 70}ms`;

        // مفتاح مميز: يمنع تعارض id بين offers و menu_items
        const key = (isOffersTab ? 'offer-' : 'item-') + it.id;
        const state = selectedItemsState[key];
        const selQty = (state && state.qty) ? state.qty : 1;
        const isSelected = !!(state && state.selected);

        if (isSelected) div.classList.add('selected');

        // تأكد من أن ال-state موجود وبهيكلية مناسبة
        if (!selectedItemsState[key]) {
          selectedItemsState[key] = {
            name: it.name,
            qty: selQty,
            price: it.price ?? null,
            selected: isSelected,
            isOffer: !!isOffersTab,
            offerId: isOffersTab ? it.id : null,
            allowed_items_count: isOffersTab ? (it.allowed_items_count ? Number(it.allowed_items_count) : null) : null,
            type: isOffersTab ? (it.type || 'optional') : null // 🔹 جديد: حفظ نوع العرض
          };
        } else {
          // حدث بعض الحقول لضمان التناغم
          selectedItemsState[key].name = it.name;
          selectedItemsState[key].price = it.price ?? null;
          selectedItemsState[key].isOffer = !!isOffersTab;
          selectedItemsState[key].offerId = isOffersTab ? it.id : null;
          selectedItemsState[key].allowed_items_count = isOffersTab ? (it.allowed_items_count ? Number(it.allowed_items_count) : null) : null;
          selectedItemsState[key].type = isOffersTab ? (it.type || 'optional') : null; // 🔹 جديد: تحديث نوع ا
        }

        // HTML مختلف للعروض
        if (isOffersTab) {
          const hasImage = !!it.image_url;

          // هنا نحدد الزر حسب النوع
          const chooseButtonHtml = (it.type === 'optional') 
            ? `<button class="offer-choose-btn">اختيار <span class="chev">▾</span></button>`
            : '';

          div.innerHTML = `<div class="offer-card">
            ${hasImage ? `<img src="${it.image_url}" alt="${escapeHtml(it.name)}">` : ''}
            <div class="offer-info">
              <h2>${escapeHtml(it.name)}</h2>
              <p class="desc">${escapeHtml(it.description || '')}</p>
              <p class="price">${formatPrice(it.price)}</p>
              ${chooseButtonHtml}
            </div>
            <div class="quantity-control">
              <button class="quantity-btn minus">-</button>
              <span class="quantity">${selQty}</span>
              <button class="quantity-btn plus">+</button>
            </div>
          </div>`;
        }


         else {
          const imageSrc = it.image_url || 'https://via.placeholder.com/80';
          div.innerHTML = `
            <img src="${imageSrc}" alt="${escapeHtml(it.name)}">
            <div class="menu-info">
              <h3>${escapeHtml(it.name)}</h3>
              <p>${formatPrice(it.price)}</p>
            </div>
            <div class="quantity-control">
              <button class="quantity-btn minus">-</button>
              <span class="quantity">${selQty}</span>
              <button class="quantity-btn plus">+</button>
            </div>
          `;
        }

        // ربط الأزرار والحدث لفتح نافذة الاختيار
        const plus = div.querySelector('.plus');
        const minus = div.querySelector('.minus');
        const qty = div.querySelector('.quantity');

        plus.addEventListener('click', (e) => {
          e.stopPropagation();
          let q = parseInt(qty.textContent) || 1;
          q++;
          qty.textContent = q;
          selectedItemsState[key].qty = q;

          // 🔹 محدث: إذا كان هذا عرضًا وتم فتح نافذة الاختيار، حدث جميع العدادات
          if (selectedItemsState[key].isOffer && currentOpenOfferId === selectedItemsState[key].offerId) {
            updateAllCategoryCounters(currentOfferData);
          }

          // 🔹 محدث: تحديث العداد بعد الإضافة
          updateCategoryCounter(containerEl, offer, catId);
          
          // 🔹 جديد: تحديث حالة زر الحفظ مباشرة
          updateSaveButtonState(offer);
        });

        minus.addEventListener('click', (e) => {
          e.stopPropagation();
          let q = parseInt(qty.textContent) || 1;
          if (q > 1) {
            q--;
            qty.textContent = q;
            selectedItemsState[key].qty = q;

            // 🔹 محدث: إذا كان هذا عرضًا وتم فتح نافذة الاختيار، حدث جميع العدادات
            if (selectedItemsState[key].isOffer && currentOpenOfferId === selectedItemsState[key].offerId) {
              updateAllCategoryCounters(currentOfferData);
            }
          }

          // 🔹 محدث: تحديث العداد بعد الحذف
          updateCategoryCounter(containerEl, offer, catId);
          
          // 🔹 جديد: تحديث حالة زر الحفظ مباشرة
          updateSaveButtonState(offer);
        });

        // click to select/deselect (ignore plus/minus)
        div.addEventListener('click', (e) => {
          if (e.target.classList.contains('plus') || e.target.classList.contains('minus') || e.target.classList.contains('offer-choose-btn')) return;
          
          // 🔹 تم التعديل: إلغاء فتح نافذة الاختيار عند الضغط على البطاقة
          // السلوك العادي للعروض والعناصر العادية
          div.classList.toggle('selected');
          const nowSelected = div.classList.contains('selected');
          selectedItemsState[key].selected = nowSelected;
          selectedItemsState[key].qty = parseInt(qty.textContent) || 1;
        });


        // ربط زر "اختيار" لفتح نافذة الاختيار (للعروض)
        const chooseBtn = div.querySelector('.offer-choose-btn');
        if (chooseBtn) {
          chooseBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // تحديد البطاقة لو مش محددة
            if (!div.classList.contains('selected')) {
              div.classList.add('selected');
              selectedItemsState[key].selected = true;
            }

            // حفظ مرجع العرض (it) كمصدر بيانات عند فتح النافذة
            openOfferPicker(it); // دالة سنضيفها بعد قليل
            chooseBtn.classList.toggle('open');
          });
        }

        content.appendChild(div);
      });
    }


    // ===== دوال نافذة اختيار عناصر العرض =====

    function sumOfferSelections(offerId) {
      const map = offerSelectionsState[offerId] || {};
      return Object.values(map).reduce((s, o) => s + (o.qty || 0), 0);
    }

    function updateOfferPickerCounter(offerId) {
      // 🔹 لم نعد نستخدم العداد العام، لذا يمكن حذف هذه الدالة أو تركها فارغة
      // نحن الآن نستخدم العدادات الخاصة بكل فئة
    }

    async function openOfferPicker(offer) {
      // احفظ حالة العرض المفتوح
      currentOpenOfferId = offer.id;
      currentOfferData = offer;
      if (!offerSelectionsState[offer.id]) offerSelectionsState[offer.id] = {};

      // أنشئ عناصر النافذة (backdrop + dialog) إن لم تكن موجودة
      // سننشئ DOM جديد ونحتفظ بمراجع في offerPickerElements
      const backdrop = document.createElement('div');
      backdrop.className = 'offer-picker-backdrop';

      

      const picker = document.createElement('div');
      picker.className = 'offer-picker';
      picker.innerHTML = `
        <div class="header">
          <div class="title">${escapeHtml(offer.name)}</div>
          <!-- تم حذف العداد العام -->
        </div>
        <div class="body">
          <div class="tabs-col" id="offerPickerTabs"></div>
          <div class="content-col" id="offerPickerContent"></div>
        </div>
        <div class="footer">
          <button class="close-btn">إغلاق</button>
          <button class="apply-btn">حفظ</button>
        </div>
      `;

      document.body.appendChild(backdrop);
      document.body.appendChild(picker);
      offerPickerElements = picker;

      // إغلاق بالنقر على backdrop أو زر إغلاق
      
      picker.querySelector('.close-btn').addEventListener('click', () => { closeOfferPicker(); });
      picker.querySelector('.apply-btn').addEventListener('click', () => { 
        // 🔹 تحقق مبسط قبل الحفظ
        if (!isOfferComplete(offer)) {
          showAlert('يرجى إكمال جميع اختيارات العرض قبل الحفظ');
          return;
        }
        
        // 🔹 تم التعديل: إغلاق النافذة فقط دون إلغاء الاختيارات (لأننا نحفظ)
        if (!offerPickerElements) return;
        const backdrop = document.querySelector('.offer-picker-backdrop');
        if (backdrop) backdrop.remove();
        offerPickerElements.remove();
        offerPickerElements = null;
        currentOpenOfferId = null;
        currentOfferData = null;
        
        // 🔹 جديد: إظهار رسالة نجاح
        showSuccess('تم حفظ اختيارات العرض بنجاح!');
        
        // 🔹 جديد: تحديث الواجهة بعد الحفظ
        setTimeout(() => {
          const activeTab = document.querySelector('.tab.active');
          if (activeTab) {
            renderMenuForCategory(Number(activeTab.dataset.catId));
          }
        }, 100);
      });
      
      // 🔹 محدث: تحميل الفئات المسموحة مع الأخذ بالاعتبار الهيكل الجديد
      const allCats = await fetchCategories();
      let pickerCats = [];

      if (offer.allowed_categories && Array.isArray(offer.allowed_categories) && offer.allowed_categories.length) {
        // 🔹 الهيكل الجديد: [{category_id: X, allowed_items: Y}, ...]
        const allowedCategoryIds = offer.allowed_categories.map(cat => 
          cat.category_id || cat.id // دعم لكلا الشكلين للتوافق
        ).filter(id => id != null);
        
        pickerCats = allCats.filter(c => allowedCategoryIds.includes(c.id));
        
        // 🔹 جديد: إضافة العداد لكل تبويب
        pickerCats.forEach(cat => {
          const allowedItems = getAllowedItemsForCategory(offer, cat.id);
          const usedItems = calculateUsedItemsInCategory(offer.id, cat.id);
          const remaining = allowedItems === Infinity ? '∞' : Math.max(allowedItems - usedItems, 0);
          
          // إضافة العداد إلى اسم التبويب
          cat.displayName = `${cat.name} (${remaining})`;
        });
      } else {
        pickerCats = allCats;
      }



      const tabsContainerLocal = picker.querySelector('#offerPickerTabs');
      const contentContainerLocal = picker.querySelector('#offerPickerContent');

      tabsContainerLocal.innerHTML = '';
      contentContainerLocal.innerHTML = '<div class="muted">جارٍ تحميل العناصر...</div>';

      
      // 🔹 محدث: إنشاء تبويبات مع العداد
      pickerCats.forEach((cat, idx) => {
        const t = document.createElement('div');
        t.className = 'picker-tab';
        
        // 🔹 استخدام الاسم المعروض الذي يحتوي على العداد
        t.textContent = cat.displayName || cat.name;
        t.dataset.catId = cat.id;
        t.addEventListener('click', async () => {
          tabsContainerLocal.querySelectorAll('.picker-tab').forEach(x => x.classList.remove('active'));
          t.classList.add('active');
          await renderOfferPickerCategoryItems(offer, cat.id, contentContainerLocal);
        });
        tabsContainerLocal.appendChild(t);
        if (idx === 0) t.click();
      });


      // حدّث العداد أول مرة
      updateOfferPickerCounter(offer.id);
      updateAllCategoryCounters(offer);
      updateSaveButtonState(offer);
    }

async function renderOfferPickerCategoryItems(offer, catId, containerEl) {
  containerEl.innerHTML = '<div class="muted">جارٍ تحميل العناصر...</div>';
  const items = await fetchMenuItems(catId);
  if (!items || items.length === 0) {
    containerEl.innerHTML = `<p style="color:#666;">لا توجد عناصر في هذه القائمة.</p>`;
    return;
  }
  
  // 🔹 جديد: حساب العدد المسموح لهذه الفئة
  const allowedForThisCategory = getAllowedItemsForCategory(offer, catId);
  
  // 🔹 جديد: حساب العدد المستخدم حاليًا في هذه الفئة
  const currentUsedInCategory = calculateUsedItemsInCategory(offer.id, catId);
  
  // 🔹 جديد: العدد المتبقي
  const remainingInCategory = allowedForThisCategory - currentUsedInCategory;
  
  containerEl.innerHTML = '';
  
  // 🔹 جديد: إضافة عداد الفئة في الأعلى
  const categoryCounter = document.createElement('div');
  categoryCounter.className = 'category-counter';
  categoryCounter.style.cssText = `
    background: #f8f9fa;
    padding: 8px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    text-align: center;
    border: 1px solid #e9ecef;
    font-weight: bold;
    color: ${remainingInCategory > 0 ? '#1976d2' : '#e53935'};
  `;
  categoryCounter.innerHTML = `العدد المتبقي في هذه الفئة: <span style="font-size: 18px;">${remainingInCategory}</span>`;
  containerEl.appendChild(categoryCounter);

  items.forEach(it => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'menu-item';
    
    const currentQty = (offerSelectionsState[offer.id] && offerSelectionsState[offer.id][it.id]) ? 
      offerSelectionsState[offer.id][it.id].qty : 0;
    
    // 🔹 محدث: التحقق مما إذا كان العنصر متاحًا للاختيار مع السماح للعناصر المختارة
    const isItemAvailable = remainingInCategory > 0 || currentQty > 0;
    
    itemDiv.innerHTML = `
      <img src="${it.image_url || 'https://via.placeholder.com/80'}" alt="${escapeHtml(it.name)}">
      <div class="menu-info">
        <h3>${escapeHtml(it.name)}</h3>
      </div>
      <div class="quantity-control">
        <button class="quantity-btn minus" ${currentQty === 0 ? 'disabled' : ''}>-</button>
        <span class="quantity">${currentQty}</span>
        <button class="quantity-btn plus" ${!isItemAvailable ? 'disabled' : ''}>+</button>
      </div>
    `;

    const plus = itemDiv.querySelector('.plus');
    const minus = itemDiv.querySelector('.minus');
    const qtySpan = itemDiv.querySelector('.quantity');

    // set initial selected class
    if (currentQty > 0) itemDiv.classList.add('selected');

    plus.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 🔹 محدث: التحقق من العدد المتبقي
      const currentRemaining = calculateRemainingForCategory(offer, catId);
      if (currentRemaining <= 0) {
        showAlert('وصلت الحد الأقصى للاختيارات في هذه الفئة')
        return;
      }
      
      let q = parseInt(qtySpan.textContent) || 0;
      q++;
      qtySpan.textContent = q;
      offerSelectionsState[offer.id] = offerSelectionsState[offer.id] || {};
      offerSelectionsState[offer.id][it.id] = { name: it.name, qty: q, category_id: catId };
      itemDiv.classList.add('selected');
      minus.disabled = false;
      
      // 🔹 محدث: تحديث العداد بعد الإضافة
      updateCategoryCounter(containerEl, offer, catId);
    });

    minus.addEventListener('click', (e) => {
      e.stopPropagation();
      let q = parseInt(qtySpan.textContent) || 0;
      if (q <= 0) return;
      q--;
      qtySpan.textContent = q;
      
      if (q === 0) {
        if (offerSelectionsState[offer.id]) delete offerSelectionsState[offer.id][it.id];
        itemDiv.classList.remove('selected');
        minus.disabled = true;
      } else {
        offerSelectionsState[offer.id][it.id].qty = q;
      }
      
      // 🔹 محدث: تحديث العداد بعد الحذف
      updateCategoryCounter(containerEl, offer, catId);
    });

    // clicking the whole item toggles
    itemDiv.addEventListener('click', (e) => {
      if (e.target.classList.contains('plus') || e.target.classList.contains('minus')) return;
      
      const cur = parseInt(qtySpan.textContent) || 0;
      if (cur === 0) {
        // 🔹 محدث: التحقق قبل الإضافة
        const currentRemaining = calculateRemainingForCategory(offer, catId);
        if (currentRemaining <= 0) {
          showAlert('وصلت الحد الأقصى للاختيارات في هذه الفئة')
          return;
        }
        plus.click();
      } else {
        minus.click();
      }
    });

    containerEl.appendChild(itemDiv);
  });
  
  // 🔹 استدعاء التحديث الأولي للعداد
  updateCategoryCounter(containerEl, offer, catId);
}

    function getAllowedItemsForCategory(offer, catId) {
  if (!offer.allowed_categories || !Array.isArray(offer.allowed_categories)) {
    return Infinity;
  }
  
  // البحث عن إعدادات الفئة
  const categoryConfig = offer.allowed_categories.find(cat => 
    cat.category_id === catId || cat.id === catId
  );
  
  const baseAllowed = categoryConfig ? (categoryConfig.allowed_items || 0) : 0;
  
  // 🔹 الجديد: الحصول على كمية العرض المختارة
  const offerKey = 'offer-' + offer.id;
  const offerQty = selectedItemsState[offerKey] ? selectedItemsState[offerKey].qty : 1;
  
  // 🔹 الجديد: ضرب العدد المسموح بكمية العرض
  return baseAllowed * offerQty;
}


    // 🔹 جديد: حساب العدد المستخدم حاليًا في فئة محددة
    function calculateUsedItemsInCategory(offerId, catId) {
      if (!offerSelectionsState[offerId]) return 0;
      
      let totalUsed = 0;
      Object.values(offerSelectionsState[offerId]).forEach(item => {
        if (item.category_id === catId) {
          totalUsed += item.qty || 0;
        }
      });
      
      return totalUsed;
    }

    // 🔹 جديد: حساب العدد المتبقي لفئة محددة
// 🔹 محدث: حساب العدد المتبقي لفئة محددة
function calculateRemainingForCategory(offer, catId) {
  const allowed = getAllowedItemsForCategory(offer, catId);
  if (allowed === Infinity) return Infinity;
  
  const used = calculateUsedItemsInCategory(offer.id, catId);
  return Math.max(allowed - used, 0);
}

    // 🔹 جديد: تحديث عداد الفئة
// 🔹 محدث: تحديث عداد الفئة مع مراعاة كمية العرض
function updateCategoryCounter(containerEl, offer, catId) {
  const allowed = getAllowedItemsForCategory(offer, catId);
  const used = calculateUsedItemsInCategory(offer.id, catId);
  const remaining = allowed === Infinity ? Infinity : Math.max(allowed - used, 0);
  
  const counterEl = containerEl.querySelector('.category-counter');
  if (counterEl) {
    counterEl.innerHTML = `العدد المتبقي في هذه الفئة: <span style="font-size: 18px;">${remaining}</span>`;
    counterEl.style.color = remaining > 0 ? '#1976d2' : '#e53935';
  }
  
  // تحديث أزرار الزيادة
  const plusButtons = containerEl.querySelectorAll('.quantity-btn.plus');
  plusButtons.forEach(btn => {
    btn.disabled = remaining <= 0;
  });
  
  // تحديث شفافية العناصر
  const menuItems = containerEl.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    const qtySpan = item.querySelector('.quantity');
    const currentQty = parseInt(qtySpan.textContent) || 0;
    
    if (remaining <= 0 && currentQty === 0) {
      item.style.opacity = '0.6';
      item.style.pointerEvents = 'none';
    } else {
      item.style.opacity = '1';
      item.style.pointerEvents = 'auto';
    }
  });
  updateSaveButtonState(offer);
}




 function closeOfferPicker() {
  // 🔹 تم التعديل: إلغاء جميع الاختيارات عند الإغلاق
  if (!offerPickerElements) return;
  
  // 🔹 جديد: إلغاء جميع اختيارات العرض الحالي
  if (currentOpenOfferId) {
    // مسح جميع الاختيارات الداخلية للعرض
    if (offerSelectionsState[currentOpenOfferId]) {
      delete offerSelectionsState[currentOpenOfferId];
    }
    
    // إلغاء تحديد العرض نفسه
    const offerKey = 'offer-' + currentOpenOfferId;
    if (selectedItemsState[offerKey]) {
      selectedItemsState[offerKey].selected = false;
    }
  }
  
  // تنظيف واجهة النافذة
  const backdrop = document.querySelector('.offer-picker-backdrop');
  if (backdrop) backdrop.remove();
  offerPickerElements.remove();
  offerPickerElements = null;
  currentOpenOfferId = null;
  currentOfferData = null;
  
  // 🔹 جديد: تحديث الواجهة الرئيسية بعد الإغلاق
  setTimeout(() => {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      renderMenuForCategory(Number(activeTab.dataset.catId));
    }
  }, 100);
}



    // مساعدات تنسيق
    function formatPrice(val) {
      if (val === null || val === undefined) return '';
      try { return Number(val).toLocaleString('en-US') + ' ل.س'; } catch { return val; }
    }
    function escapeHtml(s) {
      if (!s) return '';
      return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    // 🔹 دالة لحفظ الطلبات محليًا
    function saveOrderLocally(order) {
      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      existingOrders.push(order);
      localStorage.setItem('orders', JSON.stringify(existingOrders));
    }


    // responsive indicator recalc on resize
    window.addEventListener('resize', () => {
      const active = document.querySelector('.tab.active');
      if (active) moveIndicator(active);
    });

    // نافذة الطلب
    const orderBtn = document.getElementById('orderBtn');
    const orderModal = document.getElementById('orderModal');
    const orderItemsDiv = document.getElementById('orderItems');
    const sendOrderBtn = document.getElementById('sendOrderBtn');

    // افتح النافذة وأظهر العناصر المختارة (نستخدم الحالة المحفوظة selectedItemsState)
    orderBtn.addEventListener('click', () => {
      const selectedEntries = Object.entries(selectedItemsState).filter(([k,v]) => v && v.selected);
      if (selectedEntries.length === 0) { showAlert('لم تختر أي عنصر!'); ; return; }
      const lines = selectedEntries.map(([id, v]) => {
        if (v.isOffer) {
          const children = offerSelectionsState[v.offerId] || {};
          const childParts = Object.entries(children)
            .map(([cid, c]) => `${c.name} x${c.qty}`)
            .join(', ');
          return `<p>${escapeHtml(v.name)}${childParts ? ' (' + escapeHtml(childParts) + ')' : ''} - ${escapeHtml(String(v.qty))}</p>`;
        } else {
          return `<p>${escapeHtml(v.name)} - ${escapeHtml(String(v.qty))}</p>`;
        }
      });

      orderItemsDiv.innerHTML = lines.join('');
      orderModal.style.display = 'flex';
    });

    // إغلاق المودال عند النقر في الخلفية
    orderModal.addEventListener('click', (e) => { if (e.target === orderModal) orderModal.style.display = 'none'; });

    // إرسال الطلب إلى جدول orders
// إرسال الطلب إلى جدول orders
sendOrderBtn.addEventListener('click', async () => {
  const tableNumber = document.getElementById('tableNumber').value.trim();
  const notes = document.getElementById('orderNotes').value.trim();
  
  // 🔹 التحقق 1: رقم الطاولة
  if (!validateTableNumber(tableNumber)) {
    document.getElementById('tableNumber').focus();
    return;
  }
  
  const selectedEntries = Object.entries(selectedItemsState)
    .filter(([k,v]) => v && v.selected);

  // 🔹 التحقق 2: العروض الاختيارية الفارغة
  if (!validateOptionalOffers(selectedEntries)) {
    return;
  }

  const items = selectedEntries.map(([k,v]) => {
    if (v.isOffer) {
      // المعلومات المختارة داخل هذا العرض:
      const children = offerSelectionsState[v.offerId] || {};
      const childParts = Object.entries(children).map(([cid, c]) => `${c.name} x${c.qty}`).join(', ');
      return {
        id: `offer-${v.offerId}`,
        name: `${v.name}${childParts ? ' (' + childParts + ')' : ''}`,
        qty: v.qty,
        price: v.price
      };
    } else {
      // عنصر عادي
      const idNum = k.startsWith('item-') ? Number(k.split('-')[1]) : Number(k);
      return {
        id: idNum,
        name: v.name,
        qty: v.qty,
        price: v.price
      };
    }
  });

  if (items.length === 0) {
    showAlert('لا توجد عناصر محددة للإرسال');
    return;
  }

  // إدخال الطلب في قاعدة البيانات + إرجاع الصف الجديد
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      table_number: tableNumber || null,
      notes: notes || '',
      items
    }])
    .select();

  // 🔹 تحديث عدّاد الاسبوع الطلب لكل عنصر
  for (const item of items) {
    if (!item.id || String(item.id).startsWith('offer-')) continue;

    const { error: counterError } = await supabase.rpc('increment_counters', {
      row_id: item.id,
      qty: item.qty
    });

    if (counterError) {
      console.error(`خطأ في تحديث العداد للعنصر ${item.id}:`, counterError);
    }
  }

  if (error) {
    showAlert('عذرا ! خطأ في إرسال الطلب');
    console.error('order insert error:', error);
  } else {
    const newOrder = data[0];
    showSuccess('تم إرسال الطلب بنجاح!');
    // عرض نافذة التثبيت بعد إرسال الطلب بنجاح
    installModal.style.display = 'flex';
    // 🔹 إنشاء نسخة الطلب لحفظها محليًا
    const order = {
      id: newOrder.id,
      timestamp: new Date().toISOString(),
      table_number: tableNumber || null,
      notes,
      items
    };

    // حفظ الطلب محليًا
    saveOrderLocally(order);

    orderModal.style.display = 'none';
    // إزالة الخيار (selected) من جميع العناصر التي كانت محددة
    Object.keys(selectedItemsState).forEach(k => {
      if (selectedItemsState[k] && selectedItemsState[k].selected) {
        delete selectedItemsState[k];
      }
    });
    
    // تنظيف اختيارات العروض
    Object.keys(offerSelectionsState).forEach(offerId => {
      delete offerSelectionsState[offerId];
    });

    // إعادة رسم القائمة الحالية لتحديث الواجهة بصريًا
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      async function safeReload() {
        await renderMenuForCategory(Number(activeTab.dataset.catId));
        if (content.innerText.includes("لا توجد عناصر")) {
          setTimeout(safeReload, 500);
        }
      }
      safeReload();
    }

    // تنظيف حقول الطلب
    document.getElementById('tableNumber').value = '';
    document.getElementById('orderNotes').value = '';
  }
});




    const rateOrderBtn = document.getElementById('rateOrderBtn');
    rateOrderBtn.addEventListener('click', () => {
      // فتح صفحة تقييم الطلب
      window.location.href = 'rating.html';
    });


    window.addEventListener('resize', () => {
      const active = document.querySelector('.tab.active');
      if (active) moveIndicator(active);
    });

    // زر حجز طاولة
    const reserveTableBtn = document.getElementById('reserveTableBtn');
    reserveTableBtn.addEventListener('click', () => {
      window.location.href = 'table_reservation.html';
    });


// دالة للتحقق من صحة رقم الطاولة
function validateTableNumber(tableNumber) {
  if (!tableNumber || tableNumber.trim() === '') {
    showAlert('يرجى إدخال رقم الطاولة');
    return false;
  }
  
  // التحقق من أن الرقم يحتوي على أرقام فقط
  if (!/^\d+$/.test(tableNumber)) {
    showAlert('رقم الطاولة يجب أن يحتوي على أرقام فقط');
    return false;
  }
  
  return true;
}


// دالة للتحقق من العروض الاختيارية الفارغة
// دالة للتحقق من العروض بناءً على نوعها
function validateOptionalOffers(selectedEntries) {
  for (const [key, item] of selectedEntries) {
    if (item.isOffer && item.selected) {
      const offerSelections = offerSelectionsState[item.offerId] || {};
      const hasSelections = Object.keys(offerSelections).length > 0;
      
      // 🔹 التحقق من نوع العرض المخزن في الحالة
      const offerType = item.type || 'optional';
      
      // إذا كان العرض اختياريًا ولم يتم اختيار أي عنصر
      if (offerType === 'optional' && !hasSelections) {
        showAlert(`العرض "${item.name}" يحتاج إلى اختيار عناصر داخله`);
        return false;
      }
      
      // 🔹 إذا كان العرض إجباريًا (mandatory)، لا نتحقق من العناصر الداخلية
      // يمكن أن يكون بدون عناصر مختارة إذا كان محددًا مسبقًا
    }
  }
  return true;
}


// 🔹 دالة مبسطة للتحقق من اكتمال العرض
function isOfferComplete(offer) {
  if (!offer.allowed_categories || !Array.isArray(offer.allowed_categories)) {
    return true; // إذا لم تكن هناك قيود، يعتبر مكتملاً
  }
  
  for (const catConfig of offer.allowed_categories) {
    const catId = catConfig.category_id || catConfig.id;
    const allowedItems = getAllowedItemsForCategory(offer, catId);
    const usedItems = calculateUsedItemsInCategory(offer.id, catId);
    
    // إذا كانت الفئة محددة ولم تكتمل
    if (allowedItems !== Infinity && usedItems !== allowedItems) {
      return false; // لم يكتمل
    }
  }
  
  return true; // اكتمل
}


// 🔹 جديد: دالة شاملة لتحديث جميع العدادات في نافذة الاختيار
function updateAllCategoryCounters(offer) {
  // التأكد من وجود نافذة الاختيار مفتوحة
  if (!offerPickerElements || !currentOpenOfferId) return;
  
  // الحصول على عناصر الواجهة
  const tabsContainer = offerPickerElements.querySelector('#offerPickerTabs');
  const contentContainer = offerPickerElements.querySelector('#offerPickerContent');
  
  if (!tabsContainer || !contentContainer) return;
  
  // تحديث العدادات في تبويبات الفئات
  const tabs = tabsContainer.querySelectorAll('.picker-tab');
  tabs.forEach(tab => {
    const catId = Number(tab.dataset.catId);
    const allowed = getAllowedItemsForCategory(offer, catId);
    const used = calculateUsedItemsInCategory(offer.id, catId);
    const remaining = allowed === Infinity ? '∞' : Math.max(allowed - used, 0);
    
    // استخراج اسم الفئة الحالي (بإزالة العداد القديم)
    const catName = tab.textContent.replace(/\(\d+\)|\(∞\)/, '').trim();
    
    // تحديث النص بالعداد الجديد
    tab.textContent = `${catName} (${remaining})`;
  });
  
  // تحديث العداد في محتوى الفئة النشطة
  const currentTab = tabsContainer.querySelector('.picker-tab.active');
  if (currentTab) {
    const currentCatId = Number(currentTab.dataset.catId);
    updateCategoryCounter(contentContainer, offer, currentCatId);
  }
  
  // تحديث حالة زر الحفظ
  updateSaveButtonState(offer);
}

// 🔹 جديد: تحديث حالة زر الحفظ بناءً على اكتمال العرض
function updateSaveButtonState(offer) {
  const applyBtn = document.querySelector('.offer-picker .apply-btn');
  if (!applyBtn) return;
  
  const isComplete = isOfferComplete(offer);
  if (isComplete) {
    applyBtn.textContent = '✅ تم الاكتمال - احفظ';
    applyBtn.style.background = '#4caf50';
    applyBtn.classList.add('completed');
    applyBtn.classList.remove('incomplete');
  } else {
    applyBtn.textContent = 'حفظ - غير مكتمل';
    applyBtn.style.background = '#ff9800';
    applyBtn.classList.add('incomplete');
    applyBtn.classList.remove('completed');
  }
}


// دالة لتحديث عداد السلة
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const orderBtn = document.getElementById('orderBtn');
  const selectedEntries = Object.entries(selectedItemsState).filter(([k,v]) => v && v.selected);
  const totalItems = selectedEntries.reduce((total, [k, v]) => total + (v.qty || 1), 0);
  
  if (totalItems > 0) {
    badge.textContent = totalItems > 99 ? '99+' : totalItems;
    badge.style.display = 'flex';
    orderBtn.classList.add('has-items');
  } else {
    badge.style.display = 'none';
    orderBtn.classList.remove('has-items');
  }
}

// تحديث العداد عند أي تغيير في الطلبيات
function observeCartChanges() {
  // استدعاء عند إضافة/إزالة عناصر
  updateCartBadge();
}

// استدعاء التحديث في الأماكن المناسبة:
// 1. بعد إضافة عنصر
// 2. بعد إزالة عنصر  
// 3. بعد إرسال الطلب

// مثال: أضف هذا في دالة renderMenuForCategory بعد كل عملية تحديث للكمية
// updateCartBadge();


// ===== دوال تثبيت التطبيق =====


// متغير لتخزين حدث التثبيت
let deferredPrompt;
const installModal = document.getElementById('installModal');
const confirmInstallBtn = document.getElementById('confirmInstall');
const cancelInstallBtn = document.getElementById('cancelInstall');
const installMessage = document.getElementById('installMessage');


function hideInstallModal() {
  if (installModal) {
    installModal.style.opacity = '0';
    setTimeout(() => {
      installModal.style.display = 'none';
    }, 300);
  }
}



// استمع لحدث beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    // منع المتصفح من عرض رسالة التثبيت التلقائية
    e.preventDefault();
    // تخزين الحدث ليتم استخدامه لاحقاً
    deferredPrompt = e;
    
    // إظهار زر التثبيت
    confirmInstallBtn.style.display = 'block';
    installMessage.textContent = 'يمكنك الآن تثبيت التطبيق على جهازك';
    installMessage.className = 'message success';
});

// عند النقر على زر التثبيت
confirmInstallBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
        installMessage.textContent = 'عذراً، لا يمكن تثبيت التطبيق على هذا المتصفح';
        installMessage.className = 'message error';
        return;
    }
    
    // عرض رسالة التثبيت
    deferredPrompt.prompt();
    
    // انتظر رد المستخدم
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        installMessage.textContent = 'تم تثبيت التطبيق بنجاح! يمكنك الآن فتحه من أيقونة التطبيقات';
        installMessage.className = 'message success';
        confirmInstallBtn.style.display = 'none';
        hideInstallModal();
    } else {
        installMessage.textContent = 'تم إلغاء تثبيت التطبيق';
        installMessage.className = 'message error';
    }
    
    // مسح الحدث بعد استخدامه
    deferredPrompt = null;
});

// عند اكتمال التثبيت
window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('تم تثبيت التطبيق بنجاح');
});

// حدث زر الإلغاء
cancelInstallBtn.addEventListener('click', () => {
  hideInstallModal();
  localStorage.setItem('installPromptDismissed', 'true');
});

// إخفاء النافذة عند النقر خارجها
installModal.addEventListener('click', (e) => {
  if (e.target === installModal) {
    hideInstallModal();
    localStorage.setItem('installPromptDismissed', 'true');
  }
});

// دالة محسنة لجلب بيانات المطعم من جدول info
async function fetchRestaurantInfo() {
  try {
    console.log('جلب بيانات المطعم من Supabase...');
    
    const { data, error } = await supabase
      .from('info')
      .select('logo_url')
      .single();

    if (error) {
      console.error('خطأ في جلب بيانات المطعم:', error);
      return null;
    }
    
    console.log('بيانات المطعم التي تم جلبها:', data);
    return data;
    
  } catch (error) {
    console.error('خطأ غير متوقع في جلب بيانات المطعم:', error);
    return null;
  }
}

// دالة محسنة لتحديث جميع صور اللوغو في الصفحة
async function updateRestaurantLogos() {
  try {
    console.log('بدء تحديث صور اللوغو...');
    
    const restaurantInfo = await fetchRestaurantInfo();
    
    if (restaurantInfo && restaurantInfo.logo_url) {
      console.log('تم العثور على رابط الصورة:', restaurantInfo.logo_url);
      
      // قائمة بجميع صور اللوغو التي تحتاج للتحديث
      const logoImages = [
        { id: 'splashLogo', default: 'assets/images/makaniLOGO.jpg' },
        { id: 'sidebarLogo', default: 'assets/images/makaniLOGO.jpg' },
        { id: 'installLogo', default: 'assets/images/makaniLOGO.jpg' }
      ];
      
      let updatedCount = 0;
      
      logoImages.forEach(({ id, default: defaultSrc }) => {
        const img = document.getElementById(id);
        if (img) {
          console.log(`تحديث الصورة ${id} إلى:`, restaurantInfo.logo_url);
          img.src = restaurantInfo.logo_url;
          
          // إضافة معالجة الأخطاء
          img.onerror = function() {
            console.warn(`فشل تحميل الصورة لـ ${id}, استخدام الصورة الافتراضية`);
            this.src = defaultSrc;
            this.onerror = null; // منع التكرار
          };
          
          // عند التحميل الناجح
          img.onload = function() {
            console.log(`تم تحميل الصورة بنجاح لـ ${id}`);
            updatedCount++;
          };
          
        } else {
          console.warn(`لم يتم العثور على عنصر بالـ ID: ${id}`);
        }
      });
      
      console.log(`تم تحديث ${updatedCount} صورة بنجاح`);
      
    } else {
      console.warn('لا توجد بيانات مطعم أو رابط صورة');
      // استخدام الصور الافتراضية
      useDefaultLogos();
    }
    
  } catch (error) {
    console.error('خطأ في تحديث صور اللوغو:', error);
    useDefaultLogos();
  }
}

// دالة لاستخدام الصور الافتراضية في حالة الخطأ
function useDefaultLogos() {
  const defaultLogo = 'assets/images/makaniLOGO.jpg';
  const logoIds = ['splashLogo', 'sidebarLogo', 'installLogo'];
  
  logoIds.forEach(id => {
    const img = document.getElementById(id);
    if (img) {
      img.src = defaultLogo;
    }
  });
}

// بدء تحميل الصور فوراً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  console.log('بدء تحميل بيانات المطعم...');
  await updateRestaurantLogos();
  console.log('اكتمل تحميل الصور');
});