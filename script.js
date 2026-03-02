class SigaraTakvimi {
    constructor() {
        this.currentDate = new Date();
        this.today = new Date();
        this.cigarettePrice = 85;
        this.dayData = {}; // { dateStr: { red, blue, clickCount, price } }
        this.savingsResetDate = null; // Toplam birikimi bu tarihten itibaren say
        this.lastMilestoneCelebrated = 0;

        this.monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];

        this.milestones = [100, 500, 1000, 5000];

        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.renderCalendar();
        this.updateStats();
        this.renderAnnualSummary();
    }

    bindEvents() {
        document.getElementById('prevBtn').addEventListener('click', () => this.previousMonth());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextMonth());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeBtn').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSavings());

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.closeSettings();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSettings();
        });

        // Annual summary accordion
        document.getElementById('annualToggle').addEventListener('click', () => {
            const body = document.getElementById('annualBody');
            const toggle = document.getElementById('annualToggle');
            const isOpen = body.classList.toggle('open');
            toggle.querySelector('.chevron').style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    previousMonth() {
        const calendar = document.getElementById('calendar');
        calendar.style.transform = 'translateX(-100%)';
        calendar.style.opacity = '0.5';
        setTimeout(() => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
            this.updateStats();
            calendar.style.transform = 'translateX(100%)';
            requestAnimationFrame(() => {
                calendar.style.transform = 'translateX(0)';
                calendar.style.opacity = '1';
            });
        }, 150);
    }

    nextMonth() {
        const calendar = document.getElementById('calendar');
        calendar.style.transform = 'translateX(100%)';
        calendar.style.opacity = '0.5';
        setTimeout(() => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
            this.updateStats();
            calendar.style.transform = 'translateX(-100%)';
            requestAnimationFrame(() => {
                calendar.style.transform = 'translateX(0)';
                calendar.style.opacity = '1';
            });
        }, 150);
    }

    renderCalendar() {
        this.updateMonthDisplay();
        this.renderDays();
    }

    updateMonthDisplay() {
        const monthElement = document.getElementById('currentMonth');
        const monthName = this.monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        monthElement.textContent = `${monthName} ${year}`;
    }

    renderDays() {
        const daysContainer = document.getElementById('days');
        daysContainer.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();

        // Önceki ayın son günleri
        const prevMonth = new Date(year, month, 0);
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            daysContainer.appendChild(this.createDayElement(day, true));
        }

        // Bu ayın günleri
        for (let day = 1; day <= lastDay.getDate(); day++) {
            daysContainer.appendChild(this.createDayElement(day, false));
        }

        // Sonraki ay dolgu
        const remaining = 42 - daysContainer.children.length;
        for (let day = 1; day <= remaining; day++) {
            daysContainer.appendChild(this.createDayElement(day, true));
        }
    }

    createDayElement(day, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day';
        dayElement.textContent = day;

        if (isOtherMonth) {
            dayElement.classList.add('other-month');
            return dayElement;
        }

        const dateStr = this.getDateString(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        const currentDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);

        if (this.isSameDay(currentDay, this.today)) {
            dayElement.classList.add('today');
        }

        if (this.dayData[dateStr]) {
            const data = this.dayData[dateStr];
            if (data.red) {
                const redDot = document.createElement('div');
                redDot.className = 'day-dot red';
                dayElement.appendChild(redDot);
            }
            if (data.blue) {
                const blueDot = document.createElement('div');
                blueDot.className = 'day-dot blue';
                dayElement.appendChild(blueDot);
            }
        }

        dayElement.addEventListener('click', () => this.onDayClick(dateStr));
        return dayElement;
    }

    onDayClick(dateStr) {
        if (!this.dayData[dateStr]) {
            this.dayData[dateStr] = { red: false, blue: false, clickCount: 0 };
        }

        const data = this.dayData[dateStr];
        if (data.clickCount === undefined) data.clickCount = 0;

        data.clickCount = (data.clickCount + 1) % 4;

        switch (data.clickCount) {
            case 1: data.red = true; data.blue = false; break;
            case 2: data.red = true; data.blue = true; break;
            case 3: data.red = true; data.blue = false; break;
            case 0: data.red = false; data.blue = false; break;
        }

        // Tıklama anındaki fiyatı kaydet
        data.price = this.cigarettePrice;

        this.saveData();
        this.renderCalendar();
        this.updateStats();
        this.renderAnnualSummary();
        this.vibrate();
    }

    vibrate() {
        if (navigator.vibrate) navigator.vibrate(50);
    }

    // ─── İstatistik Hesaplama ─────────────────────────────────────────────────

    /** Belirli bir tarih kümesi için kurtarılan parayı hesapla */
    _calcSaved(entries) {
        let total = 0;
        for (const [, data] of entries) {
            if (data.red) total += (data.price || this.cigarettePrice);
        }
        return total;
    }

    /** Belirli bir tarih kümesi için toplam yatırımı hesapla */
    _calcInvestment(entries) {
        // entries: [[dateStr, data], ...] sıralanmış
        let total = 0;
        let redAcc = 0;
        let redAccPrice = 0;
        for (const [, data] of entries) {
            if (data.red) {
                redAcc++;
                redAccPrice += (data.price || this.cigarettePrice);
            }
            if (data.blue) {
                total += redAccPrice;
                redAcc = 0;
                redAccPrice = 0;
            }
        }
        return total;
    }

    /** Tüm girdileri sıralı dizi olarak döndür (isteğe bağlı resetDate filtresi) */
    _allEntries(applyReset = false) {
        let entries = Object.entries(this.dayData).sort(([a], [b]) => a.localeCompare(b));
        if (applyReset && this.savingsResetDate) {
            entries = entries.filter(([dateStr]) => dateStr >= this.savingsResetDate);
        }
        return entries;
    }

    /** Belirli ay için girdiler */
    _monthEntries(year, month) {
        const prefix = `${year}-${(month + 1).toString().padStart(2, '0')}-`;
        return Object.entries(this.dayData)
            .filter(([d]) => d.startsWith(prefix))
            .sort(([a], [b]) => a.localeCompare(b));
    }

    calculateSavedMoney() {
        return this._calcSaved(this._allEntries(true));
    }

    calculateTotalInvestment() {
        return this._calcInvestment(this._allEntries(true));
    }

    calculateSavedMoneyForMonth(year, month) {
        return this._calcSaved(this._monthEntries(year, month));
    }

    calculateTotalInvestmentForMonth(year, month) {
        return this._calcInvestment(this._monthEntries(year, month));
    }

    /** Bugünden geriye ardışık kırmızılı günleri say */
    calculateStreak() {
        let streak = 0;
        const cursor = new Date(this.today);
        while (true) {
            const dateStr = this.getDateString(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
            if (this.dayData[dateStr] && this.dayData[dateStr].red) {
                streak++;
                cursor.setDate(cursor.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    // ─── Güncelleme ───────────────────────────────────────────────────────────

    updateStats() {
        const y = this.currentDate.getFullYear();
        const m = this.currentDate.getMonth();

        const savedTotal = this.calculateSavedMoney();
        const investTotal = this.calculateTotalInvestment();
        const savedMonth = this.calculateSavedMoneyForMonth(y, m);
        const investMonth = this.calculateTotalInvestmentForMonth(y, m);
        const streak = this.calculateStreak();

        document.getElementById('savedMoney').textContent = `${savedTotal.toLocaleString('tr-TR')} ₺`;
        document.getElementById('totalInvestment').textContent = `${investTotal.toLocaleString('tr-TR')} ₺`;
        document.getElementById('savedMoneyMonth').textContent = `${savedMonth.toLocaleString('tr-TR')} ₺`;
        document.getElementById('investMonthEl').textContent = `${investMonth.toLocaleString('tr-TR')} ₺`;

        // Streak bandı
        const streakBand = document.getElementById('streakBand');
        const streakNum = document.getElementById('streakCount');
        if (streak > 0) {
            streakNum.textContent = `🔥 ${streak} günlük seri`;
            streakBand.style.display = 'flex';
        } else {
            streakBand.style.display = 'none';
        }

        // Reset tarihi notu
        const resetNote = document.getElementById('resetNote');
        if (this.savingsResetDate) {
            const [yr, mo, dy] = this.savingsResetDate.split('-');
            resetNote.textContent = `${dy}.${mo}.${yr} tarihinden itibaren`;
            resetNote.style.display = 'block';
        } else {
            resetNote.style.display = 'none';
        }

        this.checkMilestones(savedTotal);
    }

    checkMilestones(total) {
        for (const ms of [...this.milestones].reverse()) {
            if (total >= ms && ms > this.lastMilestoneCelebrated) {
                this.lastMilestoneCelebrated = ms;
                this.saveData();
                this.showMilestoneToast(ms);
                break;
            }
        }
    }

    // ─── Yıllık Özet ─────────────────────────────────────────────────────────

    renderAnnualSummary() {
        const container = document.getElementById('annualContent');
        container.innerHTML = '';
        const currentYear = this.today.getFullYear();

        for (let yr = currentYear; yr >= currentYear - 2; yr--) {
            const section = document.createElement('div');
            section.className = 'annual-year';

            const title = document.createElement('div');
            title.className = 'annual-year-title';
            title.textContent = yr;
            section.appendChild(title);

            const table = document.createElement('table');
            table.className = 'annual-table';
            table.innerHTML = `<thead><tr><th>Ay</th><th>Kurtarılan</th><th>Yatırım</th></tr></thead>`;
            const tbody = document.createElement('tbody');

            let hasData = false;
            for (let mo = 0; mo < 12; mo++) {
                const saved = this.calculateSavedMoneyForMonth(yr, mo);
                const invest = this.calculateTotalInvestmentForMonth(yr, mo);
                if (saved === 0 && invest === 0) continue;
                hasData = true;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${this.monthNames[mo]}</td>
                    <td class="annual-val saved">${saved.toLocaleString('tr-TR')} ₺</td>
                    <td class="annual-val invest">${invest.toLocaleString('tr-TR')} ₺</td>
                `;
                tbody.appendChild(tr);
            }

            if (!hasData) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="3" class="annual-empty">Veri yok</td>`;
                tbody.appendChild(tr);
            }

            table.appendChild(tbody);
            section.appendChild(table);
            container.appendChild(section);
        }
    }

    // ─── Ayarlar / Modal ──────────────────────────────────────────────────────

    openSettings() {
        const modal = document.getElementById('settingsModal');
        document.getElementById('cigarettePrice').value = this.cigarettePrice;
        modal.classList.add('active');
        setTimeout(() => document.getElementById('cigarettePrice').focus(), 100);
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    saveSettings() {
        const newPrice = parseFloat(document.getElementById('cigarettePrice').value);
        if (newPrice && newPrice > 0) {
            this.cigarettePrice = newPrice;
            this.saveData();
            this.updateStats();
            this.closeSettings();
            this.showToast('Ayarlar kaydedildi!');
        } else {
            this.showToast('Geçerli bir fiyat girin!', 'error');
        }
    }

    resetSavings() {
        const confirmed = confirm('Toplam birikim sıfırlanacak. Takvim işaretleri ve aylık istatistikler korunacak. Devam etmek istiyor musunuz?');
        if (!confirmed) return;

        const now = this.today;
        this.savingsResetDate = this.getDateString(now.getFullYear(), now.getMonth(), now.getDate());
        this.lastMilestoneCelebrated = 0;
        this.saveData();
        this.updateStats();
        this.closeSettings();
        this.showToast('Birikim sıfırlandı.');
    }

    // ─── Toast / Bildirim ─────────────────────────────────────────────────────

    showMilestoneToast(amount) {
        const emojis = { 100: '🎉', 500: '🏆', 1000: '🌟', 5000: '🚀' };
        const emoji = emojis[amount] || '🎊';
        this.showToast(`${emoji} ${amount.toLocaleString('tr-TR')} ₺ birikti! Tebrikler!`, 'milestone');
    }

    showToast(message, type = 'success') {
        const colors = {
            success: '#34C759',
            error: '#FF3B30',
            milestone: 'linear-gradient(135deg, #FF9500, #FF3B30)'
        };
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.success};
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            font-size: ${type === 'milestone' ? '16px' : '14px'};
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            animation: toastIn 0.3s ease;
            white-space: nowrap;
            max-width: 90vw;
            text-align: center;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, type === 'milestone' ? 3500 : 2000);
    }

    // ─── Yardımcı ─────────────────────────────────────────────────────────────

    getDateString(year, month, day) {
        return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    isSameDay(d1, d2) {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    }

    saveData() {
        localStorage.setItem('sigaraTakvimi', JSON.stringify({
            cigarettePrice: this.cigarettePrice,
            dayData: this.dayData,
            savingsResetDate: this.savingsResetDate,
            lastMilestoneCelebrated: this.lastMilestoneCelebrated
        }));
    }

    loadData() {
        const saved = localStorage.getItem('sigaraTakvimi');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.cigarettePrice = data.cigarettePrice || 85;
                this.dayData = data.dayData || {};
                this.savingsResetDate = data.savingsResetDate || null;
                this.lastMilestoneCelebrated = data.lastMilestoneCelebrated || 0;
            } catch (e) {
                console.error('Veri yükleme hatası:', e);
            }
        }
    }
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to   { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => { new SigaraTakvimi(); });

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(r => console.log('SW registered:', r))
            .catch(e => console.log('SW error:', e));
    });
}