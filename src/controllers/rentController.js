const Performans = require('../models/Performans');

const getRentAnalysis = async (req, res) => {
    try {
        const enGuncelAy = await Performans.getLatestPeriod();
        
        if (!enGuncelAy) {
            return res.json({
                success: true,
                data: [],
                count: 0,
                message: 'Veritabanında performans verisi bulunamadı'
            });
        }
        
        const results = await Performans.getRentAnalysisData(enGuncelAy, 10);
        
        const formattedResults = results.map(row => ({
            magaza_id: row.magaza_id,
            magaza_adi: row.magaza_adi || `Mağaza ${row.magaza_id}`,
            ilce_adi: row.ilce_adi || '-',
            magaza_m2: row.magaza_m2 || 0,
            donem_ay: row.donem_ay || '-',
            toplam_ciro: row.toplam_ciro || 0,
            kira_gideri: row.kira_gideri || 0,
            kira_yuku_orani: row.kira_yuku_orani !== null ? row.kira_yuku_orani : null,
            m2_verimliligi: row.m2_verimliligi !== null ? row.m2_verimliligi : null,
            durum_mesaji: row.durum_mesaji || '-',
            durum_rengi: row.durum_rengi || 'Gri'
        }));
        
        res.json({
            success: true,
            data: formattedResults,
            count: formattedResults.length,
            en_guncel_ay: enGuncelAy
        });
        
    } catch (error) {
        console.error('Kira analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kira analizi yapılırken bir hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    getRentAnalysis
};






