const Magaza = require('../models/Magaza');
const Analiz = require('../models/Analiz');

const getAllMagazalar = async (req, res) => {
    try {
        const rows = await Magaza.findAll();
        
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Mağaza listesi çekilirken hata:', error);
        res.status(500).json({
            success: false,
            message: 'Mağazalar getirilirken bir hata oluştu',
            error: error.message
        });
    }
};

const getMagazaById = async (req, res) => {
    try {
        const { id } = req.params;
        const magaza = await Magaza.findById(id);
        
        if (!magaza) {
            return res.status(404).json({
                success: false,
                message: 'Mağaza bulunamadı'
            });
        }
        
        res.json({
            success: true,
            data: magaza
        });
    } catch (error) {
        console.error('Mağaza detayı çekilirken hata:', error);
        res.status(500).json({
            success: false,
            message: 'Mağaza detayı getirilirken bir hata oluştu',
            error: error.message
        });
    }
};

const createMagaza = async (req, res) => {
    try {
        const { magaza_adi, enlem, boylam } = req.body;

        if (!magaza_adi) {
            return res.status(400).json({
                success: false,
                message: 'Mağaza adı zorunludur'
            });
        }

        let yamyamlikUyarisi = null;
        if (enlem && boylam) {
            yamyamlikUyarisi = await Analiz.checkCannibalizationForNewStore(
                parseFloat(enlem),
                parseFloat(boylam)
            );
        }

        const data = await Magaza.create(req.body);

        const response = {
            success: true,
            message: 'Mağaza başarıyla eklendi',
            data: data
        };

        if (yamyamlikUyarisi && yamyamlikUyarisi.uyari) {
            response.warning = yamyamlikUyarisi.mesaj;
            response.yakın_magazalar = yamyamlikUyarisi.yakın_magazalar;
        }

        res.status(201).json(response);
    } catch (error) {
        console.error('Mağaza eklenirken hata:', error);
        res.status(500).json({
            success: false,
            message: 'Mağaza eklenirken bir hata oluştu',
            error: error.message
        });
    }
};

const updateMagaza = async (req, res) => {
    try {
        const { id } = req.params;

        // Önce mağazanın var olup olmadığını kontrol et
        const existing = await Magaza.findByIdSimple(id);
        
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Mağaza bulunamadı'
            });
        }

        const data = await Magaza.update(id, req.body);

        res.json({
            success: true,
            message: 'Mağaza başarıyla güncellendi',
            data: data
        });
    } catch (error) {
        console.error('Mağaza güncellenirken hata:', error);
        res.status(500).json({
            success: false,
            message: 'Mağaza güncellenirken bir hata oluştu',
            error: error.message
        });
    }
};

const deleteMagaza = async (req, res) => {
    try {
        const { id } = req.params;

        // Önce mağazanın var olup olmadığını kontrol et
        const existing = await Magaza.findByIdSimple(id);
        
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Mağaza bulunamadı'
            });
        }

        await Magaza.delete(id);

        res.json({
            success: true,
            message: 'Mağaza başarıyla silindi',
            data: {
                magaza_id: id
            }
        });
    } catch (error) {
        console.error('Mağaza silinirken hata:', error);
        
        // Foreign key constraint hatası kontrolü
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                success: false,
                message: 'Bu mağaza başka tablolarda kullanıldığı için silinemiyor',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Mağaza silinirken bir hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    getAllMagazalar,
    getMagazaById,
    createMagaza,
    updateMagaza,
    deleteMagaza
};



