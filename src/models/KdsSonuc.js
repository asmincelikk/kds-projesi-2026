const db = require('../config/db');

class KdsSonuc {
    static async findByMagazaId(magazaId) {
        try {
            const query = `
                SELECT * FROM kds_sonuc 
                WHERE magaza_id = ? 
                ORDER BY donem DESC, olusturma_tarihi DESC 
                LIMIT 1
            `;
            const [rows] = await db.query(query, [magazaId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('KdsSonuc.findByMagazaId hatası:', error);
            throw error;
        }
    }

    static async findAllStoresKDS(baslangicStr, bitisStr) {
        try {
            const query = `
                SELECT 
                    k.magaza_id,
                    m.magaza_adi,
                    i.ilce_adi,
                    ROUND(AVG(k.kds_puani), 2) AS kds_puani,
                    ROUND(AVG(k.toplam_ciro), 0) AS toplam_ciro,
                    ROUND(AVG(k.ortalama_memnuniyet), 2) AS ortalama_memnuniyet,
                    (SELECT onerilen_karar 
                     FROM kds_sonuc k2 
                     WHERE k2.magaza_id = k.magaza_id 
                       AND LEFT(k2.donem, 7) >= ? 
                       AND LEFT(k2.donem, 7) <= ?
                     GROUP BY onerilen_karar 
                     ORDER BY COUNT(*) DESC 
                     LIMIT 1) AS onerilen_karar,
                    COUNT(*) AS ay_sayisi
                FROM kds_sonuc k
                INNER JOIN magazalar m ON k.magaza_id = m.magaza_id
                LEFT JOIN ilceler i ON m.ilce_id = i.ilce_id
                WHERE LEFT(k.donem, 7) >= ? AND LEFT(k.donem, 7) <= ?
                GROUP BY k.magaza_id, m.magaza_adi, i.ilce_adi
                HAVING ay_sayisi > 0
                ORDER BY kds_puani DESC
            `;
            const [rows] = await db.query(query, [baslangicStr, bitisStr, baslangicStr, bitisStr]);
            return rows;
        } catch (error) {
            console.error('KdsSonuc.findAllStoresKDS hatası:', error);
            throw error;
        }
    }

    static async getAverageByMagazaAndPeriod(magazaId, baslangicStr, bitisStr) {
        try {
            const query = `
                SELECT ROUND(AVG(kds_puani), 2) AS avg_kds
                FROM kds_sonuc
                WHERE magaza_id = ?
                  AND LEFT(donem, 7) >= ?
                  AND LEFT(donem, 7) <= ?
            `;
            const [rows] = await db.query(query, [magazaId, baslangicStr, bitisStr]);
            return rows[0]?.avg_kds || 0;
        } catch (error) {
            console.error('KdsSonuc.getAverageByMagazaAndPeriod hatası:', error);
            throw error;
        }
    }
}

module.exports = KdsSonuc;

