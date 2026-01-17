const Performans = require('../models/Performans');

const getHRAnalysis = async (req, res) => {
    try {
        const { donem, baslangic, bitis } = req.query;
        
        let filters = {};
        
        if (baslangic && bitis) {
            filters.baslangic = baslangic;
            filters.bitis = bitis;
        } else if (donem) {
            filters.donem = donem;
        } else {
            const lastPeriod = await Performans.getLatestPeriod();
            if (lastPeriod) {
                filters.lastPeriod = lastPeriod;
            }
        }
        
        const results = await Performans.getHRAnalysisData(filters);
        
        const scatterData = results.map(row => {
            const devirHizi = parseFloat(row.personel_devir_hizi) || 0;
            const memnuniyet = parseFloat(row.musteri_memnuniyet_puani) || 0;
            
            const krizBolgesi = devirHizi >= 12 && memnuniyet <= 6;
            const riskli = !krizBolgesi && (devirHizi >= 10 || memnuniyet <= 7);
            
            return {
                magaza_id: row.magaza_id,
                magaza_adi: row.magaza_adi,
                ilce_adi: row.ilce_adi || '-',
                personel_devir_hizi: devirHizi,
                musteri_memnuniyet: memnuniyet,
                toplam_ciro: parseFloat(row.toplam_ciro) || 0,
                personel_sayisi: parseInt(row.personel_sayisi) || 0,
                kriz_bolgesi: krizBolgesi,
                durum: krizBolgesi ? 'KRİZ MASASI' : (riskli ? 'RİSKLİ' : 'NORMAL')
            };
        });
        
        const krizSayisi = scatterData.filter(d => d.kriz_bolgesi).length;
        const riskliSayisi = scatterData.filter(d => d.durum === 'RİSKLİ').length;
        const normalSayisi = scatterData.filter(d => d.durum === 'NORMAL').length;
        
        const ortDevir = scatterData.length > 0 
            ? scatterData.reduce((sum, d) => sum + d.personel_devir_hizi, 0) / scatterData.length 
            : 0;
        const ortMemnuniyet = scatterData.length > 0 
            ? scatterData.reduce((sum, d) => sum + d.musteri_memnuniyet, 0) / scatterData.length 
            : 0;
        
        let gosterilenDonem = 'Son Dönem';
        if (baslangic && bitis) {
            gosterilenDonem = `${baslangic.substring(0, 7)} - ${bitis.substring(0, 7)}`;
        } else if (donem) {
            gosterilenDonem = donem;
        } else if (results[0]?.donem_ay) {
            gosterilenDonem = results[0].donem_ay.substring(0, 7);
        }
        
        res.json({
            success: true,
            scatterData: scatterData,
            count: scatterData.length,
            donem: gosterilenDonem,
            istatistikler: {
                kriz_sayisi: krizSayisi,
                riskli_sayisi: riskliSayisi,
                normal_sayisi: normalSayisi,
                ortalama_devir: Math.round(ortDevir * 10) / 10,
                ortalama_memnuniyet: Math.round(ortMemnuniyet * 10) / 10
            },
            aciklama: 'Gerçek veritabanı verileri: Personel devir hızı ve müşteri memnuniyeti analizi.'
        });

    } catch (error) {
        console.error('İK analizi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İK analizi yapılırken bir hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    getHRAnalysis
};


