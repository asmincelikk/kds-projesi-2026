const Performans = require('../models/Performans');
const Magaza = require('../models/Magaza');

const getSeasonalLogistics = async (req, res) => {
    try {
        const { yil, magaza_id } = req.query;
        const selectedYear = yil || '2025';
        
        const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        
        const results = await Performans.getSeasonalLogistics(selectedYear, magaza_id);
        
        const trendData = [];
        for (let ay = 1; ay <= 12; ay++) {
            const found = results.find(r => r.ay === ay);
            trendData.push({
                ay: ay,
                ay_adi: aylar[ay - 1],
                stok_devir_hizi: found?.stok_devir_hizi || 0,
                magaza_sayisi: found?.magaza_sayisi || 0,
                yil: selectedYear
            });
        }
        
        const turistikMagazalar = await Magaza.findByDemografikYapi('Turistik');
        
        let secilenMagazaAdi = 'Tüm Turistik Mağazalar';
        if (magaza_id && magaza_id !== 'all') {
            const secilen = turistikMagazalar.find(m => m.magaza_id === parseInt(magaza_id));
            if (secilen) secilenMagazaAdi = secilen.magaza_adi;
        }
        
        const yazAylari = trendData.filter(d => d.ay >= 6 && d.ay <= 8);
        const yazOrtalamasi = yazAylari.length > 0 
            ? (yazAylari.reduce((sum, d) => sum + parseFloat(d.stok_devir_hizi || 0), 0) / yazAylari.length).toFixed(1)
            : 0;
        
        const kisAylari = trendData.filter(d => d.ay === 12 || d.ay <= 2);
        const kisOrtalamasi = kisAylari.length > 0 
            ? (kisAylari.reduce((sum, d) => sum + parseFloat(d.stok_devir_hizi || 0), 0) / kisAylari.length).toFixed(1)
            : 0;
        
        res.json({
            success: true,
            trendData: trendData,
            turistikMagazalar: turistikMagazalar,
            secilenMagaza: secilenMagazaAdi,
            yil: selectedYear,
            istatistik: {
                yaz_ortalamasi: parseFloat(yazOrtalamasi),
                kis_ortalamasi: parseFloat(kisOrtalamasi),
                fark: parseFloat((yazOrtalamasi - kisOrtalamasi).toFixed(1))
            },
            aciklama: 'Turistik bölgelerde yaz aylarında (Haz-Ağu) stok devir hızı artışı beklenir'
        });
        
    } catch (error) {
        console.error('Lojistik analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Lojistik analizi yapılırken bir hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    getSeasonalLogistics
};


