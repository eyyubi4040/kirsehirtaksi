/**
 * KIRŞEHİR TAKSİ (kirsehirtaksi.net) - MAIN CONTROLLER
 * Reactive Fare Calculator • Live Reservation • WhatsApp Dispatcher
 */

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
  phone: "05412134040",
  phoneFormatted: "0 541 213 40 40",
  whatsappNumber: "905412134040",
  
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

    // Try direct or reversed route key
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
      // Default estimation
      km = 8;
      mins = 12;
      estimatedPrice = Math.max(TAXI_CONFIG.minFare, Math.round(TAXI_CONFIG.openingFare + (km * TAXI_CONFIG.perKmRate)));
    }

    priceDisplay.textContent = estimatedPrice.toLocaleString('tr-TR');
    if (infoDisplay) {
      infoDisplay.textContent = `Yaklaşık ${km} km • ${mins} dakika varış süresi`;
    }

    // Update Action Button Link
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

/* ==========================================================================
   3. ONLINE REZERVASYON FORMU
   ========================================================================== */
function initReservationForm() {
  const form = document.getElementById('reservationForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rezervasyon Alınıyor...';

    const data = {
      name: form.elements['name']?.value || '',
      phone: form.elements['phone']?.value || '',
      pickup: form.elements['pickup']?.value || '',
      dropoff: form.elements['dropoff']?.value || '',
      date: form.elements['date']?.value || '',
      time: form.elements['time']?.value || '',
      vehicleType: form.elements['vehicleType']?.value || 'Standart Sarı Taksi',
      passengers: form.elements['passengers']?.value || '1',
      notes: form.elements['notes']?.value || ''
    };

    try {
      const res = await fetch('/api/rezervasyon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const json = await res.json();

      if (res.ok && json.success) {
        showSuccessModal(data, json.id);
        form.reset();
      } else {
        alert('Rezervasyon kaydedilirken bir hata oluştu: ' + (json.message || 'Lütfen tekrar deneyiniz.'));
      }
    } catch (err) {
      console.warn('API fallback, sending direct to WhatsApp', err);
      // Fallback directly to WhatsApp
      const msg = encodeURIComponent(`*KIRŞEHİR TAKSİ REZERVASYON TALEBİ*\n\n👤 *Yolcu:* ${data.name}\n📞 *Telefon:* ${data.phone}\n📍 *Kalkış:* ${data.pickup}\n🏁 *Varış:* ${data.dropoff}\n📅 *Tarih & Saat:* ${data.date} - ${data.time}\n🚖 *Araç:* ${data.vehicleType} (${data.passengers} Kişi)\n📝 *Not:* ${data.notes}`);
      window.open(`https://wa.me/${TAXI_CONFIG.whatsappNumber}?text=${msg}`, '_blank');
      form.reset();
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

function showSuccessModal(data, refId) {
  const modalHtml = `
    <div id="bookingModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:#111827;border:1px solid rgba(255,184,0,0.3);border-radius:24px;padding:36px;max-width:500px;width:100%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
        <div style="width:64px;height:64px;background:rgba(37,211,102,0.15);color:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;">
          <i class="fa-solid fa-check"></i>
        </div>
        <h3 style="font-size:22px;color:#fff;margin-bottom:8px;font-family:'Plus Jakarta Sans',sans-serif;">Rezervasyonunuz Alındı!</h3>
        <p style="color:#94A3B8;font-size:14px;margin-bottom:20px;">
          Talebiniz başarıyla sisteme kaydedildi. Referans Kodunuz: <b style="color:#FFB800;">${refId || '#KIR-TAKSI'}</b>
        </p>
        <div style="background:#1E293B;padding:16px;border-radius:12px;margin-bottom:24px;text-align:left;font-size:13.5px;color:#E2E8F0;line-height:1.6;">
          <div><b>Kalkış:</b> ${data.pickup}</div>
          <div><b>Varış:</b> ${data.dropoff}</div>
          <div><b>Zaman:</b> ${data.date} - ${data.time}</div>
          <div><b>Araç:</b> ${data.vehicleType}</div>
        </div>
        <div style="display:flex;gap:12px;">
          <a href="https://wa.me/${TAXI_CONFIG.whatsappNumber}?text=${encodeURIComponent(`Rezervasyon Kodum: ${refId}. Onaylamak için yazıyorum.`)}" target="_blank" style="flex:1;background:#25D366;color:#fff;font-weight:700;padding:12px;border-radius:999px;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp'ta Onayla
          </a>
          <button onclick="document.getElementById('bookingModal').remove()" style="padding:12px 20px;background:#334155;color:#fff;border:none;border-radius:999px;cursor:pointer;font-weight:600;font-size:14px;">
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
