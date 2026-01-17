
document.addEventListener('DOMContentLoaded', () => {
    console.log('A101 Ege KDS sistemi yüklendi');
    const cannibalizationBtn = document.getElementById('cannibalization-btn');
    if (cannibalizationBtn) {
        cannibalizationBtn.addEventListener('click', loadCannibalization);
    }
    const competitorBtn = document.getElementById('competitor-btn');
    if (competitorBtn) {
        competitorBtn.addEventListener('click', loadCompetitorAnalysis);
    }
    const planogramBtn = document.getElementById('planogram-btn');
    if (planogramBtn) {
        planogramBtn.addEventListener('click', loadPlanogramSuggestions);
    }
    const rentBtn = document.getElementById('rent-btn');
    if (rentBtn) {
        rentBtn.addEventListener('click', loadRentAnalysis);
    }
    const logisticsBtn = document.getElementById('logistics-btn');
    if (logisticsBtn) {
        logisticsBtn.addEventListener('click', loadLogisticsAnalysis);
    }
    const hrBtn = document.getElementById('hr-btn');
    if (hrBtn) {
        hrBtn.addEventListener('click', loadHRAnalysis);
    }
});

async function loadMagazalar() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const tableEl = document.getElementById('magazalar-table');
    const tbodyEl = document.getElementById('magazalar-tbody');
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        tableEl.style.display = 'none';
        const response = await fetch('/api/magazalar');
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Veri çekilirken hata oluştu');
        }
        if (result.success && result.data) {
            tbodyEl.innerHTML = '';
            if (result.data.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="9" style="text-align: center;">Henüz mağaza kaydı bulunmamaktadır.</td></tr>';
            } else {
                result.data.forEach(magaza => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${magaza.magaza_id}</td>
                        <td>${magaza.magaza_adi || '-'}</td>
                        <td>${magaza.ilce_id || '-'}</td>
                        <td>${magaza.magaza_m2 || '-'}</td>
                        <td>${magaza.rakip_sayisi_yakin || '-'}</td>
                        <td>${magaza.depoya_uzaklik_km || '-'}</td>
                        <td>${magaza.acilis_tarihi ? new Date(magaza.acilis_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                        <td style="text-align: center;">
                            <button onclick="editMagaza(${magaza.magaza_id})" class="btn-edit" style="padding: 4px 8px; margin: 2px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Düzenle</button>
                            <button onclick="deleteMagaza(${magaza.magaza_id})" class="btn-delete" style="padding: 4px 8px; margin: 2px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Sil</button>
                        </td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }
            loadingEl.style.display = 'none';
            tableEl.style.display = 'table';
            console.log(`${result.count} mağaza yüklendi`);
        } else {
            throw new Error('Beklenmeyen veri formatı');
        }
    } catch (error) {
        console.error('Mağaza listesi yüklenirken hata:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.style.display = 'block';
    }
}

function openMagazaModal(magazaId = null) {
    const modal = document.getElementById('magaza-modal');
    const form = document.getElementById('magaza-form');
    const modalTitle = document.getElementById('magaza-modal-title');
    
    if (magazaId) {
        modalTitle.textContent = 'Mağaza Düzenle';
        // Mevcut mağaza verilerini yükle
        fetch(`/api/magazalar/${magazaId}`)
            .then(res => res.json())
            .then(result => {
                if (result.success && result.data) {
                    const magaza = result.data;
                    document.getElementById('magaza_adi').value = magaza.magaza_adi || '';
                    document.getElementById('ilce_id').value = magaza.ilce_id || '';
                    document.getElementById('magaza_m2').value = magaza.magaza_m2 || '';
                    document.getElementById('rakip_sayisi_yakin').value = magaza.rakip_sayisi_yakin || '';
                    document.getElementById('depoya_uzaklik_km').value = magaza.depoya_uzaklik_km || '';
                    document.getElementById('acilis_tarihi').value = magaza.acilis_tarihi ? magaza.acilis_tarihi.split('T')[0] : '';
                    document.getElementById('enlem').value = magaza.enlem || '';
                    document.getElementById('boylam').value = magaza.boylam || '';
                    document.getElementById('demografik_yapi').value = magaza.demografik_yapi || '';
                    form.dataset.magazaId = magazaId;
                }
            });
    } else {
        modalTitle.textContent = 'Yeni Mağaza Ekle';
        form.reset();
        delete form.dataset.magazaId;
    }
    
    modal.style.display = 'block';
}

function closeMagazaModal() {
    const modal = document.getElementById('magaza-modal');
    modal.style.display = 'none';
}

async function saveMagaza(event) {
    event.preventDefault();
    const form = document.getElementById('magaza-form');
    const formData = {
        magaza_adi: document.getElementById('magaza_adi').value,
        ilce_id: document.getElementById('ilce_id').value || null,
        magaza_m2: document.getElementById('magaza_m2').value || null,
        rakip_sayisi_yakin: document.getElementById('rakip_sayisi_yakin').value || null,
        depoya_uzaklik_km: document.getElementById('depoya_uzaklik_km').value || null,
        acilis_tarihi: document.getElementById('acilis_tarihi').value || null,
        enlem: document.getElementById('enlem').value || null,
        boylam: document.getElementById('boylam').value || null,
        demografik_yapi: document.getElementById('demografik_yapi').value || null
    };

    const magazaId = form.dataset.magazaId;
    const url = magazaId ? `/api/magazalar/${magazaId}` : '/api/magazalar';
    const method = magazaId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            let mesaj = result.message || 'Mağaza başarıyla kaydedildi';
            
            if (result.warning) {
                mesaj += '\n\n⚠️ ' + result.warning;
                if (result.yakın_magazalar && result.yakın_magazalar.length > 0) {
                    mesaj += '\n\nYakın mağazalar:';
                    result.yakın_magazalar.forEach(m => {
                        mesaj += `\n- ${m.magaza_adi} (${m.distance_meters}m uzaklıkta)`;
                    });
                }
            }
            
            alert(mesaj);
            closeMagazaModal();
            loadMagazalar();
        } else {
            alert(result.message || 'Hata: ' + (result.error || 'Bilinmeyen hata'));
        }
    } catch (error) {
        console.error('Mağaza kaydedilirken hata:', error);
        alert('Hata: ' + error.message);
    }
}

async function editMagaza(id) {
    openMagazaModal(id);
}

async function deleteMagaza(id) {
    if (!confirm(`Mağaza #${id} silinecek. Emin misiniz?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/magazalar/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message || 'Mağaza başarıyla silindi');
            loadMagazalar();
        } else {
            alert(result.message || 'Hata: ' + (result.error || 'Bilinmeyen hata'));
        }
    } catch (error) {
        console.error('Mağaza silinirken hata:', error);
        alert('Hata: ' + error.message);
    }
}

async function loadCannibalization() {
    const loadingEl = document.getElementById('analiz-loading');
    const errorEl = document.getElementById('analiz-error');
    const warningEl = document.getElementById('analiz-warning');
    const tableEl = document.getElementById('cannibalization-table');
    const tbodyEl = document.getElementById('cannibalization-tbody');
    const btnEl = document.getElementById('cannibalization-btn');
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        warningEl.style.display = 'none';
        tableEl.style.display = 'none';
        btnEl.disabled = true;
        btnEl.textContent = 'Analiz yapılıyor...';
        const response = await fetch('/api/analiz/cannibalization');
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Analiz yapılırken hata oluştu');
        }
        if (result.success && result.data) {
            if (result.warning) {
                warningEl.textContent = result.warning;
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
            tbodyEl.innerHTML = '';
            if (result.data.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="3" style="text-align: center;">300m içinde yakın mağaza çifti bulunamadı.</td></tr>';
            } else {
                result.data.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.storeA} (ID: ${item.storeA_id})</td>
                        <td>${item.storeB} (ID: ${item.storeB_id})</td>
                        <td>${item.distance}</td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }
            loadingEl.style.display = 'none';
            tableEl.style.display = 'table';
            console.log(`${result.count} yakın mağaza çifti bulundu`);
        } else {
            throw new Error('Beklenmeyen veri formatı');
        }
    } catch (error) {
        console.error('Cannibalization analizi yüklenirken hata:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.style.display = 'block';
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = 'Yamyamlık Analizini Başlat';
    }
}

async function loadCompetitorAnalysis() {
    const loadingEl = document.getElementById('competitor-loading');
    const errorEl = document.getElementById('competitor-error');
    const warningEl = document.getElementById('competitor-warning');
    const tableEl = document.getElementById('competitor-table');
    const tbodyEl = document.getElementById('competitor-tbody');
    const btnEl = document.getElementById('competitor-btn');
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        warningEl.style.display = 'none';
        tableEl.style.display = 'none';
        btnEl.disabled = true;
        btnEl.textContent = 'Analiz yapılıyor...';
        const response = await fetch('/api/analiz/competitor');
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Analiz yapılırken hata oluştu');
        }
        if (result.success && result.data) {
            if (result.warning) {
                warningEl.textContent = result.warning;
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
            tbodyEl.innerHTML = '';
            if (result.data.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="5" style="text-align: center;">Analiz için veri bulunamadı.</td></tr>';
            } else {
                result.data.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.magaza} (ID: ${item.magaza_id})</td>
                        <td>${item.bim_sayisi}</td>
                        <td>${item.sok_sayisi}</td>
                        <td>${item.migros_sayisi}</td>
                        <td>${item.toplam_rakip}</td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }
            loadingEl.style.display = 'none';
            tableEl.style.display = 'table';
            console.log(`${result.count} mağaza için rekabet analizi tamamlandı`);
        } else {
            throw new Error('Beklenmeyen veri formatı');
        }
    } catch (error) {
        console.error('Competitor analizi yüklenirken hata:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.style.display = 'block';
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = 'Rakip Analizi';
    }
}

async function loadPlanogramSuggestions() {
    const loadingEl = document.getElementById('planogram-loading');
    const errorEl = document.getElementById('planogram-error');
    const warningEl = document.getElementById('planogram-warning');
    const tableEl = document.getElementById('planogram-table');
    const tbodyEl = document.getElementById('planogram-tbody');
    const btnEl = document.getElementById('planogram-btn');
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        warningEl.style.display = 'none';
        tableEl.style.display = 'none';
        btnEl.disabled = true;
        btnEl.textContent = 'Analiz yapılıyor...';
        const response = await fetch('/api/planogram/suggestions');
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Analiz yapılırken hata oluştu');
        }
        if (result.success && result.data) {
            if (result.warning) {
                warningEl.textContent = result.warning;
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
            tbodyEl.innerHTML = '';
            if (result.data.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="7" style="text-align: center;">Analiz için veri bulunamadı.</td></tr>';
            } else {
                result.data.forEach(item => {
                    const row = document.createElement('tr');
                    if (item.durum_rengi === 'Yesil') {
                        row.style.backgroundColor = '#d4edda';
                    } else if (item.durum_rengi === 'Kirmizi') {
                        row.style.backgroundColor = '#f8d7da';
                    }
                    row.innerHTML = `
                        <td>${item.magaza_adi} (ID: ${item.magaza_id})</td>
                        <td>${item.ilce_adi}</td>
                        <td>${item.gercek_kategori}</td>
                        <td>${item.hedef_kategori}</td>
                        <td>${item.hedef_ciro_payi}%</td>
                        <td>${item.toplam_ciro ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(item.toplam_ciro) : '-'}</td>
                        <td>${item.durum_mesaji}</td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }
            loadingEl.style.display = 'none';
            tableEl.style.display = 'table';
            console.log(`${result.count} mağaza için planogram analizi tamamlandı`);
        } else {
            throw new Error('Beklenmeyen veri formatı');
        }
    } catch (error) {
        console.error('Planogram analizi yüklenirken hata:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.style.display = 'block';
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = 'Planogram Analizi';
    }
}

async function loadRentAnalysis() {
    const loadingEl = document.getElementById('rent-loading');
    const errorEl = document.getElementById('rent-error');
    const warningEl = document.getElementById('rent-warning');
    const infoEl = document.getElementById('rent-info');
    const tableEl = document.getElementById('rent-table');
    const tbodyEl = document.getElementById('rent-tbody');
    const btnEl = document.getElementById('rent-btn');
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        warningEl.style.display = 'none';
        infoEl.style.display = 'none';
        tableEl.style.display = 'none';
        btnEl.disabled = true;
        btnEl.textContent = 'Analiz yapılıyor...';
        const response = await fetch('/api/analiz/kira-analizi');
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Analiz yapılırken hata oluştu');
        }
        if (result.success && result.data) {
            if (result.en_guncel_ay) {
                infoEl.textContent = `Analiz Tarihi: ${result.en_guncel_ay}`;
                infoEl.style.display = 'block';
            }
            if (result.warning) {
                warningEl.textContent = result.warning;
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
            tbodyEl.innerHTML = '';
            if (result.data.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="9" style="text-align: center;">Analiz için veri bulunamadı.</td></tr>';
            } else {
                result.data.forEach(item => {
                    const row = document.createElement('tr');
                    if (item.durum_rengi === 'Yesil') {
                        row.style.backgroundColor = '#d4edda';
                    } else if (item.durum_rengi === 'Sari') {
                        row.style.backgroundColor = '#fff3cd';
                    } else if (item.durum_rengi === 'Kirmizi') {
                        row.style.backgroundColor = '#f8d7da';
                    }
                    row.innerHTML = `
                        <td>${item.magaza_adi} (ID: ${item.magaza_id})</td>
                        <td>${item.ilce_adi}</td>
                        <td>${item.magaza_m2} m²</td>
                        <td>${item.donem_ay}</td>
                        <td>${item.toplam_ciro ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(item.toplam_ciro) : '-'}</td>
                        <td>${item.kira_gideri ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(item.kira_gideri) : '-'}</td>
                        <td><strong>${item.kira_yuku_orani !== null ? item.kira_yuku_orani + '%' : '-'}</strong></td>
                        <td>${item.m2_verimliligi !== null ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(item.m2_verimliligi) + ' ₺/m²' : '-'}</td>
                        <td>${item.durum_mesaji}</td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }
            loadingEl.style.display = 'none';
            tableEl.style.display = 'table';
            console.log(`${result.count} mağaza için kira analizi tamamlandı`);
        } else {
            throw new Error('Beklenmeyen veri formatı');
        }
    } catch (error) {
        console.error('Kira analizi yüklenirken hata:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.style.display = 'block';
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = 'Kira Analizi';
    }
}

async function loadLogisticsAnalysis() {
    const loadingEl = document.getElementById('logistics-loading');
    const errorEl = document.getElementById('logistics-error');
    const warningEl = document.getElementById('logistics-warning');
    const infoEl = document.getElementById('logistics-info');
    const tableEl = document.getElementById('logistics-table');
    const tbodyEl = document.getElementById('logistics-tbody');
    const btnEl = document.getElementById('logistics-btn');
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        warningEl.style.display = 'none';
        infoEl.style.display = 'none';
        tableEl.style.display = 'none';
        btnEl.disabled = true;
        btnEl.textContent = 'Analiz yapılıyor...';
        const response = await fetch('/api/analiz/lojistik-analizi');
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Analiz yapılırken hata oluştu');
        }
        if (result.success && result.data) {
            if (result.aciklama) {
                infoEl.textContent = result.aciklama;
                infoEl.style.display = 'block';
            }
            if (result.warning) {
                warningEl.textContent = result.warning;
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
            tbodyEl.innerHTML = '';
            if (result.data.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="7" style="text-align: center;">Turistik bölgede mağaza bulunamadı veya yeterli veri yok.</td></tr>';
            } else {
                result.data.forEach(item => {
                    const row = document.createElement('tr');
                    if (item.durum_rengi === 'Yesil') {
                        row.style.backgroundColor = '#d4edda';
                    } else if (item.durum_rengi === 'Sari') {
                        row.style.backgroundColor = '#fff3cd';
                    } else if (item.durum_rengi === 'Kirmizi') {
                        row.style.backgroundColor = '#f8d7da';
                    }
                    row.innerHTML = `
                        <td>${item.magaza_adi} (ID: ${item.magaza_id})</td>
                        <td>${item.demografik_yapi}</td>
                        <td>${item.depoya_uzaklik_km} km</td>
                        <td>${item.yaz_hizi !== null ? item.yaz_hizi : '-'}</td>
                        <td>${item.kis_hizi !== null ? item.kis_hizi : '-'}</td>
                        <td><strong>${item.mevsim_katsayisi !== null ? item.mevsim_katsayisi + 'x' : '-'}</strong></td>
                        <td>${item.durum_mesaji}</td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }
            loadingEl.style.display = 'none';
            tableEl.style.display = 'table';
            console.log(`${result.count} mağaza için lojistik analizi tamamlandı`);
        } else {
            throw new Error('Beklenmeyen veri formatı');
        }
    } catch (error) {
        console.error('Lojistik analizi yüklenirken hata:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.style.display = 'block';
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = 'Lojistik Analizi';
    }
}

async function loadHRAnalysis() {
    const loadingEl = document.getElementById('hr-loading');
    const errorEl = document.getElementById('hr-error');
    const warningEl = document.getElementById('hr-warning');
    const infoEl = document.getElementById('hr-info');
    const statsEl = document.getElementById('hr-stats');
    const tableEl = document.getElementById('hr-table');
    const tbodyEl = document.getElementById('hr-tbody');
    const btnEl = document.getElementById('hr-btn');
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        warningEl.style.display = 'none';
        infoEl.style.display = 'none';
        statsEl.style.display = 'none';
        tableEl.style.display = 'none';
        btnEl.disabled = true;
        btnEl.textContent = 'Analiz yapılıyor...';
        const response = await fetch('/api/analiz/ik-analizi');
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Analiz yapılırken hata oluştu');
        }
        if (result.success && result.data) {
            if (result.en_guncel_donem) {
                infoEl.textContent = `Analiz Dönemi: ${result.en_guncel_donem} | ${result.aciklama || ''}`;
                infoEl.style.display = 'block';
            }
            if (result.istatistikler) {
                const stats = result.istatistikler;
                statsEl.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Toplam Mağaza:</span>
                            <span class="stat-value">${stats.toplam_magaza}</span>
                        </div>
                        <div class="stat-item kritik">
                            <span class="stat-label">Kritik:</span>
                            <span class="stat-value">${stats.kritik_sayisi}</span>
                        </div>
                        <div class="stat-item uyari">
                            <span class="stat-label">Uyarı:</span>
                            <span class="stat-value">${stats.uyari_sayisi}</span>
                        </div>
                        <div class="stat-item basarili">
                            <span class="stat-label">Başarılı:</span>
                            <span class="stat-value">${stats.basarili_sayisi}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Ort. Devir Hızı:</span>
                            <span class="stat-value">${stats.ortalama_devir_hizi}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Ort. Memnuniyet:</span>
                            <span class="stat-value">${stats.ortalama_memnuniyet}/10</span>
                        </div>
                    </div>
                `;
                statsEl.style.display = 'block';
            }
            if (result.warning) {
                warningEl.textContent = result.warning;
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
            tbodyEl.innerHTML = '';
            if (result.data.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="6" style="text-align: center;">Analiz için veri bulunamadı.</td></tr>';
            } else {
                result.data.forEach(item => {
                    const row = document.createElement('tr');
                    if (item.durum_rengi === 'Yesil') {
                        row.style.backgroundColor = '#d4edda';
                    } else if (item.durum_rengi === 'Sari') {
                        row.style.backgroundColor = '#fff3cd';
                    } else if (item.durum_rengi === 'Turuncu') {
                        row.style.backgroundColor = '#ffe0b2';
                    } else if (item.durum_rengi === 'Kirmizi') {
                        row.style.backgroundColor = '#f8d7da';
                    }
                    let memnuniyetEmoji = '';
                    if (item.musteri_memnuniyet_puani >= 8) {
                        memnuniyetEmoji = '😊';
                    } else if (item.musteri_memnuniyet_puani >= 6) {
                        memnuniyetEmoji = '😐';
                    } else {
                        memnuniyetEmoji = '😞';
                    }
                    row.innerHTML = `
                        <td>${item.ilce_adi || '-'}</td>
                        <td>${item.magaza_adi} (ID: ${item.magaza_id})</td>
                        <td style="text-align: center;">${item.personel_sayisi}</td>
                        <td style="text-align: center;"><strong>${item.personel_devir_hizi}%</strong></td>
                        <td style="text-align: center;">${item.musteri_memnuniyet_puani}/10 ${memnuniyetEmoji}</td>
                        <td>${item.durum_mesaji}</td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }
            loadingEl.style.display = 'none';
            tableEl.style.display = 'table';
            console.log(`${result.count} mağaza için İK analizi tamamlandı`);
        } else {
            throw new Error('Beklenmeyen veri formatı');
        }
    } catch (error) {
        console.error('İK analizi yüklenirken hata:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.style.display = 'block';
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = 'İK Analizi';
    }
}

