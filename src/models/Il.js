const db = require('../config/db');

class Il {
    static async findAll() {
        try {
            const query = `
                SELECT 
                    il.il_id,
                    il.il_adi,
                    COUNT(DISTINCT m.magaza_id) AS magaza_sayisi
                FROM iller il
                LEFT JOIN ilceler i ON il.il_id = i.il_id
                LEFT JOIN magazalar m ON i.ilce_id = m.ilce_id
                GROUP BY il.il_id, il.il_adi
                HAVING magaza_sayisi > 0
                ORDER BY il.il_adi
            `;
            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Il.findAll hatası:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT * FROM iller WHERE il_id = ?
            `;
            const [rows] = await db.query(query, [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Il.findById hatası:', error);
            throw error;
        }
    }
}

module.exports = Il;

