const db = require('../config/db');

class Magaza {
    static async findAll() {
        try {
            const [rows] = await db.query('SELECT * FROM magazalar ORDER BY magaza_id');
            return rows;
        } catch (error) {
            console.error('Magaza.findAll hatası:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT 
                    m.*,
                    i.ilce_adi,
                    il.il_adi
                FROM magazalar m
                LEFT JOIN ilceler i ON m.ilce_id = i.ilce_id
                LEFT JOIN iller il ON i.il_id = il.il_id
                WHERE m.magaza_id = ?
            `;
            const [rows] = await db.query(query, [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Magaza.findById hatası:', error);
            throw error;
        }
    }

    static async findByIdSimple(id) {
        try {
            const [rows] = await db.query('SELECT magaza_id FROM magazalar WHERE magaza_id = ?', [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Magaza.findByIdSimple hatası:', error);
            throw error;
        }
    }

    static async create(data) {
        try {
            const {
                magaza_adi,
                ilce_id,
                magaza_m2,
                rakip_sayisi_yakin,
                depoya_uzaklik_km,
                acilis_tarihi,
                enlem,
                boylam,
                demografik_yapi
            } = data;

            const query = `
                INSERT INTO magazalar 
                (magaza_adi, ilce_id, magaza_m2, rakip_sayisi_yakin, depoya_uzaklik_km, acilis_tarihi, enlem, boylam, demografik_yapi)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [result] = await db.query(query, [
                magaza_adi,
                ilce_id || null,
                magaza_m2 || null,
                rakip_sayisi_yakin || null,
                depoya_uzaklik_km || null,
                acilis_tarihi || null,
                enlem || null,
                boylam || null,
                demografik_yapi || null
            ]);

            return {
                magaza_id: result.insertId,
                magaza_adi
            };
        } catch (error) {
            console.error('Magaza.create hatası:', error);
            throw error;
        }
    }

    static async update(id, data) {
        try {
            const {
                magaza_adi,
                ilce_id,
                magaza_m2,
                rakip_sayisi_yakin,
                depoya_uzaklik_km,
                acilis_tarihi,
                enlem,
                boylam,
                demografik_yapi
            } = data;

            const query = `
                UPDATE magazalar 
                SET magaza_adi = COALESCE(?, magaza_adi),
                    ilce_id = ?,
                    magaza_m2 = ?,
                    rakip_sayisi_yakin = ?,
                    depoya_uzaklik_km = ?,
                    acilis_tarihi = ?,
                    enlem = ?,
                    boylam = ?,
                    demografik_yapi = ?
                WHERE magaza_id = ?
            `;

            await db.query(query, [
                magaza_adi,
                ilce_id || null,
                magaza_m2 || null,
                rakip_sayisi_yakin || null,
                depoya_uzaklik_km || null,
                acilis_tarihi || null,
                enlem || null,
                boylam || null,
                demografik_yapi || null,
                id
            ]);

            return { magaza_id: id };
        } catch (error) {
            console.error('Magaza.update hatası:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            await db.query('DELETE FROM magazalar WHERE magaza_id = ?', [id]);
            return { magaza_id: id };
        } catch (error) {
            console.error('Magaza.delete hatası:', error);
            throw error;
        }
    }

    static async findByDemografikYapi(demografikYapi) {
        try {
            const query = `
                SELECT magaza_id, magaza_adi 
                FROM magazalar 
                WHERE demografik_yapi = ? 
                ORDER BY magaza_adi
            `;
            const [rows] = await db.query(query, [demografikYapi]);
            return rows;
        } catch (error) {
            console.error('Magaza.findByDemografikYapi hatası:', error);
            throw error;
        }
    }

    static async findByIdWithIlInfo(id) {
        try {
            const query = `
                SELECT m.magaza_id, i.il_id, il.il_adi
                FROM magazalar m
                INNER JOIN ilceler i ON m.ilce_id = i.ilce_id
                INNER JOIN iller il ON i.il_id = il.il_id
                WHERE m.magaza_id = ?
            `;
            const [rows] = await db.query(query, [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Magaza.findByIdWithIlInfo hatası:', error);
            throw error;
        }
    }
}

module.exports = Magaza;

