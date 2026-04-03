const { query } = require('../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
require('dotenv').config();

// Export Excel — État global des heures
exports.exportExcelGlobal = async (req, res) => {
  try {
    const result = await query(
      `SELECT e.nom, e.prenom, e.grade, e.statut, e.departement, e.taux_horaire, e.heures_contractuelles,
              h.date_cours, h.type_heure, h.duree, h.salle,
              m.intitule as matiere
       FROM heures h
       JOIN enseignants e ON h.enseignant_id = e.id
       LEFT JOIN matieres m ON h.matiere_id = m.id
       ORDER BY e.nom, e.prenom, h.date_cours DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Heures Globales');

    sheet.columns = [
      { header: 'Nom', key: 'nom', width: 15 },
      { header: 'Prenom', key: 'prenom', width: 15 },
      { header: 'Grade', key: 'grade', width: 18 },
      { header: 'Statut', key: 'statut', width: 12 },
      { header: 'Departement', key: 'departement', width: 18 },
      { header: 'Taux horaire', key: 'taux_horaire', width: 14 },
      { header: 'Date cours', key: 'date_cours', width: 14 },
      { header: 'Type', key: 'type_heure', width: 8 },
      { header: 'Duree', key: 'duree', width: 8 },
      { header: 'Salle', key: 'salle', width: 10 },
      { header: 'Matiere', key: 'matiere', width: 25 },
    ];

    result.rows.forEach(row => sheet.addRow(row));

    // Style en-tête
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=heures_globales.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Erreur export' });
  }
};

// Export Excel — Fiche individuelle enseignant
exports.exportExcelEnseignant = async (req, res) => {
  try {
    const { id } = req.params;

    const ens = await query('SELECT * FROM enseignants WHERE id = $1', [id]);
    if (ens.rows.length === 0) return res.status(404).json({ message: 'Enseignant non trouve' });

    const heures = await query(
      `SELECT h.date_cours, h.type_heure, h.duree, h.salle, m.intitule as matiere
       FROM heures h
       LEFT JOIN matieres m ON h.matiere_id = m.id
       WHERE h.enseignant_id = $1
       ORDER BY h.date_cours DESC`,
      [id]
    );

    const workbook = new ExcelJS.Workbook();
    const e = ens.rows[0];

    const sheet = workbook.addWorksheet(`Fiche ${e.nom}`);
    sheet.columns = [
      { header: 'Date', key: 'date_cours', width: 14 },
      { header: 'Type', key: 'type_heure', width: 8 },
      { header: 'Duree (h)', key: 'duree', width: 10 },
      { header: 'Salle', key: 'salle', width: 10 },
      { header: 'Matiere', key: 'matiere', width: 30 },
    ];
    heures.rows.forEach(row => sheet.addRow(row));

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };

    const fileName = `fiche_${e.nom}_${e.prenom}.xlsx`.replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Erreur export' });
  }
};

// Export PDF — Fiche individuelle
exports.exportPdfEnseignant = async (req, res) => {
  try {
    const { id } = req.params;

    const ens = await query('SELECT * FROM enseignants WHERE id = $1', [id]);
    if (ens.rows.length === 0) return res.status(404).json({ message: 'Enseignant non trouve' });

    const heures = await query(
      `SELECT h.date_cours, h.type_heure, h.duree, h.salle, h.observations, m.intitule as matiere
       FROM heures h
       LEFT JOIN matieres m ON h.matiere_id = m.id
       WHERE h.enseignant_id = $1
       ORDER BY h.date_cours DESC`,
      [id]
    );

    const e = ens.rows[0];
    const doc = new PDFDocument();
    const fileName = `fiche_${e.nom}_${e.prenom}.pdf`.replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    doc.pipe(res);

    // En-tête
    doc.rect(0, 0, doc.page.width, 80).fill('#6d28d9');
    doc.fontSize(20).fillColor('#fff').text('FICHE INDIVIDUELLE ENSEIGNANT', 0, 25, { align: 'center' });

    // Infos enseignant
    doc.fillColor('#000').fontSize(12);
    doc.text(`Nom: ${e.nom}`, 50, 110);
    doc.text(`Prenom: ${e.prenom}`, 50, 130);
    doc.text(`Grade: ${e.grade}`, 50, 150);
    doc.text(`Statut: ${e.statut}`, 50, 170);
    doc.text(`Departement: ${e.departement}`, 50, 190);
    doc.text(`Taux horaire: ${e.taux_horaire} FCFA`, 50, 210);
    doc.text(`Heures contractuelles: ${e.heures_contractuelles}h`, 50, 230);

    // Tableau heures
    let y = 270;
    doc.rect(50, y, 495, 25).fill('#f3f0ff');
    doc.fillColor('#000').fontSize(9);
    doc.text('Date', 55, y + 7);
    doc.text('Type', 150, y + 7);
    doc.text('Duree', 220, y + 7);
    doc.text('Salle', 290, y + 7);
    doc.text('Matiere', 370, y + 7);
    y += 30;

    heures.rows.forEach((h, i) => {
      if (y > 720) { doc.addPage(); y = 50; }
      if (i % 2 === 0) doc.rect(50, y, 495, 20).fill('#fafafa');
      doc.fillColor('#000').fontSize(9);
      doc.text(h.date_cours, 55, y + 5);
      doc.text(h.type_heure, 150, y + 5);
      doc.text(`${h.duree}h`, 220, y + 5);
      doc.text(h.salle || '-', 290, y + 5);
      doc.text(h.matiere || '-', 370, y + 5);
      y += 22;
    });

    // Pied de page
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#999').text(
        `Genere le ${new Date().toLocaleDateString('fr-FR')} - Page ${i + 1}/${totalPages}`,
        50, doc.page.height - 30, { align: 'center', width: 495 }
      );
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Erreur export' });
  }
};
// Export Excel — État comptabilité
exports.exportExcelComptabilite = async (req, res) => {
  try {
    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    const result = await query(
      `SELECT e.id, e.nom, e.prenom, e.grade, e.statut, e.departement,
              e.taux_horaire, e.heures_contractuelles,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree ELSE 0 END) as cm,
              SUM(CASE WHEN h.type_heure = 'TD' THEN h.duree ELSE 0 END) as td,
              SUM(CASE WHEN h.type_heure = 'TP' THEN h.duree ELSE 0 END) as tp,
              SUM(h.duree) as total_brut,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                       WHEN h.type_heure = 'TD' THEN h.duree
                       WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END) as heures_eq_td
       FROM enseignants e
       LEFT JOIN heures h ON e.id = h.enseignant_id
       GROUP BY e.id
       ORDER BY e.nom, e.prenom`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Etat Comptabilite');

    sheet.columns = [
      { header: 'Nom', key: 'nom', width: 15 },
      { header: 'Prenom', key: 'prenom', width: 15 },
      { header: 'Grade', key: 'grade', width: 18 },
      { header: 'Statut', key: 'statut', width: 12 },
      { header: 'Departement', key: 'departement', width: 18 },
      { header: 'CM (h)', key: 'cm', width: 10 },
      { header: 'TD (h)', key: 'td', width: 10 },
      { header: 'TP (h)', key: 'tp', width: 10 },
      { header: 'Total brut (h)', key: 'total_brut', width: 14 },
      { header: `Total eq TD (h)`, key: 'heures_eq_td', width: 16 },
      { header: 'H. contractuelles', key: 'heures_contractuelles', width: 16 },
      { header: 'H. complementaires', key: 'complementaires', width: 18 },
      { header: 'Taux horaire', key: 'taux_horaire', width: 14 },
      { header: 'Montant a payer (FCFA)', key: 'montant', width: 22 },
    ];

    result.rows.forEach(row => {
      const eqTD = parseFloat(row.heures_eq_td) || 0;
      const contract = parseFloat(row.heures_contractuelles) || 0;
      const complementaires = eqTD > contract ? eqTD - contract : 0;
      const taux = parseFloat(row.taux_horaire) || 0;
      sheet.addRow({
        ...row,
        cm: parseFloat(row.cm) || 0,
        td: parseFloat(row.td) || 0,
        tp: parseFloat(row.tp) || 0,
        total_brut: parseFloat(row.total_brut) || 0,
        heures_eq_td: eqTD,
        complementaires: complementaires,
        montant: complementaires * taux,
      });
    });

    // Ligne total
    const totalRow = sheet.addRow({
      nom: 'TOTAL',
      cm: result.rows.reduce((s, r) => s + (parseFloat(r.cm) || 0), 0),
      td: result.rows.reduce((s, r) => s + (parseFloat(r.td) || 0), 0),
      tp: result.rows.reduce((s, r) => s + (parseFloat(r.tp) || 0), 0),
      total_brut: result.rows.reduce((s, r) => s + (parseFloat(r.total_brut) || 0), 0),
    });
    totalRow.font = { bold: true };

    // Style en-tête
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };

    // Style ligne total
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=etat_comptabilite.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erreur export comptabilite:', err);
    res.status(500).json({ message: 'Erreur export' });
  }
};

// Export PDF — État comptabilité
exports.exportPdfComptabilite = async (req, res) => {
  try {
    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    const result = await query(
      `SELECT e.id, e.nom, e.prenom, e.grade, e.statut, e.departement,
              e.taux_horaire, e.heures_contractuelles,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree ELSE 0 END) as cm,
              SUM(CASE WHEN h.type_heure = 'TD' THEN h.duree ELSE 0 END) as td,
              SUM(CASE WHEN h.type_heure = 'TP' THEN h.duree ELSE 0 END) as tp,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                       WHEN h.type_heure = 'TD' THEN h.duree
                       WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END) as heures_eq_td
       FROM enseignants e
       LEFT JOIN heures h ON e.id = h.enseignant_id
       GROUP BY e.id
       ORDER BY e.nom, e.prenom`
    );

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=etat_comptabilite.pdf');
    doc.pipe(res);

    // En-tête
    doc.rect(0, 0, doc.page.width, 60).fill('#6d28d9');
    doc.fontSize(16).fillColor('#fff').text('ETAT POUR LA COMPTABILITE', 0, 20, { align: 'center' });
    doc.fontSize(9).text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 0, 42, { align: 'center' });

    let y = 80;
    const colX = [30, 90, 160, 230, 280, 330, 370, 410, 450, 510, 580, 660, 740];

    // En-tête colonnes
    doc.rect(25, y, doc.page.width - 50, 20).fill('#f3f0ff');
    doc.fillColor('#000').fontSize(7);
    const headers = ['Nom', 'Prenom', 'Grade', 'Statut', 'Dep.', 'CM', 'TD', 'TP', 'Eq TD', 'Contract.', 'Compl.', 'Taux', 'Montant'];
    headers.forEach((h, i) => doc.text(h, colX[i], y + 5));
    y += 25;

    // Lignes
    let totalMontant = 0;
    result.rows.forEach((row, i) => {
      if (y > 540) { doc.addPage(); y = 50; }
      const eqTD = parseFloat(row.heures_eq_td) || 0;
      const contract = parseFloat(row.heures_contractuelles) || 0;
      const compl = eqTD > contract ? eqTD - contract : 0;
      const taux = parseFloat(row.taux_horaire) || 0;
      const montant = compl * taux;
      totalMontant += montant;

      if (i % 2 === 0) doc.rect(25, y, doc.page.width - 50, 16).fill('#fafafa');
      doc.fillColor('#000').fontSize(7);
      doc.text(row.nom, colX[0], y + 4);
      doc.text(row.prenom, colX[1], y + 4);
      doc.text(row.grade, colX[2], y + 4);
      doc.text(row.statut, colX[3], y + 4);
      doc.text(row.departement, colX[4], y + 4);
      doc.text(`${row.cm || 0}h`, colX[5], y + 4);
      doc.text(`${row.td || 0}h`, colX[6], y + 4);
      doc.text(`${row.tp || 0}h`, colX[7], y + 4);
      doc.text(`${eqTD.toFixed(1)}h`, colX[8], y + 4);
      doc.text(`${contract}h`, colX[9], y + 4);
      doc.text(`${compl.toFixed(1)}h`, colX[10], y + 4);
      doc.text(`${taux}`, colX[11], y + 4);
      doc.text(`${montant.toLocaleString()} FCFA`, colX[12], y + 4);
      y += 18;
    });

    // Total
    doc.rect(25, y, doc.page.width - 50, 20).fill('#6d28d9');
    doc.fillColor('#fff').fontSize(8);
    doc.text(`MONTANT TOTAL: ${totalMontant.toLocaleString()} FCFA`, colX[10], y + 5);

    doc.end();
  } catch (err) {
    console.error('Erreur PDF comptabilite:', err);
    res.status(500).json({ message: 'Erreur export' });
  }
};
// ✅ NOUVEAU : Export PDF — Journal des actions
exports.exportPdfLogs = async (req, res) => {
  try {
    const userRole = req.user?.role;

    let sql;
    if (userRole === 'admin') {
      sql = `
        SELECT al.*, u.nom as user_nom, u.role as user_role
        FROM action_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
      `;
    } else {
      sql = `
        SELECT al.*, u.nom as user_nom, u.role as user_role
        FROM action_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE u.role = 'rh'
        ORDER BY al.created_at DESC
      `;
    }

    const result = await query(sql);

    const doc = new PDFDocument({ size: 'A4' });
    const roleLabel = userRole === 'admin' ? 'ADMINISTRATEUR' : 'RH';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=journal_${roleLabel.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    // En-tête
    doc.rect(0, 0, doc.page.width, 80).fill('#6d28d9');
    doc.fontSize(18).fillColor('#fff').text(`JOURNAL DES ACTIONS - ${roleLabel}`, 0, 25, { align: 'center' });
    doc.fontSize(9).fillColor('#e0d4fc').text(`Genere le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`, 0, 50, { align: 'center' });
    doc.fontSize(8).fillColor('#e0d4fc').text(`${result.rows.length} action(s) enregistree(s)`, 0, 63, { align: 'center' });

    // Tableau
    let y = 100;
    const colX = [40, 120, 200, 270, 340, 420];

    // En-têtes colonnes
    doc.rect(35, y, doc.page.width - 70, 20).fill('#f3f0ff');
    doc.fillColor('#000').fontSize(8);
    const headers = ['Date', 'Utilisateur', 'Action', 'Role', 'Table', 'Details'];
    headers.forEach((h, i) => doc.text(h, colX[i], y + 5));
    y += 25;

    // Lignes
    result.rows.forEach((l, i) => {
      if (y > 720) {
        doc.addPage();
        y = 50;
        doc.rect(35, y, doc.page.width - 70, 20).fill('#f3f0ff');
        doc.fillColor('#000').fontSize(8);
        headers.forEach((h, j) => doc.text(h, colX[j], y + 5));
        y += 25;
      }

      if (i % 2 === 0) doc.rect(35, y, doc.page.width - 70, 18).fill('#fafafa');

      // Couleur par action
      const actionColors = {
        CREATE: '#059669',
        UPDATE: '#2563eb',
        DELETE: '#dc2626',
        VALIDATE: '#059669',
        REJECT: '#dc2626',
      };
      doc.fillColor(actionColors[l.action] || '#374151').fontSize(8);
      doc.text(new Date(l.created_at).toLocaleString('fr-FR'), colX[0], y + 4, { width: 75 });
      doc.fillColor('#000').fontSize(8);
      doc.text(l.user_nom || 'Systeme', colX[1], y + 4);
      doc.text(l.action, colX[2], y + 4);
      doc.text(l.user_role || '-', colX[3], y + 4);
      doc.text(l.table_concernee || '-', colX[4], y + 4);
      doc.text((l.details || '-').substring(0, 40), colX[5], y + 4, { width: 140 });
      y += 20;
    });

    if (result.rows.length === 0) {
      doc.fillColor('#999').fontSize(11).text('Aucune action enregistree', 0, 300, { align: 'center' });
    }

    // Pied de page
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#999').text(
        `GHES - Journal des actions - Genere le ${new Date().toLocaleDateString('fr-FR')} - Page ${i + 1}/${totalPages}`,
        40, doc.page.height - 25, { align: 'center', width: doc.page.width - 80 }
      );
    }

    doc.end();
  } catch (err) {
    console.error('Erreur PDF logs:', err);
    res.status(500).json({ message: 'Erreur export' });
  }
};