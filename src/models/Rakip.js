const db = require('../config/db');

class Rakip {
    static async getTableStructure() {
        try {
            const query = `
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT,
                    COLUMN_KEY,
                    EXTRA
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'rakipler'
                ORDER BY ORDINAL_POSITION
            `;
            
            const [columns] = await db.query(query);
            
            return columns.map(col => ({
                name: col.COLUMN_NAME,
                type: col.DATA_TYPE,
                nullable: col.IS_NULLABLE === 'YES',
                default: col.COLUMN_DEFAULT,
                key: col.COLUMN_KEY,
                extra: col.EXTRA
            }));
        } catch (error) {
            console.error('Rakip.getTableStructure hatası:', error);
            throw error;
        }
    }

    static async findAll() {
        try {
            const [rows] = await db.query('SELECT * FROM rakipler ORDER BY id');
            return rows;
        } catch (error) {
            console.error('Rakip.findAll hatası:', error);
            throw error;
        }
    }

    static async findByYakinMagazaId(yakinMagazaId) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM rakipler WHERE yakin_magaza_id = ? ORDER BY id',
                [yakinMagazaId]
            );
            return rows;
        } catch (error) {
            console.error('Rakip.findByYakinMagazaId hatası:', error);
            throw error;
        }
    }

    static async findWithCoordinates() {
        try {
            const [rakipler] = await db.query(`
                SELECT 
                    r.id,
                    r.marka,
                    r.enlem,
                    r.boylam,
                    r.yakin_magaza_id,
                    m.magaza_adi AS yakin_magaza_adi
                FROM rakipler r
                LEFT JOIN magazalar m ON r.yakin_magaza_id = m.magaza_id
                WHERE r.enlem IS NOT NULL AND r.boylam IS NOT NULL
            `);
            return rakipler;
        } catch (error) {
            console.error('Rakip.findWithCoordinates hatası:', error);
            throw error;
        }
    }
}

module.exports = Rakip;

