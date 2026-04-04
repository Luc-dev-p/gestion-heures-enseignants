const cron = require('node-cron');
let scheduledTask = null;

const startScheduler = (frequency = 'daily') => {
    stopScheduler();

    let cronExpr;
    switch (frequency) {
        case 'hourly':  cronExpr = '0 * * * *'; break;
        case 'daily':   cronExpr = '0 2 * * *'; break;
        case 'weekly':  cronExpr = '0 2 * * 0'; break;
        case 'monthly': cronExpr = '0 2 1 * *'; break;
        default:        cronExpr = '0 2 * * *';
    }

    if (!cron.validate(cronExpr)) {
        console.error('[BackupScheduler] Expression invalide:', cronExpr);
        return false;
    }

    scheduledTask = cron.schedule(cronExpr, async () => {
        console.log('[BackupScheduler] Sauvegarde automatique...');
        try {
            const { createBackupAuto } = require('../controllers/backupController');
            await createBackupAuto();
        } catch (err) {
            console.error('[BackupScheduler] Erreur:', err.message);
        }
    });

    console.log(`[BackupScheduler] Active: ${frequency} (${cronExpr})`);
    return true;
};

const stopScheduler = () => {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
        console.log('[BackupScheduler] Arrete');
    }
};

module.exports = { startScheduler, stopScheduler };