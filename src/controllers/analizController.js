const Analiz = require('../models/Analiz');
const Performans = require('../models/Performans');
const Magaza = require('../models/Magaza');
const Il = require('../models/Il');
const Ilce = require('../models/Ilce');
const Rakip = require('../models/Rakip');
const KdsSonuc = require('../models/KdsSonuc');
const KategoriHedefi = require('../models/KategoriHedefi');

function calculateKDSPuani(row) {
    const toplamCiro = parseFloat(row.toplam_ciro) || 0;
    const kiraGideri = parseFloat(row.kira_gideri) || 0;
    const musteriMemnuniyet = parseFloat(row.musteri_memnuniyet_puani) || 0;
    const stokDevirHizi = parseFloat(row.stok_devir_hizi) || 0;
    const personelDevirHizi = parseFloat(row.personel_devir_hizi) || 0;
    let puanFinansal = 100;
    if (kiraGideri > 0 && toplamCiro > 0) {
        const kiraOrani = kiraGideri / toplamCiro;
        if (kiraOrani <= 0.05) {
            puanFinansal = 100;
        } else if (kiraOrani >= 0.20) {
            puanFinansal = 0;
        } else {
            puanFinansal = 100 - ((kiraOrani - 0.05) * 666);
            puanFinansal = Math.max(0, Math.min(100, puanFinansal));
        }
    }
    const puanMusteri = musteriMemnuniyet * 10;
    let puanOperasyon;
    if (stokDevirHizi >= 30 && stokDevirHizi <= 60) {
        puanOperasyon = 100; 
    } else if (stokDevirHizi < 15) {
        puanOperasyon = 30; 
    } else if (stokDevirHizi > 90) {
        puanOperasyon = 50; 
    } else {
        puanOperasyon = 70; 
    }
    let puanIK;
    if (personelDevirHizi <= 5) {
        puanIK = 100;
    } else if (personelDevirHizi >= 50) {
        puanIK = 0;
    } else {
        puanIK = 100 - (personelDevirHizi * 2);
        puanIK = Math.max(0, Math.min(100, puanIK));
    }
    const toplamKDSPuani = (puanFinansal * 0.40) + (puanMusteri * 0.30) + (puanOperasyon * 0.20) + (puanIK * 0.10);
    return Math.round(toplamKDSPuani * 100) / 100; 
}

const getCannibalization = async (req, res) => {
    try {
        const results = await Analiz.getCannibalization();
        const formattedResults = results.map(row => ({
            storeA_id: row.storeA_id,
            storeA: row.storeA || `Mağaza ${row.storeA_id}`,
            storeB_id: row.storeB_id,
            storeB: row.storeB || `Mağaza ${row.storeB_id}`,
            distance: row.distance_meters !== null 
                ? `${row.distance_meters}m` 
                : (row.note || 'Bilinmiyor'),
            distance_meters: row.distance_meters
        }));
        res.json({
            success: true,
            data: formattedResults,
            count: formattedResults.length,
            warning: results.length > 0 && results[0].distance_meters === null 
                ? 'Koordinat bilgisi bulunamadı. Aynı ilçedeki mağazalar gösteriliyor. Haversine hesaplaması için koordinat bilgisi eklenmelidir.'
                : null
        });
    } catch (error) {
        console.error('Cannibalization analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İç rekabet analizi yapılırken bir hata oluştu',
            error: error.message
        });
    }
};

const getCompetitorAnalysis = async (req, res) => {
    try {
        const { magaza_id, include_locations } = req.query;
        const results = await Analiz.getCompetitorAnalysis(magaza_id ? parseInt(magaza_id) : null);
        const formattedResults = results.map(row => ({
            magaza_id: row.magaza_id,
            magaza: row.magaza || `Mağaza ${row.magaza_id}`,
            bim_sayisi: row.bim_sayisi || 0,
            sok_sayisi: row.sok_sayisi || 0,
            migros_sayisi: row.migros_sayisi || 0,
            toplam_rakip: row.toplam_rakip || 0
        }));
        let rakipLocations = [];
        if (include_locations === 'true') {
            const rakipler = await Rakip.findWithCoordinates();
            rakipLocations = rakipler.map(r => ({
                id: r.id,
                marka: r.marka,
                enlem: parseFloat(r.enlem),
                boylam: parseFloat(r.boylam),
                yakin_magaza_id: r.yakin_magaza_id,
                yakin_magaza_adi: r.yakin_magaza_adi
            }));
        }
        res.json({
            success: true,
            data: formattedResults,
            rakipLocations: rakipLocations,
            count: formattedResults.length
        });
    } catch (error) {
        console.error('Dış rekabet analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Dış rekabet analizi yapılırken bir hata oluştu',
            error: error.message
        });
    }
};

const getMonthlyRevenue = async (req, res) => {
    try {
        const { baslangic, bitis } = req.query;
        let baslangicTarih = '2023-01-01';
        let bitisTarih = '2025-12-31';
        if (baslangic && /^\d{4}-\d{2}$/.test(baslangic)) {
            baslangicTarih = `${baslangic}-01`;
        }
        if (bitis && /^\d{4}-\d{2}$/.test(bitis)) {
            const [yil, ay] = bitis.split('-').map(Number);
            const sonGun = new Date(yil, ay, 0).getDate();
            bitisTarih = `${bitis}-${sonGun}`;
        }
        const results = await Performans.getMonthlyRevenue(baslangicTarih, bitisTarih);
        const aylar = {
            1: 'Oca', 2: 'Şub', 3: 'Mar', 4: 'Nis', 
            5: 'May', 6: 'Haz', 7: 'Tem', 8: 'Ağu', 
            9: 'Eyl', 10: 'Eki', 11: 'Kas', 12: 'Ara'
        };
        const formattedResults = results.map(row => ({
            yil: row.yil,
            ay: row.ay,
            donem: row.donem,
            donem_label: `${aylar[row.ay]} ${row.yil}`,
            ortalama_ciro: row.ortalama_ciro,
            toplam_ciro: row.toplam_ciro,
            magaza_sayisi: row.magaza_sayisi
        }));
        res.json({
            success: true,
            data: formattedResults,
            count: formattedResults.length
        });
    } catch (error) {
        console.error('Aylık ciro analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Aylık ciro analizi yapılırken bir hata oluştu',
            error: error.message
        });
    }
};

const getTopStores = async (req, res) => {
    try {
        const { top, bottom } = await Performans.getTopBottomStores(5);
        const topResults = top;
        const bottomResults = bottom;
        const combined = [
            ...topResults.map(row => ({
                magaza_id: row.magaza_id,
                magaza_adi: row.magaza_adi,
                toplam_ciro: row.toplam_ciro,
                ortalama_ciro: row.ortalama_ciro,
                kategori: 'top'
            })),
            ...bottomResults.reverse().map(row => ({
                magaza_id: row.magaza_id,
                magaza_adi: row.magaza_adi,
                toplam_ciro: row.toplam_ciro,
                ortalama_ciro: row.ortalama_ciro,
                kategori: 'bottom'
            }))
        ];
        res.json({
            success: true,
            data: combined,
            top_count: topResults.length,
            bottom_count: bottomResults.length
        });
    } catch (error) {
        console.error('Top/Bottom mağazalar hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Mağaza ciro verisi alınırken hata oluştu',
            error: error.message
        });
    }
};

const getAllStoresKDS = async (req, res) => {
    try {
        const { donem } = req.query; 
        const aySayisi = donem ? parseInt(donem) : 12; 
        const bugun = new Date();
        const baslangicTarihi = new Date(bugun);
        baslangicTarihi.setMonth(bugun.getMonth() - aySayisi);
        const baslangicStr = `${baslangicTarihi.getFullYear()}-${String(baslangicTarihi.getMonth() + 1).padStart(2, '0')}`;
        const bitisStr = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}`;
        const results = await KdsSonuc.findAllStoresKDS(baslangicStr, bitisStr);
        const formattedResults = results.map(row => {
            let renk = 'green';  
            if (row.kds_puani < 50) {
                renk = 'red';     
            } else if (row.kds_puani < 80) {
                renk = 'blue';    
            }
            return {
                magaza_id: row.magaza_id,
                magaza_adi: row.magaza_adi || `Mağaza ${row.magaza_id}`,
                ilce_adi: row.ilce_adi || '-',
                kds_puani: parseFloat(row.kds_puani) || 0,
                toplam_ciro: parseFloat(row.toplam_ciro) || 0,
                ortalama_memnuniyet: parseFloat(row.ortalama_memnuniyet) || 0,
                onerilen_karar: row.onerilen_karar || '-',
                ay_sayisi: row.ay_sayisi || 0,
                renk: renk
            };
        });
        const stats = {
            toplam: formattedResults.length,
            yesil: formattedResults.filter(r => r.renk === 'green').length,
            mavi: formattedResults.filter(r => r.renk === 'blue').length,
            kirmizi: formattedResults.filter(r => r.renk === 'red').length,
            ortalama_puan: formattedResults.length > 0 
                ? Math.round(formattedResults.reduce((sum, r) => sum + r.kds_puani, 0) / formattedResults.length * 10) / 10
                : 0
        };
        res.json({
            success: true,
            data: formattedResults,
            stats: stats,
            count: formattedResults.length,
            donem: aySayisi,
            baslangic: baslangicStr,
            bitis: bitisStr
        });
    } catch (error) {
        console.error('Tüm mağazalar KDS hatası:', error);
        res.status(500).json({
            success: false,
            message: 'KDS performans verisi alınırken hata oluştu',
            error: error.message
        });
    }
};

const getIller = async (req, res) => {
    try {
        const results = await Il.findAll();
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    } catch (error) {
        console.error('İl listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İl listesi getirilirken hata oluştu',
            error: error.message
        });
    }
};

const getIlceler = async (req, res) => {
    try {
        const results = await Ilce.findAll();
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    } catch (error) {
        console.error('İlçe listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İlçe listesi alınırken hata oluştu',
            error: error.message
        });
    }
};

const getDemografiler = async (req, res) => {
    try {
        const results = await KategoriHedefi.findAllDemografiler();
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    } catch (error) {
        console.error('Demografi listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Demografi listesi alınırken hata oluştu',
            error: error.message
        });
    }
};

const getHedefAnalizi = async (req, res) => {
    try {
        const { ilce_id, demografi, yil } = req.query;
        if (!ilce_id) {
            return res.json({
                success: true,
                data: [],
                message: 'Lütfen bir ilçe seçiniz',
                count: 0
            });
        }
        const selectedYil = yil ? parseInt(yil) : 2025;
        const results = await KategoriHedefi.getHedefAnalizi(selectedYil, parseInt(ilce_id), demografi);
        const formattedResults = results.map(row => {
            const hedefOran = parseFloat(row.hedef_oran) || 0;
            const gerceklesenOran = parseFloat(row.gerceklesen_oran) || 0;
            const fark = gerceklesenOran - hedefOran;
            const renk = fark < -5 ? 'red' : 'green';
            return {
                magaza_id: row.magaza_id,
                magaza_adi: row.magaza_adi,
                ilce_adi: row.ilce_adi,
                kategori: row.kategori,
                demografik_yapi: row.demografik_yapi,
                hedef_oran: hedefOran,
                gerceklesen_oran: gerceklesenOran,
                fark: Math.round(fark * 100) / 100,
                renk: renk,
                label: `${row.magaza_adi} - ${row.kategori}`
            };
        });
        const stats = {
            toplam: formattedResults.length,
            hedef_tutan: formattedResults.filter(r => r.renk === 'green').length,
            hedef_tutmayan: formattedResults.filter(r => r.renk === 'red').length,
            ortalama_fark: formattedResults.length > 0 
                ? Math.round(formattedResults.reduce((sum, r) => sum + r.fark, 0) / formattedResults.length * 100) / 100
                : 0
        };
        res.json({
            success: true,
            data: formattedResults,
            stats: stats,
            donem: `${selectedYil} Yılı Ortalaması`,
            count: formattedResults.length
        });
    } catch (error) {
        console.error('Hedef analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Hedef analizi yapılırken hata oluştu',
            error: error.message
        });
    }
};

const searchStores = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: [],
                message: 'En az 2 karakter giriniz'
            });
        }
        const results = await Analiz.searchStores(q);
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    } catch (error) {
        console.error('Arama hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Arama yapılırken hata oluştu',
            error: error.message
        });
    }
};

const getMagazaDetayliAnaliz = async (req, res) => {
    try {
        const { id } = req.params;
        const { yil } = req.query;
        const selectedYil = yil ? parseInt(yil) : 2025;
        console.log('🔍 Mağaza detaylı analiz başlatıldı:', { id, selectedYil });
        let perfQuery = `
            SELECT 
                p.*,
                m.magaza_adi,
                m.magaza_m2,
                m.depoya_uzaklik_km,
                i.ilce_adi,
                i.kira_carpan_katsayisi
            FROM performans p
            INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
            LEFT JOIN ilceler i ON m.ilce_id = i.ilce_id
            WHERE p.magaza_id = ?
        `;
        const perfParams = [id];
        perfQuery += ` AND LEFT(p.donem_ay, 4) = ?`;
        perfParams.push(selectedYil.toString());
        perfQuery += ` ORDER BY p.donem_ay DESC LIMIT 1`;
        const perf = await Performans.getMagazaDetayliPerformans(id, selectedYil);
        if (!perf) {
            return res.status(404).json({
                success: false,
                message: 'Bu mağaza için performans verisi bulunamadı'
            });
        }
        const kds = await KdsSonuc.findByMagazaId(id) || {};
        const avg = await Performans.getAveragePerformance(selectedYil) || {};
        console.log('✅ Veri çekildi:', { 
            perf: !!perf && Object.keys(perf).length > 0, 
            kds: !!kds && Object.keys(kds).length > 0, 
            avg: !!avg && Object.keys(avg).length > 0,
            magaza_id: perf.magaza_id || 'N/A'
        });
        if (!perf || Object.keys(perf).length === 0) {
            return res.status(404).json({
                success: false,
                message: `Mağaza ${id} için ${selectedYil} yılına ait performans verisi bulunamadı`
            });
        }
        const yilOrtalamaCiro = parseFloat(avg.avg_ciro) || parseFloat(perf.toplam_ciro) || 1;
        const kiraGideri = parseFloat(perf.kira_gideri) || 0;
        const kiraOrani = yilOrtalamaCiro > 0 ? (kiraGideri / yilOrtalamaCiro) * 100 : 0;
        const kiraPuani = Math.max(0, Math.min(100, (kiraOrani / 30) * 100));
        const kiraSinir = 41.67; 
        let personelDevirHizi = null;
        try {
            const rawPersonelDevir = await Performans.getPersonelDevirOrtalamasi(id, selectedYil);
            personelDevirHizi = rawPersonelDevir !== null ? parseFloat(rawPersonelDevir) : null;
        } catch (err) {
            console.error('❌ Personel devir hızı hesaplanamadı:', err.message);
            const rawPerf = perf.personel_devir_hizi ?? null;
            personelDevirHizi = rawPerf !== null ? parseFloat(rawPerf) : null;
        }
        const personelDevirPuani = personelDevirHizi !== null && personelDevirHizi !== undefined && !isNaN(personelDevirHizi)
            ? Math.max(0, Math.min(100, (Math.min(personelDevirHizi, 24) / 24) * 100))
            : 0;
        const personelDevirSinir = 62.5; 
        const musteriMemnuniyet = parseFloat(perf.musteri_memnuniyet_puani) || 0;
        const memnuniyetPuani = (musteriMemnuniyet / 10) * 100;
        const memnuniyetSinir = 70; 
        let hedefTutmaPuani = 0;
        try {
            const hedefData = await KategoriHedefi.getHedefTutmaPuani(id, selectedYil);
            if (hedefData && hedefData.ortalama_hedef > 0) {
                const tutmaOrani = (hedefData.ortalama_gerceklesen / hedefData.ortalama_hedef) * 100;
                hedefTutmaPuani = Math.max(0, Math.min(250, tutmaOrani));
            }
        } catch (err) {
            console.error('❌ Hedef tutma hesaplanamadı:', err.message);
            hedefTutmaPuani = 0;
        }
        const hedefTutmaSinir = 100; 
        console.log('📊 Diverging data hesaplanıyor...');
        const divergingData = [
            {
                label: 'Kira Yükü',
                value: Math.round(kiraPuani || 0),
                rawValue: (isNaN(kiraOrani) ? 0 : kiraOrani).toFixed(2) + '%',
                sinir: kiraSinir,
                category: 'risk' 
            },
            {
                label: 'Personel Devri',
                value: Math.round(personelDevirPuani || 0),
                rawValue: (personelDevirHizi !== null && personelDevirHizi !== undefined && !isNaN(personelDevirHizi)) 
                    ? parseFloat(personelDevirHizi).toFixed(1) 
                    : 'N/A',
                sinir: personelDevirSinir,
                category: 'risk' 
            },
            {
                label: 'Müşteri Memnuniyeti',
                value: Math.round(memnuniyetPuani || 0),
                rawValue: (isNaN(musteriMemnuniyet) ? 0 : musteriMemnuniyet).toFixed(1) + '/10',
                sinir: memnuniyetSinir,
                category: 'success' 
            },
            {
                label: 'Hedef Tutturma',
                value: Math.round(hedefTutmaPuani || 0),
                rawValue: (isNaN(hedefTutmaPuani) ? 0 : hedefTutmaPuani).toFixed(1) + '%',
                sinir: hedefTutmaSinir,
                category: 'success' 
            }
        ];
        console.log('✅ Diverging data hazır:', divergingData);
        const radarData = {
            labels: ['Finansal', 'Operasyon', 'Memnuniyet', 'Konum', 'İK'],
            values: [
                Math.min(100, Math.max(0, ((parseFloat(perf.toplam_ciro) || 0) / (parseFloat(avg.avg_ciro) || 1)) * 50)),
                Math.min(100, Math.max(0, ((parseFloat(perf.stok_devir_hizi) || 0) / 50) * 100)),
                Math.max(0, Math.min(100, ((parseFloat(perf.musteri_memnuniyet_puani) || 0) / 10) * 100)),
                Math.max(0, Math.min(100, 100 - ((parseFloat(perf.depoya_uzaklik_km) || 0) / 30) * 100)),
                Math.max(0, Math.min(100, 100 - (((parseFloat(perf.personel_devir_hizi) || 0) - 5) / 10) * 100))
            ].map(v => {
                const rounded = Math.round(v);
                return isNaN(rounded) ? 0 : rounded;
            })
        };
        const responseData = {
            success: true,
            diverging: divergingData,
            radar: radarData,
            kdsOnerisi: {
                karar: (kds && kds.onerilen_karar) ? kds.onerilen_karar : 'Veri yok',
                puan: (kds && kds.kds_puani) ? parseFloat(kds.kds_puani) : 0,
                yil: (kds && kds.yil) ? kds.yil : ((kds && kds.donem) ? kds.donem.substring(0, 4) : selectedYil.toString()),
                renk: (kds && kds.onerilen_karar && (kds.onerilen_karar.includes('KRİTİK') || kds.onerilen_karar.includes('ACİL')))
                    ? 'red' 
                    : (kds && kds.onerilen_karar && kds.onerilen_karar.includes('BAŞARILI'))
                        ? 'green' 
                        : 'orange'
            },
            performans: perf
        };
        console.log('✅ Mağaza detaylı analiz başarıyla tamamlandı');
        console.log('✅ Response hazır, gönderiliyor...');
        res.json(responseData);
    } catch (error) {
        console.error('❌ Mağaza detaylı analiz hatası:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Request params:', { id: req.params.id, yil: req.query.yil });
        res.status(500).json({
            success: false,
            message: 'Detaylı analiz yapılırken hata oluştu: ' + error.message,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const getMagazaBenchmark = async (req, res) => {
    try {
        const { id } = req.params;
        const { yil } = req.query;
        
        const magazaInfo = await Magaza.findByIdWithIlInfo(id);
        if (!magazaInfo) {
            return res.status(404).json({
                success: false,
                message: 'Mağaza bulunamadı'
            });
        }
        const ilId = magazaInfo.il_id;
        const ilAdi = magazaInfo.il_adi;
        
        const magazaPerf = await Performans.getMagazaBenchmark(id, yil);
        if (!magazaPerf || !magazaPerf.donem_ay) {
            return res.json({
                success: true,
                magaza: null,
                ilOrtalamasi: null,
                ilAdi: ilAdi,
                message: 'Performans verisi bulunamadı'
            });
        }
        const magaza = magazaPerf;
        const donem = magaza.donem_ay;
        
        const avg = await Performans.getIlOrtalamasi(ilId, donem) || {
            avg_ciro: 0,
            avg_memnuniyet: 0,
            avg_personel_devir: 0,
            avg_stok_devir: 0,
            avg_kira: 0,
            avg_kds: 0,
            magaza_sayisi: 0
        };
        const kiraOraniMagaza = magaza.toplam_ciro > 0 ? (magaza.kira_gideri / magaza.toplam_ciro) * 100 : 0;
        const kiraOraniIl = avg.avg_ciro > 0 ? (avg.avg_kira / avg.avg_ciro) * 100 : 0;
        const benchmarkData = {
            metrikler: [
                {
                    label: 'Toplam Ciro',
                    magaza: parseFloat(magaza.toplam_ciro) || 0,
                    ilOrtalama: parseFloat(avg.avg_ciro) || 0,
                    birim: '₺',
                    format: 'currency'
                },
                {
                    label: 'KDS Puanı',
                    magaza: parseFloat(magaza.kds_puani) || 0,
                    ilOrtalama: parseFloat(avg.avg_kds) || 0,
                    birim: '',
                    format: 'number'
                },
                {
                    label: 'Müşteri Memnuniyeti',
                    magaza: parseFloat(magaza.musteri_memnuniyet_puani) || 0,
                    ilOrtalama: parseFloat(avg.avg_memnuniyet) || 0,
                    birim: '/10',
                    format: 'number'
                },
                {
                    label: 'Personel Devir Hızı',
                    magaza: parseFloat(magaza.personel_devir_hizi) || 0,
                    ilOrtalama: parseFloat(avg.avg_personel_devir) || 0,
                    birim: '%',
                    format: 'number'
                },
                {
                    label: 'Stok Devir Hızı',
                    magaza: parseFloat(magaza.stok_devir_hizi) || 0,
                    ilOrtalama: parseFloat(avg.avg_stok_devir) || 0,
                    birim: '',
                    format: 'number'
                },
                {
                    label: 'Kira Yükü',
                    magaza: kiraOraniMagaza,
                    ilOrtalama: kiraOraniIl,
                    birim: '%',
                    format: 'percentage'
                }
            ],
            ilAdi: ilAdi,
            magazaSayisi: avg.magaza_sayisi || 0,
            donem: donem
        };
        benchmarkData.metrikler.forEach(m => {
            if (m.ilOrtalama > 0) {
                m.fark = ((m.magaza / m.ilOrtalama - 1) * 100).toFixed(1);
                m.durum = m.fark > 0 ? 'üstünde' : m.fark < 0 ? 'altında' : 'eşit';
            } else {
                m.fark = 0;
                m.durum = 'veri yok';
            }
        });
        res.json({
            success: true,
            data: benchmarkData
        });
    } catch (error) {
        console.error('Mağaza benchmark hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Benchmark analizi yapılırken hata oluştu',
            error: error.message
        });
    }
};

const getMagazaPerformans = async (req, res) => {
    try {
        const { id } = req.params;
        const { yil, baslangic, bitis } = req.query; 
        const filters = {};
        if (baslangic && bitis) {
            filters.baslangic = baslangic;
            filters.bitis = bitis;
        } else if (yil && yil !== 'all') {
            filters.yil = parseInt(yil);
        }
        const results = await Performans.findByMagazaId(id, filters);
        
        // KDS puanlarını eklemek için
        const resultsWithKds = await Promise.all(results.map(async (row) => {
            // KDS puanı için ayrı sorgu - performansı optimize etmek için toplu sorgu yapılabilir ama şimdilik bu
            const kds = await KdsSonuc.findByMagazaId(row.magaza_id);
            const kdsPuani = kds && kds.donem && row.donem_ay && kds.donem.substring(0, 7) === row.donem_ay.substring(0, 7) ? kds.kds_puani : 0;
            return {
                ...row,
                kds_puani: kdsPuani
            };
        }));
        const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        const formattedData = results.map(row => {
            const date = new Date(row.donem_ay);
            const ay = date.getMonth();
            const yilVal = date.getFullYear();
            return {
                donem: row.donem_ay,
                donem_label: `${aylar[ay]} ${yilVal}`,
                ay_adi: aylar[ay],
                yil: yilVal,
                toplam_ciro: parseFloat(row.toplam_ciro) || 0,
                kds_puani: parseFloat(row.kds_puani) || 0,
                musteri_memnuniyet: row.musteri_memnuniyet_puani || 0,
                personel_devir: row.personel_devir_hizi || 0,
                stok_devir: row.stok_devir_hizi || 0,
                kira_gideri: parseFloat(row.kira_gideri) || 0
            };
        });
        const ortKds = formattedData.length > 0 
            ? (formattedData.reduce((sum, d) => sum + d.kds_puani, 0) / formattedData.length).toFixed(2)
            : 0;
        const maxKds = formattedData.length > 0 
            ? Math.max(...formattedData.map(d => d.kds_puani)).toFixed(2)
            : 0;
        const minKds = formattedData.length > 0 
            ? Math.min(...formattedData.map(d => d.kds_puani)).toFixed(2)
            : 0;
        res.json({
            success: true,
            data: formattedData,
            count: formattedData.length,
            istatistik: {
                ortalama_kds: parseFloat(ortKds),
                max_kds: parseFloat(maxKds),
                min_kds: parseFloat(minKds)
            }
        });
    } catch (error) {
        console.error('Mağaza performans hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Mağaza performansı getirilirken hata oluştu',
            error: error.message
        });
    }
};

const getSenaryoVerileri = async (req, res) => {
    try {
        const bugun = new Date();
        const baslangicTarihi = new Date(bugun);
        baslangicTarihi.setMonth(bugun.getMonth() - 6);
        const baslangicStr = `${baslangicTarihi.getFullYear()}-${String(baslangicTarihi.getMonth() + 1).padStart(2, '0')}`;
        const bitisStr = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}`;
        const sonDonem = await Performans.getLatestPeriod();
        if (!sonDonem) {
            return res.json({
                success: false,
                message: 'Veri bulunamadı'
            });
        }
        const results = await Performans.getSenaryoVerileri(baslangicStr, bitisStr, sonDonem);
        const formattedData = results.map(row => {
            const toplamCiro = parseFloat(row.toplam_ciro) || 0;
            return {
                magaza_id: row.magaza_id,
                magaza_adi: row.magaza_adi,
                toplam_ciro: toplamCiro,
                kira_gideri: parseFloat(row.kira_gideri) || 0,
                personel_sayisi: parseInt(row.personel_sayisi) || 0,
                diger_giderler: toplamCiro * 0.05, 
                kds_puani: parseFloat(row.kds_puani) || 0,
                donem_ay: row.donem_ay
            };
        });
        res.json({
            success: true,
            data: formattedData,
            donem: sonDonem
        });
    } catch (error) {
        console.error('Senaryo verileri hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Senaryo verileri alınırken bir hata oluştu',
            error: error.message
        });
    }
};

const getMagazaKiraCiro = async (req, res) => {
    try {
        const { id } = req.params;
        const { yil } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Mağaza ID gerekli'
            });
        }
        let query = '';
        let params = [];
        if (yil && yil !== 'all') {
            query = `
                SELECT 
                    p.donem_ay,
                    p.toplam_ciro,
                    p.kira_gideri
                FROM performans p
                INNER JOIN (
                    SELECT 
                        magaza_id, 
                        donem_ay,
                        MAX(performans_id) AS max_id
                    FROM performans
                    WHERE magaza_id = ? AND LEFT(donem_ay, 4) = ?
                    GROUP BY magaza_id, donem_ay
                ) AS latest ON p.performans_id = latest.max_id
                WHERE p.magaza_id = ? AND LEFT(p.donem_ay, 4) = ?
                ORDER BY p.donem_ay ASC
            `;
            params = [id, yil, id, yil];
        } else {
            query = `
                SELECT 
                    p.donem_ay,
                    p.toplam_ciro,
                    p.kira_gideri
                FROM performans p
                INNER JOIN (
                    SELECT 
                        magaza_id, 
                        donem_ay,
                        MAX(performans_id) AS max_id
                    FROM performans
                    WHERE magaza_id = ?
                    GROUP BY magaza_id, donem_ay
                ) AS latest ON p.performans_id = latest.max_id
                WHERE p.magaza_id = ?
                ORDER BY p.donem_ay ASC
            `;
            params = [id, id];
        }
        const results = await Performans.getMagazaKiraCiro(id, yil);
        const data = results.map(row => ({
            donem_ay: row.donem_ay,
            toplam_ciro: parseFloat(row.toplam_ciro) || 0,
            kira_gideri: parseFloat(row.kira_gideri) || 0
        }));
        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Mağaza kira/ciro hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Mağaza kira/ciro verileri alınırken bir hata oluştu',
            error: error.message
        });
    }
};

const getTarihler = async (req, res) => {
    try {
        const result = await Performans.getAllDates();
        const tarihler = result.map(row => {
            const date = new Date(row.donem_ay);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            return {
                value: `${year}-${String(month).padStart(2, '0')}`,
                label: `${year} ${monthNames[month - 1]}`
            };
        });
        res.json({
            success: true,
            data: tarihler
        });
    } catch (error) {
        console.error('Tarih listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Tarih listesi alınırken bir hata oluştu',
            error: error.message
        });
    }
};

const getKarsilastirma = async (req, res) => {
    try {
        const { type, id1, date1, id2, date2 } = req.query;
        if (!type || !id1 || !date1 || !id2 || !date2) {
            return res.status(400).json({
                success: false,
                message: 'Tüm parametreler gerekli: type, id1, date1, id2, date2'
            });
        }
        const formatDate = (dateStr) => {
            if (dateStr.includes('-') && dateStr.length === 7) {
                return dateStr + '-01';
            }
            return dateStr;
        };
        const formattedDate1 = formatDate(date1);
        const formattedDate2 = formatDate(date2);
        let query1, query2, params1, params2;
        if (type === 'magaza') {
            query1 = `
                SELECT 
                    p.*,
                    m.magaza_adi,
                    m.magaza_m2,
                    m.depoya_uzaklik_km,
                    i.ilce_adi,
                    il.il_adi,
                    COALESCE(k.kds_puani, 0) AS kds_puani,
                    ROUND((p.kira_gideri / p.toplam_ciro) * 100, 2) AS kira_yuku
                FROM performans p
                INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
                LEFT JOIN ilceler i ON m.ilce_id = i.ilce_id
                LEFT JOIN iller il ON i.il_id = il.il_id
                LEFT JOIN kds_sonuc k ON p.magaza_id = k.magaza_id AND LEFT(k.donem, 7) = LEFT(p.donem_ay, 7)
                WHERE p.magaza_id = ? AND LEFT(p.donem_ay, 7) = LEFT(?, 7)
            `;
            params1 = [parseInt(id1), formattedDate1];
            params2 = [parseInt(id2), formattedDate2];
        } else if (type === 'ilce') {
            query1 = `
                SELECT 
                    p.toplam_ciro,
                    p.musteri_memnuniyet_puani,
                    p.personel_devir_hizi,
                    p.stok_devir_hizi,
                    p.kira_gideri,
                    m.depoya_uzaklik_km,
                    i.ilce_adi,
                    il.il_adi,
                    COALESCE(k.kds_puani, 0) AS kds_puani
                FROM performans p
                INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
                INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                LEFT JOIN iller il ON i.il_id = il.il_id
                LEFT JOIN kds_sonuc k ON p.magaza_id = k.magaza_id AND LEFT(k.donem, 7) = LEFT(p.donem_ay, 7)
                WHERE i.ilce_id = ? AND LEFT(p.donem_ay, 7) = LEFT(?, 7)
            `;
            params1 = [parseInt(id1), formattedDate1];
            params2 = [parseInt(id2), formattedDate2];
        } else if (type === 'il') {
            query1 = `
                SELECT 
                    p.toplam_ciro,
                    p.musteri_memnuniyet_puani,
                    p.personel_devir_hizi,
                    p.stok_devir_hizi,
                    p.kira_gideri,
                    m.depoya_uzaklik_km,
                    il.il_adi,
                    COALESCE(k.kds_puani, 0) AS kds_puani
                FROM performans p
                INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
                INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                INNER JOIN iller il ON i.il_id = il.il_id
                LEFT JOIN kds_sonuc k ON p.magaza_id = k.magaza_id AND LEFT(k.donem, 7) = LEFT(p.donem_ay, 7)
                WHERE il.il_id = ? AND LEFT(p.donem_ay, 7) = LEFT(?, 7)
            `;
            params1 = [parseInt(id1), formattedDate1];
            params2 = [parseInt(id2), formattedDate2];
        } else {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz type. Geçerli değerler: magaza, ilce, il'
            });
        }
        const data1 = await Performans.getKarsilastirmaData(type, parseInt(id1), formattedDate1);
        const data2 = await Performans.getKarsilastirmaData(type, parseInt(id2), formattedDate2);
        if (data1.length === 0 || data2.length === 0) {
            return res.json({
                success: false,
                message: 'Seçilen dönemler için veri bulunamadı'
            });
        }
        let result1, result2;
        if (type === 'magaza') {
            result1 = data1[0];
            result2 = data2[0];
            result1.kira_yuku = result1.toplam_ciro > 0 ? (result1.kira_gideri / result1.toplam_ciro) * 100 : 0;
            result2.kira_yuku = result2.toplam_ciro > 0 ? (result2.kira_gideri / result2.toplam_ciro) * 100 : 0;
            result1.kds_puani = parseFloat(result1.kds_puani) || 0;
            result2.kds_puani = parseFloat(result2.kds_puani) || 0;
        } else {
            const calculateAverages = (rows) => {
                if (rows.length === 0) return null;
                const firstRow = rows[0];
                const avg = {
                    toplam_ciro: rows.reduce((sum, r) => sum + (parseFloat(r.toplam_ciro) || 0), 0) / rows.length,
                    musteri_memnuniyet_puani: rows.reduce((sum, r) => sum + (parseFloat(r.musteri_memnuniyet_puani) || 0), 0) / rows.length,
                    personel_devir_hizi: rows.reduce((sum, r) => sum + (parseFloat(r.personel_devir_hizi) || 0), 0) / rows.length,
                    stok_devir_hizi: rows.reduce((sum, r) => sum + (parseFloat(r.stok_devir_hizi) || 0), 0) / rows.length,
                    kira_gideri: rows.reduce((sum, r) => sum + (parseFloat(r.kira_gideri) || 0), 0) / rows.length,
                    depoya_uzaklik_km: rows.reduce((sum, r) => sum + (parseFloat(r.depoya_uzaklik_km) || 0), 0) / rows.length,
                    ilce_adi: firstRow.ilce_adi,
                    il_adi: firstRow.il_adi
                };
                avg.kds_puani = rows.reduce((sum, r) => sum + (parseFloat(r.kds_puani) || 0), 0) / rows.length;
                avg.kira_yuku = avg.toplam_ciro > 0 ? (avg.kira_gideri / avg.toplam_ciro) * 100 : 0;
                return avg;
            };
            result1 = calculateAverages(data1);
            result2 = calculateAverages(data2);
            if (!result1 || !result2) {
                return res.json({
                    success: false,
                    message: 'Ortalama hesaplanamadı'
                });
            }
        }
        const hedefData1 = await KategoriHedefi.getKarsilastirmaHedefleri(type, parseInt(id1), formattedDate1);
        const hedefData2 = await KategoriHedefi.getKarsilastirmaHedefleri(type, parseInt(id2), formattedDate2);
        const getLabel = (result, type) => {
            if (type === 'magaza') {
                return result.magaza_adi || 'Mağaza';
            } else if (type === 'ilce') {
                return result.ilce_adi || 'İlçe';
            } else {
                return result.il_adi || 'İl';
            }
        };
        res.json({
            success: true,
            sol: {
                label: getLabel(result1, type),
                date: date1,
                genel: {
                    kds_puani: parseFloat(result1.kds_puani) || 0,
                    toplam_ciro: parseFloat(result1.toplam_ciro) || 0,
                    depoya_uzaklik: parseFloat(result1.depoya_uzaklik_km) || 0
                },
                maliyet: {
                    kira_yuku: parseFloat(result1.kira_yuku) || 0,
                    stok_devir: parseFloat(result1.stok_devir_hizi) || 0
                },
                ik: {
                    personel_devir: parseFloat(result1.personel_devir_hizi) || 0,
                    musteri_memnuniyet: parseFloat(result1.musteri_memnuniyet_puani) || 0
                },
                hedef_kategoriler: hedefData1.map(h => ({
                    kategori: h.oncelikli_kategori,
                    tutma_orani: parseFloat(h.tutma_orani) || 0
                }))
            },
            sag: {
                label: getLabel(result2, type),
                date: date2,
                genel: {
                    kds_puani: parseFloat(result2.kds_puani) || 0,
                    toplam_ciro: parseFloat(result2.toplam_ciro) || 0,
                    depoya_uzaklik: parseFloat(result2.depoya_uzaklik_km) || 0
                },
                maliyet: {
                    kira_yuku: parseFloat(result2.kira_yuku) || 0,
                    stok_devir: parseFloat(result2.stok_devir_hizi) || 0
                },
                ik: {
                    personel_devir: parseFloat(result2.personel_devir_hizi) || 0,
                    musteri_memnuniyet: parseFloat(result2.musteri_memnuniyet_puani) || 0
                },
                hedef_kategoriler: hedefData2.map(h => ({
                    kategori: h.oncelikli_kategori,
                    tutma_orani: parseFloat(h.tutma_orani) || 0
                }))
            }
        });
    } catch (error) {
        console.error('Karşılaştırma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Karşılaştırma yapılırken hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    getCannibalization,
    getCompetitorAnalysis,
    getMonthlyRevenue,
    getTopStores,
    getAllStoresKDS,
    getIller,
    getIlceler,
    getDemografiler,
    getHedefAnalizi,
    searchStores,
    getMagazaPerformans,
    getMagazaDetayliAnaliz,
    getMagazaBenchmark,
    getTarihler,
    getKarsilastirma,
    getSenaryoVerileri,
    getMagazaKiraCiro
};

