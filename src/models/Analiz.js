const db = require('../config/db');

class Analiz {
    static async getCannibalization() {
        try {
            const query = `
                SELECT 
                    m1.magaza_id AS storeA_id,
                    m1.magaza_adi AS storeA,
                    m2.magaza_id AS storeB_id,
                    m2.magaza_adi AS storeB,
                    ROUND(
                        ST_Distance_Sphere(
                            POINT(IFNULL(m1.boylam, 0), IFNULL(m1.enlem, 0)),
                            POINT(IFNULL(m2.boylam, 0), IFNULL(m2.enlem, 0))
                        ),
                        0
                    ) AS distance_meters
                FROM magazalar m1
                CROSS JOIN magazalar m2
                WHERE m1.magaza_id < m2.magaza_id
                HAVING distance_meters < 300 AND distance_meters > 0
                ORDER BY distance_meters ASC
            `;
            
            let results;
            try {
                [results] = await db.query(query);
            } catch (error) {
                console.log('ST_Distance_Sphere desteklenmiyor, alternatif sorgu kullanılıyor...');
                try {
                    const alternativeQuery = `
                        SELECT 
                            m1.magaza_id AS storeA_id,
                            m1.magaza_adi AS storeA,
                            m2.magaza_id AS storeB_id,
                            m2.magaza_adi AS storeB,
                            ROUND(
                                6371000 * ACOS(
                                    LEAST(1.0, 
                                        COS(RADIANS(IFNULL(m1.enlem, 0))) * 
                                        COS(RADIANS(IFNULL(m2.enlem, 0))) * 
                                        COS(RADIANS(IFNULL(m2.boylam, 0) - IFNULL(m1.boylam, 0))) + 
                                        SIN(RADIANS(IFNULL(m1.enlem, 0))) * 
                                        SIN(RADIANS(IFNULL(m2.enlem, 0)))
                                    )
                                ),
                                0
                            ) AS distance_meters
                        FROM magazalar m1
                        CROSS JOIN magazalar m2
                        WHERE m1.magaza_id < m2.magaza_id
                        HAVING distance_meters < 300 AND distance_meters > 0
                        ORDER BY distance_meters ASC
                    `;
                    [results] = await db.query(alternativeQuery);
                } catch (altError) {
                    const fallbackQuery = `
                        SELECT 
                            m1.magaza_id AS storeA_id,
                            m1.magaza_adi AS storeA,
                            m2.magaza_id AS storeB_id,
                            m2.magaza_adi AS storeB,
                            NULL AS distance_meters,
                            'Koordinat bilgisi bulunamadı - Aynı ilçede' AS note
                        FROM magazalar m1
                        INNER JOIN magazalar m2 ON m1.ilce_id = m2.ilce_id
                        WHERE m1.magaza_id < m2.magaza_id
                        ORDER BY m1.magaza_id, m2.magaza_id
                    `;
                    [results] = await db.query(fallbackQuery);
                }
            }
            
            return results;
        } catch (error) {
            console.error('Analiz.getCannibalization hatası:', error);
            throw error;
        }
    }

    static async getCompetitorAnalysis(magazaId = null) {
        try {
            const query = `
                SELECT 
                    m.magaza_id,
                    m.magaza_adi AS magaza,
                    COALESCE(r_stats.bim_sayisi, 0) AS bim_sayisi,
                    COALESCE(r_stats.sok_sayisi, 0) AS sok_sayisi,
                    COALESCE(r_stats.migros_sayisi, 0) AS migros_sayisi,
                    COALESCE(r_stats.toplam_rakip, 0) AS toplam_rakip
                FROM magazalar m
                LEFT JOIN (
                    SELECT 
                        yakin_magaza_id,
                        COUNT(CASE WHEN marka = 'BİM' THEN 1 END) AS bim_sayisi,
                        COUNT(CASE WHEN marka = 'ŞOK' THEN 1 END) AS sok_sayisi,
                        COUNT(CASE WHEN marka = 'MİGROS' THEN 1 END) AS migros_sayisi,
                        COUNT(*) AS toplam_rakip
                    FROM rakipler
                    WHERE yakin_magaza_id IS NOT NULL
                    GROUP BY yakin_magaza_id
                ) r_stats ON m.magaza_id = r_stats.yakin_magaza_id
                ${magazaId ? 'WHERE m.magaza_id = ?' : ''}
                ORDER BY toplam_rakip DESC
            `;
            
            const params = magazaId ? [magazaId] : [];
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Analiz.getCompetitorAnalysis hatası:', error);
            throw error;
        }
    }

    static async searchStores(searchTerm) {
        try {
            const term = `%${searchTerm}%`;
            const query = `
                SELECT 
                    m.magaza_id,
                    m.magaza_adi,
                    m.enlem,
                    m.boylam,
                    m.magaza_m2,
                    m.demografik_yapi,
                    i.ilce_adi,
                    il.il_adi
                FROM magazalar m
                LEFT JOIN ilceler i ON m.ilce_id = i.ilce_id
                LEFT JOIN iller il ON i.il_id = il.il_id
                WHERE m.magaza_adi LIKE ?
                   OR i.ilce_adi LIKE ?
                   OR il.il_adi LIKE ?
                ORDER BY 
                    CASE 
                        WHEN m.magaza_adi LIKE ? THEN 1
                        WHEN i.ilce_adi LIKE ? THEN 2
                        ELSE 3
                    END,
                    m.magaza_adi
                LIMIT 20
            `;
            const [rows] = await db.query(query, [
                term, term, term,
                `${searchTerm}%`, `${searchTerm}%`
            ]);
            return rows;
        } catch (error) {
            console.error('Analiz.searchStores hatası:', error);
            throw error;
        }
    }

    static async checkCannibalizationForNewStore(enlem, boylam) {
        try {
            if (!enlem || !boylam) {
                return null;
            }

            let query;
            try {
                query = `
                    SELECT 
                        m.magaza_id,
                        m.magaza_adi,
                        ROUND(
                            ST_Distance_Sphere(
                                POINT(?, ?),
                                POINT(IFNULL(m.boylam, 0), IFNULL(m.enlem, 0))
                            ),
                            0
                        ) AS distance_meters
                    FROM magazalar m
                    WHERE m.enlem IS NOT NULL 
                      AND m.boylam IS NOT NULL
                    HAVING distance_meters < 500 AND distance_meters > 0
                    ORDER BY distance_meters ASC
                    LIMIT 5
                `;
                const [results] = await db.query(query, [boylam, enlem]);
                
                if (results.length > 0) {
                    const yakınMagazalar = results.map(r => ({
                        magaza_id: r.magaza_id,
                        magaza_adi: r.magaza_adi,
                        distance_meters: r.distance_meters
                    }));
                    
                    const hedefTutmayanMagazalar = [];
                    for (const magaza of yakınMagazalar) {
                        try {
                            const [hedefKontrol] = await db.query(`
                                SELECT 
                                    CASE 
                                        WHEN AVG((gkc.gerceklesen_ciro / NULLIF(kh.hedef_ciro_payi * p.toplam_ciro / 100, 0)) * 100) < 90 
                                        THEN 1 
                                        ELSE 0 
                                    END AS hedef_tutmiyor
                                FROM gerceklesen_magaza_kategori_ciro gkc
                                INNER JOIN kategori_hedefleri kh ON gkc.hedef_id = kh.hedef_id
                                INNER JOIN performans p ON gkc.magaza_id = p.magaza_id 
                                    AND DATE_FORMAT(p.donem_ay, '%Y-%m') = LEFT(gkc.donem_ay, 7)
                                WHERE gkc.magaza_id = ?
                                GROUP BY gkc.magaza_id
                            `, [magaza.magaza_id]);
                            
                            if (hedefKontrol && hedefKontrol.length > 0 && hedefKontrol[0].hedef_tutmiyor === 1) {
                                hedefTutmayanMagazalar.push(magaza);
                            }
                        } catch (err) {
                            console.log(`Mağaza ${magaza.magaza_id} için hedef kontrolü yapılamadı:`, err.message);
                        }
                    }
                    
                    if (hedefTutmayanMagazalar.length > 0) {
                        return {
                            uyari: true,
                            mesaj: `YAMYAMLIK UYARISI: ${hedefTutmayanMagazalar.length} yakın mağaza (500m içinde) ciro hedefini tutmuyor. Yeni mağaza eklemek riskli olabilir.`,
                            yakın_magazalar: hedefTutmayanMagazalar
                        };
                    } else if (yakınMagazalar.length > 0) {
                        return {
                            uyari: true,
                            mesaj: `YAMYAMLIK UYARISI: ${yakınMagazalar.length} yakın mağaza (500m içinde) bulundu. Dikkatli olunmalı.`,
                            yakın_magazalar: yakınMagazalar
                        };
                    }
                }
                
                return null;
            } catch (error) {
                const alternativeQuery = `
                    SELECT 
                        m.magaza_id,
                        m.magaza_adi,
                        ROUND(
                            6371000 * ACOS(
                                LEAST(1.0, 
                                    COS(RADIANS(?)) * 
                                    COS(RADIANS(IFNULL(m.enlem, 0))) * 
                                    COS(RADIANS(IFNULL(m.boylam, 0) - ?)) + 
                                    SIN(RADIANS(?)) * 
                                    SIN(RADIANS(IFNULL(m.enlem, 0)))
                                )
                            ),
                            0
                        ) AS distance_meters
                    FROM magazalar m
                    WHERE m.enlem IS NOT NULL 
                      AND m.boylam IS NOT NULL
                    HAVING distance_meters < 500 AND distance_meters > 0
                    ORDER BY distance_meters ASC
                    LIMIT 5
                `;
                const [results] = await db.query(alternativeQuery, [enlem, boylam, enlem]);
                
                if (results.length > 0) {
                    return {
                        uyari: true,
                        mesaj: `YAMYAMLIK UYARISI: ${results.length} yakın mağaza (500m içinde) bulundu. Ciro hedefi kontrolü yapılamadı.`,
                        yakın_magazalar: results.map(r => ({
                            magaza_id: r.magaza_id,
                            magaza_adi: r.magaza_adi,
                            distance_meters: r.distance_meters
                        }))
                    };
                }
                
                return null;
            }
        } catch (error) {
            console.error('Analiz.checkCannibalizationForNewStore hatası:', error);
            return null;
        }
    }
}

module.exports = Analiz;

