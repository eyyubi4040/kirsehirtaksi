/**
 * KIRŞEHİR TAKSİ (kirsehirtaksi.net) - MAIN CONTROLLER
 * Reactive Fare Calculator • Live Reservation • WhatsApp Dispatcher • Dual Protocol Router (HTTP & File)
 */

// Immediate fix for local file:// protocol (double-clicking HTML files in Windows Explorer)
(function initProtocolAutoFix() {
  // If running on Web Server (HTTP/HTTPS), enforce zero .html Clean URLs
  if (window.location.protocol.startsWith('http')) {
    const p = window.location.pathname;
    if (p.endsWith('.html')) {
      const clean = p === '/index.html' ? '/' : p.replace(/\.html$/, '');
      window.history.replaceState(null, '', clean + window.location.search + window.location.hash);
    } else if (p.length > 1 && p.endsWith('/')) {
      window.history.replaceState(null, '', p.slice(0, -1) + window.location.search + window.location.hash);
    }
    return;
  }

  function fixLinks() {
    if (window.location.protocol === 'file:') {
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          const cleanName = href.slice(1);
          if (!cleanName || cleanName === '') {
            a.setAttribute('href', 'index.html');
          } else if (!cleanName.includes('.')) {
            a.setAttribute('href', cleanName + '.html');
          }
        }
      });
    }
  }

  // Intercept click on file:/// protocol to guarantee zero ERR_FILE_NOT_FOUND
  document.addEventListener('click', (e) => {
    if (window.location.protocol !== 'file:') return;
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('//')) {
      e.preventDefault();
      const cleanName = href.slice(1);
      const targetFile = (!cleanName || cleanName === '') ? 'index.html' : (cleanName.includes('.') ? cleanName : cleanName + '.html');
      window.location.href = targetFile;
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixLinks);
  } else {
    fixLinks();
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initFareCalculator();
  initReservationForm();
  initFaqAccordion();
});

// Settings & Pricing Reference
const TAXI_CONFIG = {
  openingFare: 35.00,
  perKmRate: 25.00,
  minFare: 100.00,
  phone: "05550000000",
  phoneFormatted: "0 555 000 00 00",
  whatsappNumber: "905550000000",
  
  // Known routes & distances from Kırşehir Center
  routes: {
    "merkez-otogar": { km: 4, min: 7, fixedPrice: 135 },
    "merkez-hastane": { km: 5, min: 8, fixedPrice: 160 },
    "merkez-universite": { km: 9, min: 12, fixedPrice: 260 },
    "merkez-kervansaray": { km: 3, min: 6, fixedPrice: 110 },
    "merkez-yenice": { km: 3, min: 5, fixedPrice: 110 },
    "merkez-asikpasa": { km: 4, min: 6, fixedPrice: 135 },
    "merkez-kindam": { km: 7, min: 10, fixedPrice: 210 },
    "merkez-sanayi": { km: 6, min: 8, fixedPrice: 185 },

    // Districts
    "merkez-mucur": { km: 24, min: 20, fixedPrice: 600 },
    "merkez-kaman": { km: 54, min: 40, fixedPrice: 1150 },
    "merkez-boztepe": { km: 18, min: 18, fixedPrice: 550 },
    "merkez-akpinar": { km: 42, min: 35, fixedPrice: 950 },
    "merkez-cicekdagi": { km: 68, min: 50, fixedPrice: 1450 },
    "merkez-akcakent": { km: 72, min: 55, fixedPrice: 1550 },

    // Airports & Intercity
    "merkez-esenboga": { km: 215, min: 135, fixedPrice: 3200 },
    "merkez-ankara-asti": { km: 185, min: 115, fixedPrice: 2700 },
    "merkez-kayseri-havalimani": { km: 135, min: 90, fixedPrice: 2400 },
    "merkez-nevsehir-havalimani": { km: 90, min: 65, fixedPrice: 1700 },
    "merkez-kozakli": { km: 85, min: 60, fixedPrice: 1600 }
  }
};

/* ==========================================================================
   1. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const closeBtn = document.getElementById('drawerCloseBtn');

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    drawer.classList.add('open');
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  }

  // Close on backdrop click
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
      drawer.classList.remove('open');
    }
  });
}

/* ==========================================================================
   2. INTERACTIVE FARE & ROUTE CALCULATOR
   ========================================================================== */
function initFareCalculator() {
  const pickupSelect = document.getElementById('calcPickup');
  const dropoffSelect = document.getElementById('calcDropoff');
  const priceDisplay = document.getElementById('calcPriceDisplay');
  const infoDisplay = document.getElementById('calcInfoDisplay');
  const actionBtn = document.getElementById('btnCalcAction');

  if (!pickupSelect || !dropoffSelect || !priceDisplay) return;

  function calculate() {
    const pickup = pickupSelect.value;
    const dropoff = dropoffSelect.value;

    if (!pickup || !dropoff) {
      priceDisplay.textContent = "0";
      if (infoDisplay) infoDisplay.textContent = "Lütfen kalkış ve varış noktası seçin";
      return;
    }

    if (pickup === dropoff) {
      priceDisplay.textContent = TAXI_CONFIG.minFare.toString();
      if (infoDisplay) infoDisplay.textContent = "Aynı bölge içi indi-bindi tarifesi (Min: " + TAXI_CONFIG.minFare + " ₺)";
      return;
    }

    const directKey = `${pickup}-${dropoff}`;
    const reverseKey = `${dropoff}-${pickup}`;
    const route = TAXI_CONFIG.routes[directKey] || TAXI_CONFIG.routes[reverseKey];

    let estimatedPrice = 0;
    let km = 5;
    let mins = 8;

    if (route) {
      estimatedPrice = route.fixedPrice;
      km = route.km;
      mins = route.min;
    } else {
      km = 8;
      mins = 12;
      estimatedPrice = Math.max(TAXI_CONFIG.minFare, Math.round(TAXI_CONFIG.openingFare + (km * TAXI_CONFIG.perKmRate)));
    }

    priceDisplay.textContent = estimatedPrice.toLocaleString('tr-TR');
    if (infoDisplay) {
      infoDisplay.textContent = `Yaklaşık ${km} km • ${mins} dakika varış süresi`;
    }

    if (actionBtn) {
      const pickupText = pickupSelect.options[pickupSelect.selectedIndex].text;
      const dropoffText = dropoffSelect.options[dropoffSelect.selectedIndex].text;
      const msg = encodeURIComponent(`Merhaba Kırşehir Taksi, ${pickupText} noktasından ${dropoffText} noktasına taksi çağırmak istiyorum. (Tahmini Tutar: ${estimatedPrice} ₺). Müsait misiniz?`);
      actionBtn.href = `https://wa.me/${TAXI_CONFIG.whatsappNumber}?text=${msg}`;
    }
  }

  pickupSelect.addEventListener('change', calculate);
  dropoffSelect.addEventListener('change', calculate);
  calculate();
}

// Global helper for interactive quick route presets
window.selectPreset = function(pickupVal, dropoffVal) {
  const pickup = document.getElementById("calcPickup");
  const dropoff = document.getElementById("calcDropoff");
  if (pickup && dropoff) {
    pickup.value = pickupVal;
    dropoff.value = dropoffVal;
    pickup.dispatchEvent(new Event("change"));
    dropoff.dispatchEvent(new Event("change"));
    
    // Highlight the price card subtly
    const card = document.querySelector(".fare-calc-card");
    if (card) {
      card.style.borderColor = "rgba(255, 184, 0, 0.7)";
      card.style.boxShadow = "0 24px 60px rgba(0,0,0,0.9), 0 0 35px rgba(255, 184, 0, 0.25)";
      setTimeout(() => {
        card.style.borderColor = "";
        card.style.boxShadow = "";
      }, 700);
    }
  }
};

/* ==========================================================================
   3. ONLINE REZERVASYON FORMU (WHATSAPP ENTEGRASYONU)
   ========================================================================== */
function initReservationForm() {
  const form = document.getElementById('reservationForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.elements['name']?.value?.trim() || '';
    const phone = form.elements['phone']?.value?.trim() || '';
    const pickup = form.elements['pickup']?.value?.trim() || '';
    const dropoff = form.elements['dropoff']?.value?.trim() || '';
    const date = form.elements['date']?.value || '';
    const time = form.elements['time']?.value || '';
    const vehicleType = form.elements['vehicleType']?.value || 'Standart Sarı Taksi';
    const passengers = form.elements['passengers']?.value || '1';
    const notes = form.elements['notes']?.value?.trim() || 'Yok';

    let formattedDate = date;
    if (date && date.includes('-')) {
      const parts = date.split('-');
      formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    const message = 
`🚖 *KIRŞEHİR TAKSİ - ONLİNE REZERVASYON TALEBİ*

👤 *Yolcu:* ${name}
📞 *Telefon:* ${phone}
📍 *Alınış Adresi:* ${pickup}
🏁 *Varış Yeri:* ${dropoff}
📅 *Tarih:* ${formattedDate}
⏰ *Saat:* ${time}
🚕 *Araç Tercihi:* ${vehicleType} (${passengers} Yolcu)
📝 *Özel Not:* ${notes}

✅ Lütfen rezervasyonumu onaylayıp araç durumunu teyit eder misiniz?`;

    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://wa.me/${TAXI_CONFIG.whatsappNumber}?text=${encodedMsg}`;

    // Open WhatsApp
    window.open(waUrl, '_blank');

    // Show luxury on-screen confirmation modal
    showSuccessModal({
      name,
      phone,
      pickup,
      dropoff,
      date: formattedDate,
      time,
      vehicleType,
      waUrl
    });

    form.reset();
  });
}

function showSuccessModal(data) {
  const existing = document.getElementById('bookingModal');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="bookingModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.88);backdrop-filter:blur(16px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:#0c0c0c;border:1px solid rgba(37,211,102,0.35);border-radius:24px;padding:36px;max-width:480px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.95), 0 0 40px rgba(37,211,102,0.15);">
        <div style="width:68px;height:68px;background:rgba(37,211,102,0.14);color:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 18px;border:1px solid rgba(37,211,102,0.3);">
          <i class="fa-brands fa-whatsapp"></i>
        </div>
        <h3 style="font-size:22px;color:#fff;margin-bottom:8px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;">Rezervasyon WhatsApp'a İletildi!</h3>
        <p style="color:#A3A3A3;font-size:14px;margin-bottom:20px;line-height:1.5;">
          Sayın <b style="color:#fff;">${data.name}</b>, rezervasyon detaylarınız WhatsApp hattımıza aktarıldı. Şoförümüz birkaç dakika içinde sizinle iletişime geçecektir.
        </p>
        <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);padding:16px;border-radius:14px;margin-bottom:24px;text-align:left;font-size:13.5px;color:#D4D4D4;line-height:1.7;">
          <div><b style="color:#fff;">📍 Alınış:</b> ${data.pickup}</div>
          <div><b style="color:#fff;">🏁 Varış:</b> ${data.dropoff}</div>
          <div><b style="color:#fff;">⏰ Zaman:</b> ${data.date} - ${data.time}</div>
          <div><b style="color:#fff;">🚖 Araç:</b> ${data.vehicleType}</div>
        </div>
        <div style="display:flex;gap:12px;">
          <a href="${data.waUrl}" target="_blank" style="flex:1;background:#25D366;color:#fff;font-weight:700;padding:14px;border-radius:999px;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 8px 24px rgba(37,211,102,0.35);">
            <i class="fa-brands fa-whatsapp" style="font-size:18px;"></i> WhatsApp'ta Gör
          </a>
          <button onclick="document.getElementById('bookingModal').remove()" style="padding:14px 22px;background:#222222;color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:999px;cursor:pointer;font-weight:600;font-size:14px;">
            Kapat
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/* ==========================================================================
   4. FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        items.forEach(other => other.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });
}
