const { query } = require('../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════
// EXPORTS EXISTANTS (inchangés)
// ═══════════════════════════════════════════════════════════════

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

// Export PDF — Fiche individuelle (ancienne version simple)
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

    doc.rect(0, 0, doc.page.width, 80).fill('#6d28d9');
    doc.fontSize(20).fillColor('#fff').text('FICHE INDIVIDUELLE ENSEIGNANT', 0, 25, { align: 'center' });

    doc.fillColor('#000').fontSize(12);
    doc.text(`Nom: ${e.nom}`, 50, 110);
    doc.text(`Prenom: ${e.prenom}`, 50, 130);
    doc.text(`Grade: ${e.grade}`, 50, 150);
    doc.text(`Statut: ${e.statut}`, 50, 170);
    doc.text(`Departement: ${e.departement}`, 50, 190);
    doc.text(`Taux horaire: ${e.taux_horaire} FCFA`, 50, 210);
    doc.text(`Heures contractuelles: ${e.heures_contractuelles}h`, 50, 230);

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

    const totalRow = sheet.addRow({
      nom: 'TOTAL',
      cm: result.rows.reduce((s, r) => s + (parseFloat(r.cm) || 0), 0),
      td: result.rows.reduce((s, r) => s + (parseFloat(r.td) || 0), 0),
      tp: result.rows.reduce((s, r) => s + (parseFloat(r.tp) || 0), 0),
      total_brut: result.rows.reduce((s, r) => s + (parseFloat(r.total_brut) || 0), 0),
    });
    totalRow.font = { bold: true };

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
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

    doc.rect(0, 0, doc.page.width, 60).fill('#6d28d9');
    doc.fontSize(16).fillColor('#fff').text('ETAT POUR LA COMPTABILITE', 0, 20, { align: 'center' });
    doc.fontSize(9).text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 0, 42, { align: 'center' });

    let y = 80;
    const colX = [30, 90, 160, 230, 280, 330, 370, 410, 450, 510, 580, 660, 740];

    doc.rect(25, y, doc.page.width - 50, 20).fill('#f3f0ff');
    doc.fillColor('#000').fontSize(7);
    const headers = ['Nom', 'Prenom', 'Grade', 'Statut', 'Dep.', 'CM', 'TD', 'TP', 'Eq TD', 'Contract.', 'Compl.', 'Taux', 'Montant'];
    headers.forEach((h, i) => doc.text(h, colX[i], y + 5));
    y += 25;

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

    doc.rect(25, y, doc.page.width - 50, 20).fill('#6d28d9');
    doc.fillColor('#fff').fontSize(8);
    doc.text(`MONTANT TOTAL: ${totalMontant.toLocaleString()} FCFA`, colX[10], y + 5);

    doc.end();
  } catch (err) {
    console.error('Erreur PDF comptabilite:', err);
    res.status(500).json({ message: 'Erreur export' });
  }
};

// ═══════════════════════════════════════════════════════════════
// NOUVEAUX EXPORTS — Batch 2
// ═══════════════════════════════════════════════════════════════

// Export PDF — Bulletin de paiement individuel (belle mise en page)
exports.exportBulletinIndividuel = async (req, res) => {
  try {
    const { id } = req.params;

    const ens = await query('SELECT * FROM enseignants WHERE id = $1', [id]);
    if (ens.rows.length === 0) return res.status(404).json({ message: 'Enseignant non trouve' });

    // Équivalences
    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    // Heures détaillées
    const heures = await query(
      `SELECT h.date_cours, h.type_heure, h.duree, h.salle, h.observations,
              m.intitule as matiere, m.filiere
       FROM heures h
       LEFT JOIN matieres m ON h.matiere_id = m.id
       WHERE h.enseignant_id = $1
       ORDER BY h.type_heure, h.date_cours DESC`,
      [id]
    );

    // Totaux par type
    const totaux = await query(
      `SELECT type_heure, SUM(duree) as total
       FROM heures WHERE enseignant_id = $1 GROUP BY type_heure`,
      [id]
    );

    let cm = 0, td = 0, tp = 0;
    totaux.rows.forEach(h => {
      if (h.type_heure === 'CM') cm = parseFloat(h.total);
      else if (h.type_heure === 'TD') td = parseFloat(h.total);
      else if (h.type_heure === 'TP') tp = parseFloat(h.total);
    });

    const eqTD = (cm * eqCmTd) + td + (tp * eqTpTd);
    const e = ens.rows[0];
    const contract = parseFloat(e.heures_contractuelles) || 0;
    const compl = Math.max(0, eqTD - contract);
    const taux = parseFloat(e.taux_horaire) || 0;
    const montant = compl * taux;

    // Dernier paiement
    const lastPaiement = await query(
      `SELECT * FROM paiements WHERE enseignant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    // Année active
    const anneeActive = await query("SELECT libelle FROM annees_academiques WHERE is_active = true LIMIT 1");

    // ─── GÉNÉRATION PDF ───
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const fileName = `Bulletin_${e.nom}_${e.prenom}.pdf`.replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    doc.pipe(res);

    const W = doc.page.width - 80; // largeur utile

    // ── EN-TÊTE ──
    doc.rect(0, 0, doc.page.width, 90).fill('#6d28d9');

    // Ligne dorée
    doc.rect(0, 88, doc.page.width, 3).fill('#f59e0b');

    doc.fontSize(10).fillColor('#e9d5ff').text('REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE', 40, 15, { align: 'center', width: W });
    doc.fontSize(7).fillColor('#c4b5fd').text('Ministere de l\'Enseignement Superieur et de la Recherche Scientifique', 40, 28, { align: 'center', width: W });
    doc.fontSize(14).fillColor('#fff').text('UNIVERSITE', 40, 42, { align: 'center', width: W, characterSpacing: 3 });
    doc.fontSize(16).fillColor('#fef08a').text('BULLETIN DE PAIEMENT', 40, 62, { align: 'center', width: W });

    // ── INFOS ENSEIGNANT ──
    let y = 110;

    // Cadre infos
    doc.roundedRect(40, y, W, 85, 6).lineWidth(1.5).stroke('#6d28d9');
    doc.rect(40, y, W, 28).fill('#f5f3ff');

    doc.fontSize(11).fillColor('#6d28d9').text(`M. / Mme  ${e.prenom} ${e.nom}`, 55, y + 7, { width: W - 30 });
    doc.fontSize(8).fillColor('#7c3aed').text(
      `Grade: ${e.grade}   |   Statut: ${e.statut}   |   Departement: ${e.departement}`,
      55, y + 32
    );
    doc.fontSize(8).fillColor('#6b7280').text(
      `Heures contractuelles: ${contract}h   |   Taux horaire: ${taux} FCFA/h   |   Annee: ${anneeActive.rows[0]?.libelle || '2025-2026'}`,
      55, y + 48
    );

    // ── RÉSUMÉ HEURES ──
    y = 210;
    doc.roundedRect(40, y, W, 60, 6).lineWidth(1).stroke('#e5e7eb');

    const boxW = W / 4;
    const types = [
      { label: 'Heures CM', value: `${cm}h`, equiv: `${(cm * eqCmTd).toFixed(1)}h Eq-TD`, color: '#6d28d9', bg: '#f5f3ff' },
      { label: 'Heures TD', value: `${td}h`, equiv: `${td.toFixed(1)}h Eq-TD`, color: '#2563eb', bg: '#eff6ff' },
      { label: 'Heures TP', value: `${tp}h`, equiv: `${(tp * eqTpTd).toFixed(1)}h Eq-TD`, color: '#059669', bg: '#ecfdf5' },
      { label: 'Total Eq-TD', value: `${eqTD.toFixed(1)}h`, equiv: compl > 0 ? `+${compl.toFixed(1)}h compl.` : '', color: '#d97706', bg: '#fffbeb' },
    ];

    types.forEach((t, i) => {
      const bx = 40 + (i * boxW);
      doc.rect(bx, y, boxW, 60).fill(t.bg);
      if (i < 3) doc.moveTo(bx + boxW, y).lineTo(bx + boxW, y + 60).lineWidth(0.5).stroke('#e5e7eb');
      doc.fontSize(7).fillColor('#6b7280').text(t.label, bx + 8, y + 8, { width: boxW - 16 });
      doc.fontSize(16).fillColor(t.color).text(t.value, bx + 8, y + 22, { width: boxW - 16 });
      doc.fontSize(7).fillColor('#9ca3af').text(t.equiv, bx + 8, y + 46, { width: boxW - 16 });
    });

    // ── CALCUL DU PAIEMENT ──
    y = 285;
    doc.roundedRect(40, y, W, 80, 6).lineWidth(1.5).stroke('#059669');
    doc.rect(40, y, W, 24).fill('#ecfdf5');
    doc.fontSize(10).fillColor('#059669').text('DETAIL DU CALCUL', 55, y + 6, { width: W - 30 });

    doc.fontSize(9).fillColor('#374151');
    doc.text(`Heures equivalentes TD realisees: ${eqTD.toFixed(1)}h`, 55, y + 32);
    doc.text(`Heures contractuelles: ${contract}h`, 55, y + 46);
    doc.text(`Heures complementaires: ${compl.toFixed(1)}h`, 55, y + 60);

    doc.fontSize(9).fillColor('#374151');
    doc.text(`Taux horaire: ${taux} FCFA`, 320, y + 32);

    // Montant
    doc.roundedRect(320, y + 46, W - 280, 30, 4).fill('#059669');
    doc.fontSize(12).fillColor('#fff').text('MONTANT:', 332, y + 52);
    doc.fontSize(14).fillColor('#fef08a').text(`${montant.toLocaleString()} FCFA`, 420, y + 50);

    // ── DÉTAIL DES HEURES ──
    y = 380;
    doc.fontSize(10).fillColor('#374151').text('DETAIL DES HEURES EFFECTUEES', 40, y);
    y += 18;

    const cols = [40, 120, 280, 345, 400, 480];
    const colHeaders = ['Date', 'Matiere', 'Filiere', 'Type', 'Duree', 'Salle'];

    // En-tête tableau
    doc.rect(40, y, W, 18).fill('#f3f0ff');
    doc.fontSize(7).fillColor('#6d28d9');
    colHeaders.forEach((h, i) => doc.text(h, cols[i] + 3, y + 5));

    y += 20;
    heures.rows.forEach((h, i) => {
      if (y > 710) {
        doc.addPage();
        y = 50;
        doc.rect(40, y, W, 18).fill('#f3f0ff');
        doc.fontSize(7).fillColor('#6d28d9');
        colHeaders.forEach((hh, i) => doc.text(hh, cols[i] + 3, y + 5));
        y += 20;
      }
      if (i % 2 === 0) doc.rect(40, y, W, 14).fill('#fafafa');
      doc.fontSize(7).fillColor('#374151');
      doc.text(h.date_cours || '-', cols[0] + 3, y + 3, { width: 75 });
      doc.text(h.matiere || '-', cols[1] + 3, y + 3, { width: 155, ellipsis: true });
      doc.text(h.filiere || '-', cols[2] + 3, y + 3, { width: 60, ellipsis: true });
      doc.text(h.type_heure, cols[3] + 3, y + 3, { width: 50 });
      doc.text(`${h.duree}h`, cols[4] + 3, y + 3, { width: 70 });
      doc.text(h.salle || '-', cols[5] + 3, y + 3, { width: 50 });
      y += 16;
    });

    // ── SIGNATURES ──
    y = Math.max(y + 30, 620);
    doc.moveTo(40, y).lineTo(40 + W, y).lineWidth(0.5).stroke('#d1d5db');
    y += 10;

    doc.fontSize(8).fillColor('#6b7280');
    doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, 40, y);
    y += 25;

    // 3 colonnes signature
    const sigW = W / 3;
    doc.moveTo(40, y + 40).lineTo(40 + sigW - 10, y + 40).lineWidth(0.5).stroke('#374151');
    doc.moveTo(40 + sigW + 10, y + 40).lineTo(40 + 2 * sigW - 10, y + 40).stroke('#374151');
    doc.moveTo(40 + 2 * sigW + 10, y + 40).lineTo(40 + W, y + 40).stroke('#374151');

    doc.fontSize(7).fillColor('#374151');
    doc.text('Enseignant', 40, y + 45, { width: sigW - 10, align: 'center' });
    doc.text('Chef de Departement', 40 + sigW + 10, y + 45, { width: sigW - 20, align: 'center' });
    doc.text('Doyen / Responsable', 40 + 2 * sigW + 10, y + 45, { width: sigW - 10, align: 'center' });

    // ── PIED DE PAGE ──
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 25, doc.page.width, 25).fill('#f9fafb');
      doc.fontSize(7).fillColor('#9ca3af').text(
        `Bulletin genere par GHES - ${new Date().toLocaleDateString('fr-FR')} - Page ${i + 1}/${totalPages}`,
        40, doc.page.height - 18, { align: 'center', width: W }
      );
    }

    doc.end();
  } catch (err) {
    console.error('Erreur bulletin:', err);
    res.status(500).json({ message: 'Erreur export bulletin' });
  }
};

// Export PDF — Rapport annuel global
exports.exportRapportAnnuel = async (req, res) => {
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
       ORDER BY e.departement, e.nom, e.prenom`
    );

    // Stats par département
    const deptStats = await query(
      `SELECT e.departement, COUNT(*) as nb_enseignants,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                       WHEN h.type_heure = 'TD' THEN h.duree
                       WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END) as total_eq_td
       FROM enseignants e
       LEFT JOIN heures h ON e.id = h.enseignant_id
       GROUP BY e.departement
       ORDER BY total_eq_td DESC`
    );

    // Paiements totaux
    const paiements = await query('SELECT COALESCE(SUM(montant), 0) as total_paye, COUNT(*) as nb_paiements FROM paiements');

    const anneeActive = await query("SELECT libelle FROM annees_academiques WHERE is_active = true LIMIT 1");

    // ─── GÉNÉRATION PDF ───
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport_annuel.pdf');
    doc.pipe(res);

    const PW = doc.page.width;
    const PH = doc.page.height;

    // ── EN-TÊTE ──
    doc.rect(0, 0, PW, 70).fill('#6d28d9');
    doc.rect(0, 68, PW, 3).fill('#f59e0b');
    doc.fontSize(18).fillColor('#fff').text('RAPPORT ANNUEL GLOBAL', 0, 15, { align: 'center' });
    doc.fontSize(9).fillColor('#e9d5ff').text(
      `Annee academique: ${anneeActive.rows[0]?.libelle || '2025-2026'}  |  Genere le ${new Date().toLocaleDateString('fr-FR')}`,
      0, 42, { align: 'center' }
    );

    // ── STATISTIQUES GLOBALES ──
    let y = 85;
    const totalEnseignants = result.rows.length;
    let totalCM = 0, totalTD = 0, totalTP = 0, totalEqTD = 0, totalMontant = 0, totalCompl = 0;

    result.rows.forEach(r => {
      totalCM += parseFloat(r.cm) || 0;
      totalTD += parseFloat(r.td) || 0;
      totalTP += parseFloat(r.tp) || 0;
      const eq = parseFloat(r.heures_eq_td) || 0;
      totalEqTD += eq;
      const c = parseFloat(r.heures_contractuelles) || 0;
      const compl = Math.max(0, eq - c);
      totalCompl += compl;
      totalMontant += compl * (parseFloat(r.taux_horaire) || 0);
    });

    const statsBoxes = [
      { label: 'Enseignants', value: totalEnseignants, color: '#6d28d9' },
      { label: 'Heures CM', value: `${totalCM.toFixed(1)}h`, color: '#2563eb' },
      { label: 'Heures TD', value: `${totalTD.toFixed(1)}h`, color: '#7c3aed' },
      { label: 'Heures TP', value: `${totalTP.toFixed(1)}h`, color: '#059669' },
      { label: 'Total Eq-TD', value: `${totalEqTD.toFixed(1)}h`, color: '#d97706' },
      { label: 'Montant Total', value: `${totalMontant.toLocaleString()} FCFA`, color: '#dc2626' },
    ];

    const statW = (PW - 50) / statsBoxes.length;
    statsBoxes.forEach((s, i) => {
      const bx = 25 + (i * statW);
      doc.roundedRect(bx, y, statW - 8, 40, 4).fill('#f9fafb').stroke('#e5e7eb');
      doc.rect(bx, y, 4, 40).fill(s.color);
      doc.fontSize(7).fillColor('#6b7280').text(s.label, bx + 12, y + 6);
      doc.fontSize(13).fillColor(s.color).text(s.value, bx + 12, y + 20);
    });

    y += 55;

    // ── RÉPARTITION PAR DÉPARTEMENT ──
    doc.fontSize(10).fillColor('#374151').text('Repartition par departement', 25, y);
    y += 15;

    const dCols = [25, 200, 320, 440, 580];
    doc.rect(25, y, PW - 50, 18).fill('#f3f0ff');
    doc.fontSize(7).fillColor('#6d28d9');
    doc.text('Departement', dCols[0] + 5, y + 5);
    doc.text('Nb Enseignants', dCols[1] + 5, y + 5);
    doc.text('Heures Eq-TD', dCols[2] + 5, y + 5);
    doc.text('% du Total', dCols[3] + 5, y + 5);
    doc.text('Barre', dCols[4] + 5, y + 5);
    y += 20;

    deptStats.rows.forEach((d, i) => {
      if (y > PH - 80) { doc.addPage(); y = 50; }
      if (i % 2 === 0) doc.rect(25, y, PW - 50, 14).fill('#fafafa');
      doc.fontSize(7).fillColor('#374151');
      doc.text(d.departement || '-', dCols[0] + 5, y + 3);
      doc.text(`${d.nb_enseignants}`, dCols[1] + 5, y + 3);
      doc.text(`${parseFloat(d.total_eq_td || 0).toFixed(1)}h`, dCols[2] + 5, y + 3);
      const pct = totalEqTD > 0 ? ((parseFloat(d.total_eq_td || 0) / totalEqTD) * 100).toFixed(1) : '0';
      doc.text(`${pct}%`, dCols[3] + 5, y + 3);
      // Mini barre
      const barW = Math.min(150, (parseFloat(pct) / 100) * 150);
      doc.roundedRect(dCols[4] + 5, y + 4, barW, 7, 2).fill('#6d28d9');
      y += 16;
    });

    y += 15;

    // ── TABLEAU DÉTAILLÉ PAR ENSEIGNANT ──
    doc.fontSize(10).fillColor('#374151').text('Detail par enseignant', 25, y);
    y += 15;

    const tCols = [25, 80, 155, 235, 295, 340, 385, 425, 470, 535, 610, 690];
    const tHeaders = ['#', 'Nom', 'Prenom', 'Dept.', 'CM', 'TD', 'TP', 'Eq-TD', 'Contr.', 'Compl.', 'Taux', 'Montant'];

    doc.rect(25, y, PW - 50, 18).fill('#6d28d9');
    doc.fontSize(6.5).fillColor('#fff');
    tHeaders.forEach((h, i) => doc.text(h, tCols[i] + 3, y + 5));
    y += 20;

    result.rows.forEach((row, i) => {
      if (y > PH - 50) {
        doc.addPage(); y = 50;
        doc.rect(25, y, PW - 50, 18).fill('#6d28d9');
        doc.fontSize(6.5).fillColor('#fff');
        tHeaders.forEach((h, ii) => doc.text(h, tCols[ii] + 3, y + 5));
        y += 20;
      }
      const eq = parseFloat(row.heures_eq_td) || 0;
      const contr = parseFloat(row.heures_contractuelles) || 0;
      const comp = Math.max(0, eq - contr);
      const tx = parseFloat(row.taux_horaire) || 0;
      const mt = comp * tx;

      if (i % 2 === 0) doc.rect(25, y, PW - 50, 14).fill('#fafafa');
      if (comp > 0) doc.rect(tCols[9], y, 55, 14).fill('#fef3c7');

      doc.fontSize(6.5).fillColor('#374151');
      doc.text(`${i + 1}`, tCols[0] + 3, y + 3);
      doc.text(row.nom, tCols[1] + 3, y + 3, { width: 70, ellipsis: true });
      doc.text(row.prenom, tCols[2] + 3, y + 3, { width: 75, ellipsis: true });
      doc.text(row.departement, tCols[3] + 3, y + 3, { width: 55, ellipsis: true });
      doc.text(`${row.cm || 0}`, tCols[4] + 3, y + 3, { width: 50 });
      doc.text(`${row.td || 0}`, tCols[5] + 3, y + 3, { width: 40 });
      doc.text(`${row.tp || 0}`, tCols[6] + 3, y + 3, { width: 35 });
      doc.text(`${eq.toFixed(1)}`, tCols[7] + 3, y + 3, { width: 40 });
      doc.text(`${contr}`, tCols[8] + 3, y + 3, { width: 60 });
      doc.text(`${comp.toFixed(1)}`, tCols[9] + 3, y + 3, { width: 55 });
      doc.text(`${tx}`, tCols[10] + 3, y + 3, { width: 70 });
      doc.text(`${mt.toLocaleString()}`, tCols[11] + 3, y + 3, { width: 70 });
      y += 16;
    });

    // Ligne total
    doc.rect(25, y, PW - 50, 18).fill('#6d28d9');
    doc.fontSize(7).fillColor('#fff');
    doc.text('TOTAL', tCols[3] + 3, y + 5);
    doc.text(`${totalCM.toFixed(1)}h`, tCols[4] + 3, y + 5);
    doc.text(`${totalTD.toFixed(1)}h`, tCols[5] + 3, y + 5);
    doc.text(`${totalTP.toFixed(1)}h`, tCols[6] + 3, y + 5);
    doc.text(`${totalEqTD.toFixed(1)}h`, tCols[7] + 3, y + 5);
    doc.text(`${totalCompl.toFixed(1)}h`, tCols[9] + 3, y + 5);
    doc.text(`${totalMontant.toLocaleString()} FCFA`, tCols[11] + 3, y + 5);

    // ── PIED DE PAGE ──
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#9ca3af').text(
        `Rapport annuel GHES - ${new Date().toLocaleDateString('fr-FR')} - Page ${i + 1}/${totalPages}`,
        25, PH - 20, { align: 'center', width: PW - 50 }
      );
    }

    doc.end();
  } catch (err) {
    console.error('Erreur rapport annuel:', err);
    res.status(500).json({ message: 'Erreur rapport annuel' });
  }
};