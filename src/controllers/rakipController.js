const Rakip = require('../models/Rakip');

const getRakiplerTableStructure = async (req, res) => {
    try {
        const columns = await Rakip.getTableStructure();
        
        if (columns.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'rakipler tablosu bulunamadı'
            });
        }
        
        res.json({
            success: true,
            table: 'rakipler',
            columns: columns
        });
        
    } catch (error) {
        console.error('Tablo yapısı kontrol hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Tablo yapısı kontrol edilirken bir hata oluştu',
            error: error.message
        });
    }
};

module.exports = {
    getRakiplerTableStructure
};









