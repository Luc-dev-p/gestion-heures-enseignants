const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { query } = require('../config/database');

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const MAX_BACKUPS = 20;

// Créer le dossier backups s'il n'existe pas
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Parser DATABASE_URL
const parseDbUrl = () => {
    const url = process.env.DATABASE_URL;
    if (!url) return null;
    try {
        const dbUrl = new URL(url);
        return {
            host: dbUrl.hostname,
            port: dbUrl.port || 5432,
            database: dbUrl.pathname.slice(1),
            user: dbUrl.username,
            password: dbUrl.password,
        };
    } catch { return null; }
};

// Trouver pg_dump (Windows-compatible)
const findPgDump = () => {
    const candidates = [
        'pg_dump',
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
    ];
    for (const cmd of candidates) {
        try {
            execSync(`"${cmd}" --version`, { stdio: 'ignore', timeout: 5000 });
            return cmd;
        } catch {}
    }
    return null;
};

// Nom de fichier
const getBackupFilename = (type) => {
    const now = new Date();
    const date = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `backup_${type}_${date}.sql`;
};

// Supprimer les anciennes sauvegardes
const cleanupOldBackups = (max = MAX_BACKUPS) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
            .map(f => ({
                name: f,
                path: path.join(BACKUP_DIR, f),
                mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
            }))
            .sort((a, b) => b.mtime - a.mtime);

        if (files.length > max) {
            files.slice(max).forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
        }
    } catch {}
};

// Sauvegarde avec pg_dump
const createWithPgDump = (type) => {
    const pgDump = findPgDump();
    if (!pgDump) return null;
    const dbConfig = parseDbUrl();
    if (!dbConfig) return null;

    const filename = getBackupFilename(type);
    const filepath = path.join(BACKUP_DIR, filename);

    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    const cmd = `"${pgDump}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --clean --if-exists --no-owner --no-privileges -F p -f "${filepath}"`;

    try {
        execSync(cmd, { env, stdio: 'pipe', timeout: 120000 });
        return filename;
    } catch {
        try {
            const cmd2 = `"${pgDump}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --no-owner --no-privileges -F p -f "${filepath}"`;
            execSync(cmd2, { env, stdio: 'pipe', timeout: 120000 });
            return filename;
        } catch {
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            return null;
        }
    }
};

// Sauvegarde manuelle (fallback sans pg_dump)
const createManual = async (type) => {
    const filename = getBackupFilename(type);
    const filepath = path.join(BACKUP_DIR, filename);

    let sql = `-- ========================================\n`;
    sql += `-- GHES - Sauvegarde de base de donnees\n`;
    sql += `-- Date: ${new Date().toISOString()}\n`;
    sql += `-- Methode: Export manuel\n`;
    sql += `-- ========================================\n\n`;

    try {
        const tables = await query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        for (const { table_name } of tables.rows) {
            const columns = await query(`
                SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [table_name]);

            sql += `-- Table: ${table_name}\n`;
            sql += `DROP TABLE IF EXISTS "${table_name}" CASCADE;\n`;

            const colDefs = columns.rows.map(col => {
                let def = `  "${col.column_name}"`;
                if (col.character_maximum_length) {
                    def += ` character varying(${col.character_maximum_length})`;
                } else {
                    def += ` ${col.data_type}`;
                }
                if (col.is_nullable === 'NO') def += ' NOT NULL';
                if (col.column_default !== null) def += ` DEFAULT ${col.column_default}`;
                return def;
            });
            sql += `CREATE TABLE "${table_name}" (\n${colDefs.join(',\n')}\n);\n\n`;

            // Data
            const data = await query(`SELECT * FROM "${table_name}" ORDER BY 1`);
            if (data.rows.length > 0) {
                for (const row of data.rows) {
                    const cols = Object.keys(row);
                    const vals = cols.map(c => {
                        const v = row[c];
                        if (v === null) return 'NULL';
                        if (typeof v === 'number') return String(v);
                        if (v instanceof Date) return `'${v.toISOString()}'`;
                        return `'${String(v).replace(/'/g, "''")}'`;
                    });
                    sql += `INSERT INTO "${table_name}" ("${cols.join('","')}") VALUES (${vals.join(',')});\n`;
                }
            }
            sql += '\n';
        }

        fs.writeFileSync(filepath, sql, 'utf-8');
        return filename;
    } catch (err) {
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        throw err;
    }
};

// Helper paramètre (update ou insert)
const setParam = async (cle, valeur) => {
    const result = await query("UPDATE parametres SET valeur = $1 WHERE cle = $2", [valeur, cle]);
    if (result.rowCount === 0) {
        await query("INSERT INTO parametres (cle, valeur) VALUES ($1, $2)", [cle, valeur]);
    }
};

// ============================================================
// CRÉER UNE SAUVEGARDE
// ============================================================
exports.createBackup = async (req, res) => {
    try {
        let filename, method;
        filename = createWithPgDump('manual');
        if (filename) {
            method = 'pg_dump';
        } else {
            filename = await createManual('manual');
            method = 'manuel';
        }
        cleanupOldBackups();

        const stats = fs.statSync(path.join(BACKUP_DIR, filename));
        await query(
            `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
             VALUES ($1, 'BACKUP', 'system', NULL, $2)`,
            [req.user?.id, `Sauvegarde manuelle: ${filename} (${method})`]
        );
        res.json({
            message: 'Sauvegarde creee avec succes',
            filename, method,
            size: stats.size,
            created_at: stats.mtime,
        });
    } catch (err) {
        res.status(500).json({ message: 'Erreur sauvegarde: ' + err.message });
    }
};

// Sauvegarde automatique (appelée par cron)
exports.createBackupAuto = async () => {
    try {
        let filename, method;
        filename = createWithPgDump('auto');
        if (filename) {
            method = 'pg_dump';
        } else {
            filename = await createManual('auto');
            method = 'manuel';
        }
        cleanupOldBackups();
        await query(
            `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
             VALUES (NULL, 'BACKUP_AUTO', 'system', NULL, $1)`,
            [`Sauvegarde auto: ${filename} (${method})`]
        );
        console.log(`[Backup] Auto creee: ${filename} (${method})`);
    } catch (err) {
        console.error('[Backup] Erreur auto:', err.message);
    }
};

// ============================================================
// LISTER LES SAUVEGARDES
// ============================================================
exports.listBackups = async (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return res.json({ backups: [] });
        }
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sql'))
            .map(f => {
                const filepath = path.join(BACKUP_DIR, f);
                const stats = fs.statSync(filepath);
                return {
                    filename: f,
                    size: stats.size,
                    created_at: stats.mtime,
                    type: f.includes('auto') ? 'auto' : 'manual',
                };
            })
            .sort((a, b) => b.created_at - a.created_at);
        res.json({ backups: files });
    } catch {
        res.json({ backups: [] });
    }
};

// ============================================================
// TÉLÉCHARGER UNE SAUVEGARDE
// ============================================================
exports.downloadBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename.endsWith('.sql') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ message: 'Nom de fichier invalide' });
        }
        const filepath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: 'Sauvegarde non trouvee' });
        }
        res.download(filepath, filename);
    } catch {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ============================================================
// SUPPRIMER UNE SAUVEGARDE
// ============================================================
exports.deleteBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename.endsWith('.sql') || filename.includes('..')) {
            return res.status(400).json({ message: 'Nom de fichier invalide' });
        }
        const filepath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: 'Sauvegarde non trouvee' });
        }
        fs.unlinkSync(filepath);
        await query(
            `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
             VALUES ($1, 'BACKUP_DELETE', 'system', NULL, $2)`,
            [req.user?.id, `Sauvegarde supprimee: ${filename}`]
        );
        res.json({ message: 'Sauvegarde supprimee' });
    } catch {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// ============================================================
// RESTAURER UNE SAUVEGARDE
// ============================================================
exports.restoreBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename.endsWith('.sql') || filename.includes('..')) {
            return res.status(400).json({ message: 'Nom de fichier invalide' });
        }
        const filepath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: 'Sauvegarde non trouvee' });
        }

        const sql = fs.readFileSync(filepath, 'utf-8');
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('BEGIN') && !s.startsWith('COMMIT'));

        let success = 0, errors = 0;
        for (const stmt of statements) {
            try { await query(stmt); success++; }
            catch { errors++; }
        }

        await query(
            `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
             VALUES ($1, 'BACKUP_RESTORE', 'system', NULL, $2)`,
            [req.user?.id, `Restauration: ${filename} (${success} OK, ${errors} erreurs)`]
        );

        res.json({
            message: `Restauration terminee: ${success} OK, ${errors} erreur(s)`,
            success, errors
        });
    } catch (err) {
        res.status(500).json({ message: 'Erreur restauration: ' + err.message });
    }
};

// ============================================================
// CONFIGURATION PLANIFICATION
// ============================================================
exports.getScheduleConfig = async (req, res) => {
    try {
        const enabled = await query("SELECT valeur FROM parametres WHERE cle = 'backup_enabled'");
        const frequency = await query("SELECT valeur FROM parametres WHERE cle = 'backup_frequency'");
        const maxCount = await query("SELECT valeur FROM parametres WHERE cle = 'backup_max_count'");
        res.json({
            enabled: enabled.rows[0]?.valeur === 'true',
            frequency: frequency.rows[0]?.valeur || 'daily',
            maxBackups: parseInt(maxCount.rows[0]?.valeur || '20'),
        });
    } catch {
        res.json({ enabled: false, frequency: 'daily', maxBackups: 20 });
    }
};

exports.updateScheduleConfig = async (req, res) => {
    try {
        const { enabled, frequency, maxBackups } = req.body;
        await setParam('backup_enabled', String(enabled));
        await setParam('backup_frequency', frequency);
        await setParam('backup_max_count', String(maxBackups));

        const { startScheduler, stopScheduler } = require('../utils/backupScheduler');
        if (enabled) {
            startScheduler(frequency, maxBackups);
        } else {
            stopScheduler();
        }
        res.json({ message: 'Configuration mise a jour' });
    } catch {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};