

let rentChart = null;
let planogramChart = null;
let map = null;
let markers = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('A101 Ege KDS Dashboard yükleniyor...');
    updateCurrentDate();
    initMap();
    refreshAllData();
    initTabButtons();
    initNavigation();
});

function updateCurrentDate() {
    const dateEl = document.getElementById('current-date');
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    dateEl.textContent = now.toLocaleDateString('tr-TR', options);
}

function initTabButtons() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function initMap() {
    const izmirCenter = [38.4237, 27.1428];
    map = L.map('map').setView(izmirCenter, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

async function refreshAllData() {
    console.log('Tüm modül verileri yenileniyor...');
    try {
        await Promise.all([
            loadRentAnalysis(),        
            loadPlanogramAnalysis(),   
            loadCannibalizationData(), 
            loadCompetitorAnalysis(),  
            loadLogisticsData(),       
            loadHRData(),              
            loadStoreLocations()       
        ]);
        console.log('Tüm modül verileri yüklendi.');
    } catch (error) {
        console.error('Veri yüklenirken hata:', error);
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

async function loadRentAnalysis() {
    const loadingEl = document.getElementById('rent-loading');
    try {
        const response = await fetch('/api/analiz/kira-analizi');
        const result = await response.json();
        if (result.success && result.data) {
            loadingEl.style.display = 'none';
            const data = result.data;
            const criticalStores = data.filter(d => d.kira_yuku_orani > 15);
            const warningStores = data.filter(d => d.kira_yuku_orani >= 10 && d.kira_yuku_orani <= 15);
            document.getElementById('total-stores').textContent = data.length;
            document.getElementById('critical-stores').textContent = criticalStores.length;
            document.getElementById('rent-critical-count').textContent = `${criticalStores.length} Kritik`;
            createRentChart(data);
            fillRentTable(data);
        }
    } catch (error) {
        console.error('Kira analizi hatası:', error);
        loadingEl.innerHTML = '<span style="color: #ef4444;">Veri yüklenemedi</span>';
    }
}

function createRentChart(data) {
    const ctx = document.getElementById('rentChart').getContext('2d');
    if (rentChart) {
        rentChart.destroy();
    }
    const sortedData = [...data]
        .sort((a, b) => b.kira_yuku_orani - a.kira_yuku_orani)
        .slice(0, 12);
    const labels = sortedData.map(d => d.magaza_adi?.substring(0, 12) || `M${d.magaza_id}`);
    const values = sortedData.map(d => d.kira_yuku_orani || 0);
    const colors = sortedData.map(d => {
        if (d.kira_yuku_orani > 15) return '#ef4444';
        if (d.kira_yuku_orani >= 10) return '#f59e0b';
        return '#10b981';
    });
    rentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kira Yükü (%)',
                data: values,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        callback: (v) => '%' + v
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 9 }
                    }
                }
            }
        }
    });
}

function fillRentTable(data) {
    const tbody = document.getElementById('rent-table-body');
    const sortedData = [...data].sort((a, b) => b.kira_yuku_orani - a.kira_yuku_orani);
    tbody.innerHTML = sortedData.map(item => {
        let statusClass = 'success';
        let statusText = 'Başarılı';
        if (item.kira_yuku_orani > 15) {
            statusClass = 'critical';
            statusText = 'Kritik';
        } else if (item.kira_yuku_orani >= 10) {
            statusClass = 'warning';
            statusText = 'Dikkat';
        }
        return `
            <tr>
                <td><strong>${item.magaza_adi || 'M' + item.magaza_id}</strong></td>
                <td>${item.ilce_adi || '-'}</td>
                <td>${formatCurrency(item.toplam_ciro || 0)}</td>
                <td>${formatCurrency(item.kira_gideri || 0)}</td>
                <td><strong>%${item.kira_yuku_orani || 0}</strong></td>
                <td>${item.m2_verimliligi ? formatCurrency(item.m2_verimliligi) + '/m²' : '-'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

async function loadPlanogramAnalysis() {
    const loadingEl = document.getElementById('planogram-loading');
    try {
        const response = await fetch('/api/planogram/suggestions');
        const result = await response.json();
        if (result.success && result.data) {
            loadingEl.style.display = 'none';
            const data = result.data;
            const successCount = data.filter(d => d.durum_rengi === 'Yesil').length;
            const failCount = data.filter(d => d.durum_rengi === 'Kirmizi').length;
            document.getElementById('success-stores').textContent = successCount;
            const successRate = data.length > 0 ? Math.round((successCount / data.length) * 100) : 0;
            document.getElementById('planogram-success-rate').textContent = `%${successRate} Uyum`;
            createPlanogramChart(successCount, failCount);
            fillPlanogramTable(data);
        }
    } catch (error) {
        console.error('Planogram analizi hatası:', error);
        loadingEl.innerHTML = '<span style="color: #ef4444;">Veri yüklenemedi</span>';
    }
}

function createPlanogramChart(successCount, failCount) {
    const ctx = document.getElementById('planogramChart').getContext('2d');
    if (planogramChart) {
        planogramChart.destroy();
    }
    const total = successCount + failCount;
    const percentage = total > 0 ? Math.round((successCount / total) * 100) : 0;
    planogramChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hedef Tutan', 'Hedef Tutmayan'],
            datasets: [{
                data: [successCount, failCount],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        font: { size: 11 }
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function(chart) {
                const { width, height, ctx } = chart;
                ctx.restore();
                ctx.font = 'bold 24px Inter';
                ctx.fillStyle = '#1a1a2e';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`%${percentage}`, width / 2, height / 2 - 8);
                ctx.font = '10px Inter';
                ctx.fillStyle = '#64748b';
                ctx.fillText('Başarı Oranı', width / 2, height / 2 + 12);
                ctx.save();
            }
        }]
    });
}

function fillPlanogramTable(data) {
    const tbody = document.getElementById('planogram-table-body');
    tbody.innerHTML = data.map(item => {
        const statusClass = item.durum_rengi === 'Yesil' ? 'success' : 'critical';
        const statusText = item.durum_rengi === 'Yesil' ? 'Uyumlu' : 'Uyumsuz';
        return `
            <tr>
                <td><strong>${item.magaza_adi || 'M' + item.magaza_id}</strong></td>
                <td>${item.ilce_adi || '-'}</td>
                <td>${item.gercek_kategori || '-'}</td>
                <td>${item.hedef_kategori || '-'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

async function loadCannibalizationData() {
    try {
        const response = await fetch('/api/analiz/cannibalization');
        const result = await response.json();
        if (result.success && result.data) {
            document.getElementById('cannibalization-count').textContent = result.data.length;
            fillCannibalizationTable(result.data);
        }
    } catch (error) {
        console.error('İç rekabet analizi hatası:', error);
        document.getElementById('cannibalization-count').textContent = '0';
    }
}

function fillCannibalizationTable(data) {
    const tbody = document.getElementById('cannibalization-table-body');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#64748b;">300m içinde yakın mağaza bulunamadı</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(item => `
        <tr>
            <td><strong>${item.storeA || item.magaza_a || '-'}</strong></td>
            <td><strong>${item.storeB || item.magaza_b || '-'}</strong></td>
            <td>${item.distance || item.mesafe || '-'}</td>
            <td><span class="status-badge warning">Yamyamlık Riski</span></td>
        </tr>
    `).join('');
}

async function loadCompetitorAnalysis() {
    try {
        const response = await fetch('/api/analiz/competitor');
        const result = await response.json();
        if (result.success && result.data) {
            fillCompetitionTable(result.data);
        }
    } catch (error) {
        console.error('Dış rekabet analizi hatası:', error);
    }
}

function fillCompetitionTable(data) {
    const tbody = document.getElementById('competition-table-body');
    const sortedData = [...data].sort((a, b) => b.toplam_rakip - a.toplam_rakip);
    tbody.innerHTML = sortedData.map(item => `
        <tr>
            <td><strong>${item.magaza || 'M' + item.magaza_id}</strong></td>
            <td>${item.bim_sayisi || 0}</td>
            <td>${item.sok_sayisi || 0}</td>
            <td>${item.migros_sayisi || 0}</td>
            <td><strong>${item.toplam_rakip || 0}</strong></td>
        </tr>
    `).join('');
}

async function loadLogisticsData() {
    try {
        const response = await fetch('/api/analiz/lojistik-analizi');
        const result = await response.json();
        if (result.success && result.data) {
            fillLogisticsTable(result.data);
        }
    } catch (error) {
        console.error('Lojistik analizi hatası:', error);
    }
}

function fillLogisticsTable(data) {
    const tbody = document.getElementById('logistics-table-body');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#64748b;">Turistik bölge verisi bulunamadı</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(item => {
        let statusClass = 'success';
        if (item.durum_rengi === 'Kirmizi') statusClass = 'critical';
        else if (item.durum_rengi === 'Sari') statusClass = 'warning';
        return `
            <tr>
                <td><strong>${item.magaza_adi || 'M' + item.magaza_id}</strong></td>
                <td>${item.demografik_yapi || '-'}</td>
                <td>${item.depoya_uzaklik_km || '-'} km</td>
                <td>${item.yaz_hizi || '-'}</td>
                <td>${item.kis_hizi || '-'}</td>
                <td><strong>${item.mevsim_katsayisi || '-'}x</strong></td>
                <td><span class="status-badge ${statusClass}">${item.durum_rengi || '-'}</span></td>
            </tr>
        `;
    }).join('');
}

async function loadHRData() {
    try {
        const response = await fetch('/api/analiz/ik-analizi');
        const result = await response.json();
        if (result.success && result.data) {
            fillHRTable(result.data);
        }
    } catch (error) {
        console.error('İK analizi hatası:', error);
    }
}

function fillHRTable(data) {
    const tbody = document.getElementById('hr-table-body');
    tbody.innerHTML = data.map(item => {
        let statusClass = 'success';
        if (item.durum_rengi === 'Kirmizi') statusClass = 'critical';
        else if (item.durum_rengi === 'Sari' || item.durum_rengi === 'Turuncu') statusClass = 'warning';
        return `
            <tr>
                <td><strong>${item.magaza_adi || 'M' + item.magaza_id}</strong></td>
                <td>${item.ilce_adi || '-'}</td>
                <td>${item.personel_sayisi || '-'}</td>
                <td>${item.personel_devir_hizi || '-'}%</td>
                <td>${item.musteri_memnuniyet_puani || '-'}/10</td>
                <td><span class="status-badge ${statusClass}">${item.durum_rengi || '-'}</span></td>
            </tr>
        `;
    }).join('');
}

async function loadStoreLocations() {
    try {
        const response = await fetch('/api/magazalar');
        const result = await response.json();
        const rentResponse = await fetch('/api/analiz/kira-analizi');
        const rentResult = await rentResponse.json();
        if (result.success && result.data) {
            const rentMap = {};
            if (rentResult.success && rentResult.data) {
                rentResult.data.forEach(r => {
                    rentMap[r.magaza_id] = r;
                });
            }
            markers.forEach(m => map.removeLayer(m));
            markers = [];
            result.data.forEach(store => {
                if (store.enlem && store.boylam) {
                    const rentData = rentMap[store.magaza_id];
                    let color = '#3b82f6'; 
                    if (rentData) {
                        if (rentData.kira_yuku_orani > 15) {
                            color = '#ef4444'; 
                        } else if (rentData.kira_yuku_orani < 10) {
                            color = '#10b981'; 
                        }
                    }
                    const markerIcon = L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="
                            width: 20px;
                            height: 20px;
                            background: ${color};
                            border: 2px solid white;
                            border-radius: 50%;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        "></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    const marker = L.marker([store.enlem, store.boylam], { icon: markerIcon })
                        .addTo(map)
                        .bindPopup(`
                            <div style="min-width: 180px;">
                                <strong>${store.magaza_adi}</strong><br>
                                <span style="font-size: 11px; color: #64748b;">
                                    ${rentData ? `Kira Yükü: %${rentData.kira_yuku_orani}` : ''}
                                </span>
                            </div>
                        `);
                    markers.push(marker);
                }
            });
            if (markers.length > 0) {
                const group = L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }
    } catch (error) {
        console.error('Mağaza konumları hatası:', error);
    }
}
