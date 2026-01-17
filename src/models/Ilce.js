const db = require('../config/db');

class Ilce {
    static async findAll() {
        try {
            const query = `
                SELECT 
                    i.ilce_id,
                    i.ilce_adi,
                    il.il_adi,
                    COUNT(m.magaza_id) AS magaza_sayisi
                FROM ilceler i
                LEFT JOIN iller il ON i.il_id = il.il_id
                LEFT JOIN magazalar m ON i.ilce_id = m.ilce_id
                GROUP BY i.ilce_id, i.ilce_adi, il.il_adi
                HAVING magaza_sayisi > 0
                ORDER BY il.il_adi, i.ilce_adi
            `;
            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Ilce.findAll hatası:', error);
            throw error;
        }
    }

    static async findAllSimple() {
        try {
            const query = `
                SELECT ilce_id, ilce_adi FROM ilceler ORDER BY ilce_adi
            `;
            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Ilce.findAllSimple hatası:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT * FROM ilceler WHERE ilce_id = ?
            `;
            const [rows] = await db.query(query, [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Ilce.findById hatası:', error);
            throw error;
        }
    }
}

module.exports = Ilce;

