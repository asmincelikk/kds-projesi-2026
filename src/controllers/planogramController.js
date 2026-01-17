const KategoriHedefi = require('../models/KategoriHedefi');
const Performans = require('../models/Performans');
const Ilce = require('../models/Ilce');

const getPlanogramSuggestions = async (req, res) => {
    try {
        const { magaza_id } = req.query;
        
        const results = await KategoriHedefi.getPlanogramSuggestions(magaza_id ? parseInt(magaza_id) : null);
        
        const formattedResults = results.map(row => ({
            magaza_id: row.magaza_id,
            magaza_adi: row.magaza_adi || `Mağaza ${row.magaza_id}`,
            ilce_adi: row.ilce_adi || '-',
            gercek_kategori: row.gercek_kategori || 'Belirtilmemiş',
            toplam_ciro: row.toplam_ciro || 0,
            hedef_kategori: row.hedef_kategori || '-',
            hedef_ciro_payi: row.hedef_ciro_payi || 0,
            durum_mesaji: row.durum_mesaji || '-',
            durum_rengi: row.durum_rengi || 'Kirmizi'
        }));
        
        res.json({
            success: true,
            data: formattedResults,
            count: formattedResults.length
        });
        
    } catch (error) {
        console.error('Planogram analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Planogram analizi yapılırken bir hata oluştu',
            error: error.message
        });
    }
};

const getPlanogramCiroAnalysis = async (req, res) => {
    try {
        const { yil, ilce_id } = req.query;
        
        const availableYears = await Performans.getAvailableYears();
        const ilcelerResult = await Ilce.findAllSimple();
        
        const selectedYear = yil ? parseInt(yil) : (availableYears[0] || 2024);
        
        const results = await KategoriHedefi.getCiroAnalysis(selectedYear, ilce_id);
        
        const formattedResults = results.map(row => ({
            magaza_id: row.magaza_id,
            magaza_adi: row.magaza_adi || `Mağaza ${row.magaza_id}`,
            ilce_id: row.ilce_id,
            ilce_adi: row.ilce_adi || '-',
            hedef_kategori: row.hedef_kategori || '-',
            hedef_ciro_payi: row.hedef_ciro_payi || 0,
            gercek_kategori: row.gercek_kategori || '-',
            gercek_ciro: row.gercek_ciro || 0,
            hedef_ciro: row.hedef_ciro || 0,
            fark: (row.gercek_ciro || 0) - (row.hedef_ciro || 0),
            durum: row.durum || 'Belirsiz'
        }));
        
        const stats = {
            toplam_magaza: formattedResults.length,
            uyumlu: formattedResults.filter(r => r.durum === 'Uyumlu').length,
            uyumsuz: formattedResults.filter(r => r.durum === 'Uyumsuz').length,
            toplam_gercek_ciro: formattedResults.reduce((sum, r) => sum + r.gercek_ciro, 0),
            toplam_hedef_ciro: formattedResults.reduce((sum, r) => sum + r.hedef_ciro, 0)
        };
        
        res.json({
            success: true,
            data: formattedResults,
            stats: stats,
            count: formattedResults.length,
            selectedYear: selectedYear,
            availableYears: availableYears,
            ilceler: ilcelerResult
        });
        
    } catch (error) {
        console.error('Planogram ciro analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Planogram ciro analizi yapılırken bir hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    getPlanogramSuggestions,
    getPlanogramCiroAnalysis
};


