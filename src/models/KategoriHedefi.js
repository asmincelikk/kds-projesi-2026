const db = require('../config/db');

class KategoriHedefi {
    static async findAllDemografiler() {
        try {
            const query = `
                SELECT DISTINCT demografik_yapi 
                FROM kategori_hedefleri 
                WHERE demografik_yapi IS NOT NULL
                ORDER BY demografik_yapi
            `;
            const [rows] = await db.query(query);
            return rows.map(r => r.demografik_yapi);
        } catch (error) {
            console.error('KategoriHedefi.findAllDemografiler hatası:', error);
            throw error;
        }
    }

    static async getPlanogramSuggestions(magazaId = null) {
        try {
            let query;
            if (magazaId) {
                query = `
                    SELECT 
                        m.magaza_id,
                        m.magaza_adi,
                        i.ilce_adi,
                        p.en_cok_satan_kategori AS gercek_kategori,
                        p.toplam_ciro,
                        kh.oncelikli_kategori AS hedef_kategori,
                        kh.hedef_ciro_payi,
                        CASE 
                            WHEN p.en_cok_satan_kategori = kh.oncelikli_kategori 
                            THEN 'BAŞARILI: Mağaza hedef kategoride lider.'
                            ELSE CONCAT('DİKKAT: Hedef ', kh.oncelikli_kategori, ' ama En Çok Satan ', COALESCE(p.en_cok_satan_kategori, 'Belirtilmemiş'))
                        END AS durum_mesaji,
                        CASE 
                            WHEN p.en_cok_satan_kategori = kh.oncelikli_kategori 
                            THEN 'Yesil'
                            ELSE 'Kirmizi'
                        END AS durum_rengi
                    FROM magazalar m
                    INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                    LEFT JOIN performans p ON m.magaza_id = p.magaza_id
                    INNER JOIN magaza_hedefleri mh ON m.magaza_id = mh.magaza_id
                    INNER JOIN kategori_hedefleri kh ON mh.hedef_id = kh.hedef_id
                    WHERE m.magaza_id = ?
                    ORDER BY m.magaza_id ASC, kh.hedef_ciro_payi DESC
                `;
            } else {
                query = `
                    SELECT 
                        m.magaza_id,
                        m.magaza_adi,
                        i.ilce_adi,
                        p.en_cok_satan_kategori AS gercek_kategori,
                        p.toplam_ciro,
                        kh.oncelikli_kategori AS hedef_kategori,
                        kh.hedef_ciro_payi,
                        CASE 
                            WHEN p.en_cok_satan_kategori = kh.oncelikli_kategori 
                            THEN 'BAŞARILI: Mağaza hedef kategoride lider.'
                            ELSE CONCAT('DİKKAT: Hedef ', kh.oncelikli_kategori, ' ama En Çok Satan ', COALESCE(p.en_cok_satan_kategori, 'Belirtilmemiş'))
                        END AS durum_mesaji,
                        CASE 
                            WHEN p.en_cok_satan_kategori = kh.oncelikli_kategori 
                            THEN 'Yesil'
                            ELSE 'Kirmizi'
                        END AS durum_rengi
                    FROM magazalar m
                    INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                    LEFT JOIN performans p ON m.magaza_id = p.magaza_id
                    INNER JOIN magaza_hedefleri mh ON m.magaza_id = mh.magaza_id
                    INNER JOIN kategori_hedefleri kh ON mh.hedef_id = kh.hedef_id
                    ORDER BY m.magaza_id ASC, kh.hedef_ciro_payi DESC
                `;
            }

            const params = magazaId ? [magazaId] : [];
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('KategoriHedefi.getPlanogramSuggestions hatası:', error);
            throw error;
        }
    }

    static async getCiroAnalysis(yil, ilceId = null) {
        try {
            let query = `
                SELECT 
                    m.magaza_id,
                    m.magaza_adi,
                    i.ilce_id,
                    i.ilce_adi,
                    kh.oncelikli_kategori AS hedef_kategori,
                    kh.hedef_ciro_payi,
                    p.en_cok_satan_kategori AS gercek_kategori,
                    ROUND(SUM(p.toplam_ciro), 0) AS gercek_ciro,
                    ROUND(SUM(p.toplam_ciro) * kh.hedef_ciro_payi / 100, 0) AS hedef_ciro,
                    CASE 
                        WHEN p.en_cok_satan_kategori = kh.oncelikli_kategori THEN 'Uyumlu'
                        ELSE 'Uyumsuz'
                    END AS durum
                FROM magazalar m
                INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                LEFT JOIN performans p ON m.magaza_id = p.magaza_id AND YEAR(p.donem_ay) = ?
                INNER JOIN magaza_hedefleri mh ON m.magaza_id = mh.magaza_id
                INNER JOIN kategori_hedefleri kh ON mh.hedef_id = kh.hedef_id
            `;
            
            const params = [yil];
            
            if (ilceId && ilceId !== 'all') {
                query += ` WHERE i.ilce_id = ?`;
                params.push(parseInt(ilceId));
            }
            
            query += `
                GROUP BY m.magaza_id, m.magaza_adi, i.ilce_id, i.ilce_adi, 
                         kh.oncelikli_kategori, kh.hedef_ciro_payi, p.en_cok_satan_kategori
                ORDER BY gercek_ciro DESC
            `;
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('KategoriHedefi.getCiroAnalysis hatası:', error);
            throw error;
        }
    }

    static async getHedefAnalizi(yil, ilceId, demografi = null) {
        try {
            let query = `
                SELECT 
                    m.magaza_id,
                    m.magaza_adi,
                    i.ilce_adi,
                    kh.oncelikli_kategori AS kategori,
                    kh.demografik_yapi,
                    AVG(kh.hedef_ciro_payi) AS hedef_oran,
                    AVG(ROUND((gkc.gerceklesen_ciro / NULLIF(p.toplam_ciro, 0)) * 100, 2)) AS gerceklesen_oran
                FROM gerceklesen_magaza_kategori_ciro gkc
                INNER JOIN magazalar m ON gkc.magaza_id = m.magaza_id
                INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                INNER JOIN kategori_hedefleri kh ON gkc.hedef_id = kh.hedef_id
                INNER JOIN performans p ON gkc.magaza_id = p.magaza_id 
                    AND (
                        DATE_FORMAT(p.donem_ay, '%Y-%m-%d') = gkc.donem_ay
                        OR DATE_FORMAT(p.donem_ay, '%Y-%m') = gkc.donem_ay
                        OR DATE_FORMAT(p.donem_ay, '%Y-%m') = LEFT(gkc.donem_ay, 7)
                    )
                WHERE YEAR(STR_TO_DATE(gkc.donem_ay, '%Y-%m-%d')) = ?
                  AND i.ilce_id = ?
            `;
            
            const params = [yil, parseInt(ilceId)];
            
            if (demografi && demografi !== 'all') {
                query += ` AND kh.demografik_yapi = ?`;
                params.push(demografi);
            }
            
            query += ` 
                GROUP BY m.magaza_id, m.magaza_adi, i.ilce_adi, kh.oncelikli_kategori, kh.demografik_yapi
                ORDER BY m.magaza_adi, kh.oncelikli_kategori
            `;
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('KategoriHedefi.getHedefAnalizi hatası:', error);
            throw error;
        }
    }

    static async getKarsilastirmaHedefleri(type, id, date) {
        try {
            let query;
            if (type === 'magaza') {
                query = `
                    SELECT 
                        kh.oncelikli_kategori,
                        ROUND((SUM(gkc.gerceklesen_ciro) / SUM(kh.hedef_ciro_payi * p.toplam_ciro / 100)) * 100, 1) AS tutma_orani
                    FROM gerceklesen_magaza_kategori_ciro gkc
                    INNER JOIN kategori_hedefleri kh ON gkc.hedef_id = kh.hedef_id
                    INNER JOIN performans p ON gkc.magaza_id = p.magaza_id 
                        AND DATE_FORMAT(p.donem_ay, '%Y-%m-%d') = gkc.donem_ay
                    WHERE gkc.magaza_id = ? AND gkc.donem_ay = ?
                    GROUP BY kh.oncelikli_kategori
                `;
            } else {
                const ilceFilter = type === 'ilce' ? 'i.ilce_id = ?' : 'il.il_id = ?';
                query = `
                    SELECT 
                        kh.oncelikli_kategori,
                        ROUND(AVG((gkc.gerceklesen_ciro / (kh.hedef_ciro_payi * p.toplam_ciro / 100)) * 100), 1) AS tutma_orani
                    FROM gerceklesen_magaza_kategori_ciro gkc
                    INNER JOIN kategori_hedefleri kh ON gkc.hedef_id = kh.hedef_id
                    INNER JOIN performans p ON gkc.magaza_id = p.magaza_id 
                        AND DATE_FORMAT(p.donem_ay, '%Y-%m-%d') = gkc.donem_ay
                    INNER JOIN magazalar m ON gkc.magaza_id = m.magaza_id
                    INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                    ${type === 'il' ? 'INNER JOIN iller il ON i.il_id = il.il_id' : ''}
                    WHERE ${ilceFilter} AND gkc.donem_ay = ?
                    GROUP BY kh.oncelikli_kategori
                `;
            }

            const [rows] = await db.query(query, [parseInt(id), date]);
            return rows;
        } catch (error) {
            console.error('KategoriHedefi.getKarsilastirmaHedefleri hatası:', error);
            throw error;
        }
    }

    static async getHedefTutmaPuani(magazaId, yil) {
        try {
            const query = `
                SELECT 
                    AVG(gerceklesen_ciro) AS ortalama_gerceklesen,
                    AVG(hedef_ciro) AS ortalama_hedef
                FROM (
                    SELECT 
                        gkc.gerceklesen_ciro,
                        kh.hedef_ciro_payi * p.toplam_ciro / 100 AS hedef_ciro
                    FROM gerceklesen_magaza_kategori_ciro gkc
                    INNER JOIN kategori_hedefleri kh ON gkc.hedef_id = kh.hedef_id
                    INNER JOIN performans p ON gkc.magaza_id = p.magaza_id 
                        AND (
                            DATE_FORMAT(p.donem_ay, '%Y-%m-%d') = gkc.donem_ay
                            OR DATE_FORMAT(p.donem_ay, '%Y-%m') = gkc.donem_ay
                            OR DATE_FORMAT(p.donem_ay, '%Y-%m') = LEFT(gkc.donem_ay, 7)
                        )
                    WHERE gkc.magaza_id = ? 
                      AND LEFT(gkc.donem_ay, 4) = ?
                ) AS hedef_veriler
            `;
            const [rows] = await db.query(query, [magazaId, yil.toString()]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('KategoriHedefi.getHedefTutmaPuani hatası:', error);
            throw error;
        }
    }
}

module.exports = KategoriHedefi;

