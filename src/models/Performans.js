const db = require('../config/db');

class Performans {
    static async getLatestPeriod() {
        try {
            const [result] = await db.query(`
                SELECT MAX(donem_ay) AS son_donem FROM performans
            `);
            return result[0]?.son_donem || null;
        } catch (error) {
            console.error('Performans.getLatestPeriod hatası:', error);
            throw error;
        }
    }

    static async findByMagazaAndPeriod(magazaId, donem) {
        try {
            const query = `
                SELECT * FROM performans 
                WHERE magaza_id = ? AND donem_ay = ?
            `;
            const [rows] = await db.query(query, [magazaId, donem]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Performans.findByMagazaAndPeriod hatası:', error);
            throw error;
        }
    }

    static async findByMagazaId(magazaId, filters = {}) {
        try {
            let query = `
                SELECT * FROM performans 
                WHERE magaza_id = ?
            `;
            const params = [magazaId];

            if (filters.yil) {
                query += ` AND YEAR(donem_ay) = ?`;
                params.push(filters.yil);
            }

            if (filters.baslangic && filters.bitis) {
                query += ` AND DATE_FORMAT(donem_ay, '%Y-%m') >= ? AND DATE_FORMAT(donem_ay, '%Y-%m') <= ?`;
                params.push(filters.baslangic, filters.bitis);
            }

            query += ` ORDER BY donem_ay ASC`;

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Performans.findByMagazaId hatası:', error);
            throw error;
        }
    }

    static async getMonthlyRevenue(baslangic, bitis) {
        try {
            const query = `
                SELECT 
                    YEAR(donem_ay) AS yil,
                    MONTH(donem_ay) AS ay,
                    DATE_FORMAT(donem_ay, '%Y-%m') AS donem,
                    DATE_FORMAT(donem_ay, '%b %Y') AS donem_label,
                    ROUND(AVG(toplam_ciro), 2) AS ortalama_ciro,
                    ROUND(SUM(toplam_ciro), 2) AS toplam_ciro,
                    COUNT(DISTINCT magaza_id) AS magaza_sayisi
                FROM performans
                WHERE toplam_ciro IS NOT NULL 
                  AND toplam_ciro > 0
                  AND donem_ay >= ?
                  AND donem_ay <= ?
                GROUP BY YEAR(donem_ay), MONTH(donem_ay), DATE_FORMAT(donem_ay, '%Y-%m')
                ORDER BY YEAR(donem_ay) ASC, MONTH(donem_ay) ASC
            `;
            const [rows] = await db.query(query, [baslangic, bitis]);
            return rows;
        } catch (error) {
            console.error('Performans.getMonthlyRevenue hatası:', error);
            throw error;
        }
    }

    static async getTopBottomStores(limit = 5) {
        try {
            const topQuery = `
                SELECT 
                    m.magaza_id,
                    m.magaza_adi,
                    ROUND(SUM(p.toplam_ciro), 2) AS toplam_ciro,
                    ROUND(AVG(p.toplam_ciro), 2) AS ortalama_ciro,
                    'top' AS kategori
                FROM magazalar m
                INNER JOIN performans p ON m.magaza_id = p.magaza_id
                WHERE p.donem_ay >= DATE_SUB((SELECT MAX(donem_ay) FROM performans), INTERVAL 6 MONTH)
                  AND p.toplam_ciro IS NOT NULL
                  AND p.toplam_ciro > 0
                GROUP BY m.magaza_id, m.magaza_adi
                ORDER BY toplam_ciro DESC
                LIMIT ?
            `;
            const bottomQuery = `
                SELECT 
                    m.magaza_id,
                    m.magaza_adi,
                    ROUND(SUM(p.toplam_ciro), 2) AS toplam_ciro,
                    ROUND(AVG(p.toplam_ciro), 2) AS ortalama_ciro,
                    'bottom' AS kategori
                FROM magazalar m
                INNER JOIN performans p ON m.magaza_id = p.magaza_id
                WHERE p.donem_ay >= DATE_SUB((SELECT MAX(donem_ay) FROM performans), INTERVAL 6 MONTH)
                  AND p.toplam_ciro IS NOT NULL
                  AND p.toplam_ciro > 0
                GROUP BY m.magaza_id, m.magaza_adi
                ORDER BY toplam_ciro ASC
                LIMIT ?
            `;

            const [topResults] = await db.query(topQuery, [limit]);
            const [bottomResults] = await db.query(bottomQuery, [limit]);

            return { top: topResults, bottom: bottomResults };
        } catch (error) {
            console.error('Performans.getTopBottomStores hatası:', error);
            throw error;
        }
    }

    static async getAvailableYears() {
        try {
            const [results] = await db.query(`
                SELECT DISTINCT YEAR(donem_ay) AS yil FROM performans ORDER BY yil DESC
            `);
            return results.map(r => r.yil);
        } catch (error) {
            console.error('Performans.getAvailableYears hatası:', error);
            throw error;
        }
    }

    static async getMagazaDetayliPerformans(magazaId, yil) {
        try {
            const query = `
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
                  AND LEFT(p.donem_ay, 4) = ?
                ORDER BY p.donem_ay DESC LIMIT 1
            `;
            const [rows] = await db.query(query, [magazaId, yil.toString()]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Performans.getMagazaDetayliPerformans hatası:', error);
            throw error;
        }
    }

    static async getAveragePerformance(yil) {
        try {
            const query = `
                SELECT 
                    AVG(toplam_ciro) AS avg_ciro,
                    AVG(musteri_memnuniyet_puani) AS avg_memnuniyet,
                    AVG(personel_devir_hizi) AS avg_personel_devir,
                    AVG(stok_devir_hizi) AS avg_stok_devir,
                    AVG(kira_gideri) AS avg_kira
                FROM performans p
                WHERE p.donem_ay = (
                    SELECT MAX(p2.donem_ay) 
                    FROM performans p2
                    WHERE LEFT(p2.donem_ay, 4) = ?
                )
                AND LEFT(p.donem_ay, 4) = ?
            `;
            const [rows] = await db.query(query, [yil.toString(), yil.toString()]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Performans.getAveragePerformance hatası:', error);
            throw error;
        }
    }

    static async getPersonelDevirOrtalamasi(magazaId, yil) {
        try {
            const query = `
                SELECT AVG(personel_devir_hizi) AS avg_personel_devir
                FROM performans
                WHERE magaza_id = ? AND LEFT(donem_ay, 4) = ?
            `;
            const [rows] = await db.query(query, [magazaId, yil.toString()]);
            return rows[0]?.avg_personel_devir ?? null;
        } catch (error) {
            console.error('Performans.getPersonelDevirOrtalamasi hatası:', error);
            throw error;
        }
    }

    static async getIlOrtalamasi(ilId, donem) {
        try {
            const query = `
                SELECT 
                    AVG(p.toplam_ciro) AS avg_ciro,
                    AVG(p.musteri_memnuniyet_puani) AS avg_memnuniyet,
                    AVG(p.personel_devir_hizi) AS avg_personel_devir,
                    AVG(p.stok_devir_hizi) AS avg_stok_devir,
                    AVG(p.kira_gideri) AS avg_kira,
                    AVG(COALESCE(k.kds_puani, 0)) AS avg_kds,
                    COUNT(DISTINCT p.magaza_id) AS magaza_sayisi
                FROM performans p
                INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
                INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                LEFT JOIN kds_sonuc k ON p.magaza_id = k.magaza_id 
                    AND LEFT(k.donem, 7) = LEFT(p.donem_ay, 7)
                WHERE i.il_id = ? AND LEFT(p.donem_ay, 7) = LEFT(?, 7)
            `;
            const [rows] = await db.query(query, [ilId, donem]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Performans.getIlOrtalamasi hatası:', error);
            throw error;
        }
    }

    static async getMagazaBenchmark(magazaId, yil) {
        try {
            const query = `
                SELECT 
                    p.toplam_ciro,
                    p.musteri_memnuniyet_puani,
                    p.personel_devir_hizi,
                    p.stok_devir_hizi,
                    p.kira_gideri,
                    p.donem_ay,
                    COALESCE(k.kds_puani, 0) AS kds_puani
                FROM performans p
                LEFT JOIN kds_sonuc k ON p.magaza_id = k.magaza_id 
                    AND LEFT(k.donem, 7) = LEFT(p.donem_ay, 7)
                WHERE p.magaza_id = ?
                  ${yil && yil !== 'all' ? `AND YEAR(STR_TO_DATE(p.donem_ay, '%Y-%m-%d')) = ?` : ''}
                ORDER BY p.donem_ay DESC LIMIT 1
            `;
            const params = [magazaId];
            if (yil && yil !== 'all') {
                params.push(parseInt(yil));
            }
            const [rows] = await db.query(query, params);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Performans.getMagazaBenchmark hatası:', error);
            throw error;
        }
    }

    static async getMagazaKiraCiro(magazaId, yil = null) {
        try {
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
                params = [magazaId, yil, magazaId, yil];
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
                params = [magazaId, magazaId];
            }

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Performans.getMagazaKiraCiro hatası:', error);
            throw error;
        }
    }

    static async getAllDates() {
        try {
            const [result] = await db.query(`
                SELECT DISTINCT donem_ay
                FROM performans
                WHERE donem_ay IS NOT NULL
                ORDER BY donem_ay DESC
            `);
            return result;
        } catch (error) {
            console.error('Performans.getAllDates hatası:', error);
            throw error;
        }
    }

    static async getHRAnalysisData(filters = {}) {
        try {
            let donemFilter = '';
            let params = [];
            
            if (filters.baslangic && filters.bitis) {
                donemFilter = `WHERE p.donem_ay >= ? AND p.donem_ay <= ?`;
                params.push(filters.baslangic, filters.bitis);
            } else if (filters.donem) {
                donemFilter = `WHERE p.donem_ay LIKE ?`;
                params.push(`${filters.donem}%`);
            } else if (filters.lastPeriod) {
                donemFilter = `WHERE p.donem_ay = ?`;
                params.push(filters.lastPeriod);
            }

            let query;
            if (filters.baslangic && filters.bitis) {
                query = `
                    SELECT 
                        m.magaza_id,
                        m.magaza_adi,
                        i.ilce_adi,
                        ROUND(AVG(p.personel_devir_hizi), 2) AS personel_devir_hizi,
                        ROUND(AVG(p.musteri_memnuniyet_puani), 2) AS musteri_memnuniyet_puani,
                        ROUND(AVG(p.toplam_ciro), 2) AS toplam_ciro,
                        ROUND(AVG(p.personel_sayisi), 0) AS personel_sayisi
                    FROM performans p
                    INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
                    LEFT JOIN ilceler i ON m.ilce_id = i.ilce_id
                    ${donemFilter}
                    GROUP BY m.magaza_id, m.magaza_adi, i.ilce_adi
                    ORDER BY personel_devir_hizi DESC
                `;
            } else {
                query = `
                    SELECT 
                        m.magaza_id,
                        m.magaza_adi,
                        i.ilce_adi,
                        p.donem_ay,
                        p.personel_devir_hizi,
                        p.musteri_memnuniyet_puani,
                        p.toplam_ciro,
                        p.personel_sayisi
                    FROM performans p
                    INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
                    LEFT JOIN ilceler i ON m.ilce_id = i.ilce_id
                    ${donemFilter}
                    ORDER BY p.personel_devir_hizi DESC
                `;
            }

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Performans.getHRAnalysisData hatası:', error);
            throw error;
        }
    }

    static async getSeasonalLogistics(yil, magazaId = null) {
        try {
            let magazaFilter = '';
            let params = [yil];
            
            if (magazaId && magazaId !== 'all') {
                magazaFilter = 'AND m.magaza_id = ?';
                params.push(parseInt(magazaId));
            }
            
            const query = `
                SELECT 
                    MONTH(STR_TO_DATE(p.donem_ay, '%Y-%m-%d')) AS ay,
                    ROUND(AVG(p.stok_devir_hizi), 1) AS stok_devir_hizi,
                    COUNT(DISTINCT m.magaza_id) AS magaza_sayisi
                FROM performans p
                INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
                WHERE YEAR(STR_TO_DATE(p.donem_ay, '%Y-%m-%d')) = ?
                  AND m.demografik_yapi = 'Turistik'
                  AND p.stok_devir_hizi IS NOT NULL
                  ${magazaFilter}
                GROUP BY MONTH(STR_TO_DATE(p.donem_ay, '%Y-%m-%d'))
                ORDER BY ay
            `;
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Performans.getSeasonalLogistics hatası:', error);
            throw error;
        }
    }

    static async getRentAnalysisData(donem, limit = 10) {
        try {
            const query = `
                SELECT 
                    m.magaza_id,
                    m.magaza_adi,
                    m.magaza_m2,
                    i.ilce_adi,
                    p.donem_ay,
                    p.toplam_ciro,
                    p.kira_gideri,
                    CASE 
                        WHEN p.toplam_ciro > 0 THEN ROUND((p.kira_gideri / p.toplam_ciro) * 100, 2)
                        ELSE NULL
                    END AS kira_yuku_orani,
                    CASE 
                        WHEN m.magaza_m2 > 0 THEN ROUND(p.toplam_ciro / m.magaza_m2, 2)
                        ELSE NULL
                    END AS m2_verimliligi,
                    CASE 
                        WHEN p.toplam_ciro > 0 AND (p.kira_gideri / p.toplam_ciro) * 100 > 15 THEN
                            CONCAT('KRİTİK: Kira yükü (%', ROUND((p.kira_gideri / p.toplam_ciro) * 100, 2), ') sürdürülemez seviyede! Mağaza taşınmalı veya kapatılmalı.')
                        WHEN p.toplam_ciro > 0 AND (p.kira_gideri / p.toplam_ciro) * 100 BETWEEN 10 AND 15 THEN
                            CONCAT('DİKKAT: Kira/Ciro oranı (%', ROUND((p.kira_gideri / p.toplam_ciro) * 100, 2), ') sınırda. Kira indirimi talep edilmeli.')
                        WHEN p.toplam_ciro > 0 AND (p.kira_gideri / p.toplam_ciro) * 100 < 10 THEN
                            'BAŞARILI: Mağaza kârlı ve kira yükü ideal seviyede.'
                        ELSE
                            'VERİ EKSİK: Ciro veya kira bilgisi bulunamadı.'
                    END AS durum_mesaji,
                    CASE 
                        WHEN p.toplam_ciro > 0 AND (p.kira_gideri / p.toplam_ciro) * 100 > 15 THEN 'Kirmizi'
                        WHEN p.toplam_ciro > 0 AND (p.kira_gideri / p.toplam_ciro) * 100 BETWEEN 10 AND 15 THEN 'Sari'
                        WHEN p.toplam_ciro > 0 AND (p.kira_gideri / p.toplam_ciro) * 100 < 10 THEN 'Yesil'
                        ELSE 'Gri'
                    END AS durum_rengi
                FROM magazalar m
                INNER JOIN performans p ON m.magaza_id = p.magaza_id
                LEFT JOIN ilceler i ON m.ilce_id = i.ilce_id
                WHERE p.donem_ay = ?
                ORDER BY 
                    CASE 
                        WHEN p.toplam_ciro > 0 THEN (p.kira_gideri / p.toplam_ciro) * 100
                        ELSE 999
                    END DESC
                LIMIT ?
            `;
            
            const [rows] = await db.query(query, [donem, limit]);
            return rows;
        } catch (error) {
            console.error('Performans.getRentAnalysisData hatası:', error);
            throw error;
        }
    }

    static async getSenaryoVerileri(baslangicStr, bitisStr, sonDonem) {
        try {
            const query = `
                SELECT 
                    m.magaza_id,
                    m.magaza_adi,
                    p.toplam_ciro,
                    p.kira_gideri,
                    COALESCE(p.personel_sayisi, 0) AS personel_sayisi,
                    p.donem_ay,
                    COALESCE((
                        SELECT ROUND(AVG(k2.kds_puani), 2)
                        FROM kds_sonuc k2
                        WHERE k2.magaza_id = m.magaza_id
                          AND LEFT(k2.donem, 7) >= ?
                          AND LEFT(k2.donem, 7) <= ?
                    ), 0) AS kds_puani
                FROM performans p
                INNER JOIN magazalar m ON p.magaza_id = m.magaza_id
                WHERE p.donem_ay = ?
                ORDER BY kds_puani ASC, m.magaza_adi ASC
            `;
            const [rows] = await db.query(query, [baslangicStr, bitisStr, sonDonem]);
            return rows;
        } catch (error) {
            console.error('Performans.getSenaryoVerileri hatası:', error);
            throw error;
        }
    }

    static async getKarsilastirmaData(type, id, date) {
        try {
            let query;
            if (type === 'magaza') {
                query = `
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
            } else if (type === 'ilce') {
                query = `
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
            } else if (type === 'il') {
                query = `
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
            }

            const [rows] = await db.query(query, [parseInt(id), date]);
            return rows;
        } catch (error) {
            console.error('Performans.getKarsilastirmaData hatası:', error);
            throw error;
        }
    }
}

module.exports = Performans;

