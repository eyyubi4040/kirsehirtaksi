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
  whatsappNumber: "905550000000"
};

// All locations with comprehensive geo-corridor metadata
const LOCATIONS = {
  // Şehir İçi Noktalar
  "merkez": { name: "Cacabey Meydanı & Şehir Merkezi", category: "city", kmCenter: 0, minCenter: 0, corridor: "center" },
  "otogar": { name: "Kırşehir Şehirlerarası Otobüs Terminali", category: "city", kmCenter: 4, minCenter: 7, corridor: "northwest" },
  "hastane": { name: "Kırşehir Eğitim ve Araştırma Hastanesi", category: "city", kmCenter: 5, minCenter: 8, corridor: "west" },
  "universite": { name: "Ahi Evran Üniversitesi (Bağbaşı Kampüsü)", category: "city", kmCenter: 9, minCenter: 12, corridor: "southeast" },
  "kervansaray": { name: "Kervansaray Mahallesi", category: "city", kmCenter: 3, minCenter: 6, corridor: "west" },
  "yenice": { name: "Yenice Mahallesi / Terme", category: "city", kmCenter: 3.5, minCenter: 6, corridor: "south" },
  "asikpasa": { name: "Aşıkpaşa Mahallesi", category: "city", kmCenter: 3.5, minCenter: 6, corridor: "east" },
  "kindam": { name: "Kındam Mahallesi", category: "city", kmCenter: 6.5, minCenter: 10, corridor: "north" },
  "sanayi": { name: "Yeni Sanayi Sitesi", category: "city", kmCenter: 5.5, minCenter: 8, corridor: "northwest" },

  // Kırşehir İlçeleri
  "mucur": { name: "Mucur", category: "district", kmCenter: 24, minCenter: 20, corridor: "southeast", fixedPrice: 600 },
  "kaman": { name: "Kaman", category: "district", kmCenter: 54, minCenter: 40, corridor: "northwest", fixedPrice: 1150 },
  "boztepe": { name: "Boztepe", category: "district", kmCenter: 18, minCenter: 18, corridor: "north", fixedPrice: 550 },
  "akpinar": { name: "Akpınar", category: "district", kmCenter: 42, minCenter: 35, corridor: "northwest", fixedPrice: 950 },
  "cicekdagi": { name: "Çiçekdağı", category: "district", kmCenter: 68, minCenter: 50, corridor: "northeast", fixedPrice: 1450 },
  "akcakent": { name: "Akçakent", category: "district", kmCenter: 72, minCenter: 55, corridor: "north", fixedPrice: 1550 },

  // Havalimanı & Şehirlerarası
  "esenboga": { name: "Ankara Esenboğa Havalimanı (ESB)", category: "airport", kmCenter: 215, minCenter: 135, corridor: "northwest", fixedPrice: 3200 },
  "ankara-asti": { name: "Ankara Şehir Merkezi / AŞTİ", category: "airport", kmCenter: 185, minCenter: 115, corridor: "northwest", fixedPrice: 2700 },
  "kayseri-havalimani": { name: "Kayseri Erkilet Havalimanı (ASR)", category: "airport", kmCenter: 135, minCenter: 90, corridor: "southeast", fixedPrice: 2400 },
  "nevsehir-havalimani": { name: "Nevşehir Kapadokya Havalimanı (NAV)", category: "airport", kmCenter: 90, minCenter: 65, corridor: "southeast", fixedPrice: 1700 },
  "kozakli": { name: "Kozaklı Termal Tesisleri", category: "airport", kmCenter: 85, minCenter: 60, corridor: "east", fixedPrice: 1600 }
};

// Exact pre-calculated matrix for city street network
const CITY_ROUTES = {
  "merkez-otogar": { km: 4, min: 7, price: 135 },
  "merkez-hastane": { km: 5, min: 8, price: 160 },
  "merkez-universite": { km: 9, min: 12, price: 260 },
  "merkez-kervansaray": { km: 3, min: 6, price: 110 },
  "merkez-yenice": { km: 3.5, min: 6, price: 110 },
  "merkez-asikpasa": { km: 3.5, min: 6, price: 110 },
  "merkez-kindam": { km: 6.5, min: 10, price: 200 },
  "merkez-sanayi": { km: 5.5, min: 8, price: 175 },

  "otogar-sanayi": { km: 2.5, min: 5, price: 100 },
  "otogar-hastane": { km: 4.5, min: 7, price: 150 },
  "otogar-universite": { km: 12.5, min: 16, price: 350 },
  "otogar-kervansaray": { km: 4, min: 6, price: 135 },
  "otogar-yenice": { km: 6.5, min: 10, price: 200 },
  "otogar-asikpasa": { km: 6, min: 9, price: 185 },
  "otogar-kindam": { km: 5, min: 8, price: 160 },

  "hastane-universite": { km: 11.5, min: 15, price: 325 },
  "hastane-kervansaray": { km: 2, min: 4, price: 100 },
  "hastane-sanayi": { km: 5, min: 8, price: 160 },
  "hastane-yenice": { km: 5.5, min: 8, price: 175 },
  "hastane-asikpasa": { km: 6, min: 9, price: 185 },
  "hastane-kindam": { km: 8, min: 12, price: 235 },

  "universite-kervansaray": { km: 10, min: 14, price: 285 },
  "universite-yenice": { km: 7, min: 10, price: 210 },
  "universite-asikpasa": { km: 6.5, min: 9, price: 200 },
  "universite-kindam": { km: 12, min: 17, price: 335 },
  "universite-sanayi": { km: 13, min: 18, price: 360 },

  "kervansaray-yenice": { km: 4.5, min: 7, price: 150 },
  "kervansaray-asikpasa": { km: 5, min: 8, price: 160 },
  "kervansaray-kindam": { km: 7.5, min: 11, price: 225 },
  "kervansaray-sanayi": { km: 4.5, min: 7, price: 150 },

  "yenice-asikpasa": { km: 4, min: 7, price: 135 },
  "yenice-kindam": { km: 8.5, min: 12, price: 250 },
  "yenice-sanayi": { km: 8, min: 12, price: 235 },

  "asikpasa-kindam": { km: 7, min: 10, price: 210 },
  "asikpasa-sanayi": { km: 7.5, min: 11, price: 225 },

  "kindam-sanayi": { km: 6, min: 9, price: 185 }
};

// Known intercity highway shortcuts between districts / airports
const SPECIAL_ROUTES = {
  "kaman-esenboga": { km: 161, min: 100, price: 2450 },
  "kaman-ankara-asti": { km: 131, min: 85, price: 2000 },
  "akpinar-esenboga": { km: 173, min: 105, price: 2600 },
  "akpinar-ankara-asti": { km: 143, min: 90, price: 2150 },
  "mucur-kayseri-havalimani": { km: 111, min: 70, price: 1950 },
  "mucur-nevsehir-havalimani": { km: 66, min: 45, price: 1250 },
  "mucur-kozakli": { km: 61, min: 45, price: 1200 },
  "mucur-kaman": { km: 78, min: 55, price: 1650 },
  "boztepe-mucur": { km: 42, min: 35, price: 950 },
  "boztepe-kaman": { km: 72, min: 55, price: 1550 },
  "cicekdagi-kaman": { km: 122, min: 85, price: 2400 },
  "cicekdagi-esenboga": { km: 220, min: 140, price: 3400 }
};

function formatDuration(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} saat`;
  }
  return `${minutes} dakika`;
}

// Universal Route & Fare Calculation Engine
function calculateRoute(pickupKey, dropoffKey) {
  if (!pickupKey || !dropoffKey) return null;

  // 1. Same location
  if (pickupKey === dropoffKey) {
    return {
      km: 2,
      min: 4,
      price: TAXI_CONFIG.minFare,
      type: "same",
      note: "Aynı bölge / mahalle içi indi-bindi tarifesi (Min: " + TAXI_CONFIG.minFare + " ₺)"
    };
  }

  const pLoc = LOCATIONS[pickupKey] || { name: pickupKey, category: "city", kmCenter: 5, minCenter: 8, corridor: "center" };
  const dLoc = LOCATIONS[dropoffKey] || { name: dropoffKey, category: "city", kmCenter: 5, minCenter: 8, corridor: "center" };

  const directKey = `${pickupKey}-${dropoffKey}`;
  const reverseKey = `${dropoffKey}-${pickupKey}`;

  // 2. Direct city route lookup
  const cityMatch = CITY_ROUTES[directKey] || CITY_ROUTES[reverseKey];
  if (cityMatch) {
    return {
      km: cityMatch.km,
      min: cityMatch.min,
      price: cityMatch.price,
      type: "city",
      note: `Yaklaşık ${cityMatch.km} km • ${formatDuration(cityMatch.min)} varış süresi (Canlı Taksimetre)`
    };
  }

  // 3. Special highway route lookup
  const specialMatch = SPECIAL_ROUTES[directKey] || SPECIAL_ROUTES[reverseKey];
  if (specialMatch) {
    return {
      km: specialMatch.km,
      min: specialMatch.min,
      price: specialMatch.price,
      type: "intercity",
      note: `Yaklaşık ${specialMatch.km} km • ${formatDuration(specialMatch.min)} (Sabit VIP Tarife)`
    };
  }

  // 4. One end is Center, other is District or Airport with fixedPrice
  if (pickupKey === "merkez" && dLoc.fixedPrice) {
    return {
      km: dLoc.kmCenter,
      min: dLoc.minCenter,
      price: dLoc.fixedPrice,
      type: dLoc.category,
      note: `Yaklaşık ${dLoc.kmCenter} km • ${formatDuration(dLoc.minCenter)} (${dLoc.category === 'airport' ? 'Havalimanı VIP' : 'İlçe Sabit'} Tarife)`
    };
  }
  if (dropoffKey === "merkez" && pLoc.fixedPrice) {
    return {
      km: pLoc.kmCenter,
      min: pLoc.minCenter,
      price: pLoc.fixedPrice,
      type: pLoc.category,
      note: `Yaklaşık ${pLoc.kmCenter} km • ${formatDuration(pLoc.minCenter)} (${pLoc.category === 'airport' ? 'Havalimanı VIP' : 'İlçe Sabit'} Tarife)`
    };
  }

  // 5. One City location <-> One District/Airport location
  const isPCity = pLoc.category === "city";
  const isDCity = dLoc.category === "city";

  if ((isPCity && !isDCity) || (!isPCity && isDCity)) {
    const city = isPCity ? pLoc : dLoc;
    const dest = isPCity ? dLoc : pLoc;

    let offset = 0;
    if (city.corridor === dest.corridor) {
      offset = -Math.min(city.kmCenter * 0.85, 5);
    } else if (
      (city.corridor === "southeast" && dest.corridor === "northwest") ||
      (city.corridor === "northwest" && dest.corridor === "southeast")
    ) {
      offset = city.kmCenter * 0.9;
    } else {
      offset = city.kmCenter * 0.4;
    }

    const km = Math.max(8, Math.round(dest.kmCenter + offset));
    const min = Math.max(12, Math.round(dest.minCenter + (offset * 1.3)));

    let price = 0;
    if (dest.fixedPrice) {
      price = Math.round((dest.fixedPrice + (offset * 20)) / 50) * 50;
    } else {
      price = Math.max(TAXI_CONFIG.minFare, Math.round((TAXI_CONFIG.openingFare + km * 22) / 50) * 50);
    }

    return {
      km,
      min,
      price,
      type: dest.category,
      note: `Yaklaşık ${km} km • ${formatDuration(min)} (${dest.category === 'airport' ? 'Havalimanı VIP' : 'İlçe Sabit'} Tarife)`
    };
  }

  // 6. Both are Districts / Airports
  let km = 0;
  let min = 0;
  if (pLoc.corridor === dLoc.corridor) {
    km = Math.abs(pLoc.kmCenter - dLoc.kmCenter);
    min = Math.round(Math.abs(pLoc.minCenter - dLoc.minCenter) * 0.9);
  } else {
    km = Math.round((pLoc.kmCenter + dLoc.kmCenter) * 0.95);
    min = Math.round((pLoc.minCenter + dLoc.minCenter) * 0.85);
  }
  km = Math.max(15, km);
  min = Math.max(15, min);
  const price = Math.round((TAXI_CONFIG.openingFare + km * 21) / 50) * 50;

  return {
    km,
    min,
    price,
    type: "intercity",
    note: `Yaklaşık ${km} km • ${formatDuration(min)} (Şehirlerarası Özel Tarife)`
  };
}

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
  const swapBtn = document.getElementById('btnSwapLocations');

  if (!pickupSelect || !dropoffSelect || !priceDisplay) return;

  function calculate() {
    const pickup = pickupSelect.value;
    const dropoff = dropoffSelect.value;

    if (!pickup || !dropoff) {
      priceDisplay.textContent = "0";
      if (infoDisplay) infoDisplay.textContent = "Lütfen kalkış ve varış noktası seçin";
      return;
    }

    const route = calculateRoute(pickup, dropoff);
    if (!route) {
      priceDisplay.textContent = "0";
      if (infoDisplay) infoDisplay.textContent = "Mesafe hesaplanamadı";
      return;
    }

    priceDisplay.textContent = route.price.toLocaleString('tr-TR');
    if (infoDisplay) {
      infoDisplay.textContent = route.note;
    }

    if (actionBtn) {
      const pickupText = pickupSelect.options[pickupSelect.selectedIndex]?.text || pickup;
      const dropoffText = dropoffSelect.options[dropoffSelect.selectedIndex]?.text || dropoff;
      const msg = encodeURIComponent(`Merhaba Kırşehir Taksi, ${pickupText} noktasından ${dropoffText} noktasına taksi çağırmak istiyorum. (Mesafe: ${route.km} km, Tahmini Tutar: ${route.price.toLocaleString('tr-TR')} ₺). Müsait misiniz?`);
      actionBtn.href = `https://wa.me/${TAXI_CONFIG.whatsappNumber}?text=${msg}`;
    }
  }

  // Location Swap button support
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const pVal = pickupSelect.value;
      const dVal = dropoffSelect.value;
      pickupSelect.value = dVal;
      dropoffSelect.value = pVal;
      calculate();

      // Micro-animation feedback
      swapBtn.style.transform = 'rotate(180deg) scale(1.15)';
      setTimeout(() => {
        swapBtn.style.transform = '';
      }, 300);
    });
  }

  pickupSelect.addEventListener('change', calculate);
  dropoffSelect.addEventListener('change', calculate);
  calculate();
}

// Global helper for interactive quick route presets
window.selectPreset = function (pickupVal, dropoffVal) {
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
