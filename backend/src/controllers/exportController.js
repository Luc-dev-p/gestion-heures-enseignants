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

    if (heures.rows.length === 0) {
      doc.fillColor('#9ca3af').fontSize(10).text('Aucune heure enregistree pour cet enseignant.', 50, y + 20);
    } else {
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
    }

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
        const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_annuel_${dateStr}.pdf`);
    res.setHeader('Cache-Control', 'no-store');
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

// Export PDF — Bulletin de paiement individuel
exports.exportPdfBulletin = async (req, res) => {
  try {
    const { id } = req.params;

    const ens = await query('SELECT * FROM enseignants WHERE id = $1', [id]);
    if (ens.rows.length === 0) return res.status(404).json({ message: 'Enseignant non trouve' });
    const e = ens.rows[0];

    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    const heures = await query(
      `SELECT h.date_cours, h.type_heure, h.duree, h.salle, m.intitule as matiere, m.filiere, m.niveau
       FROM heures h
       LEFT JOIN matieres m ON h.matiere_id = m.id
       WHERE h.enseignant_id = $1
       ORDER BY h.type_heure, h.date_cours`,
      [id]
    );

    const cm = heures.rows.reduce((s, h) => s + (h.type_heure === 'CM' ? parseFloat(h.duree) : 0), 0);
    const td = heures.rows.reduce((s, h) => s + (h.type_heure === 'TD' ? parseFloat(h.duree) : 0), 0);
    const tp = heures.rows.reduce((s, h) => s + (h.type_heure === 'TP' ? parseFloat(h.duree) : 0), 0);
    const eqTD = (cm * eqCmTd) + td + (tp * eqTpTd);
    const contract = parseFloat(e.heures_contractuelles) || 0;
    const complementaires = Math.max(0, eqTD - contract);
    const taux = parseFloat(e.taux_horaire) || 0;
    const montant = complementaires * taux;

    const paiements = await query(
      `SELECT p.periode, p.montant, p.nb_heures_eq_td, p.nb_heures_complementaires, p.date_paiement, p.notes
       FROM paiements p
       WHERE p.enseignant_id = $1
       ORDER BY p.created_at DESC`,
      [id]
    );

    // Année académique active
    const anneeRes = await query("SELECT libelle FROM annees_academiques WHERE is_active = true LIMIT 1");
    const anneeLabel = anneeRes.rows[0]?.libelle || '';

    const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: false });
    const fileName = `Bulletin_${e.nom}_${e.prenom}.pdf`.replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    doc.pipe(res);

    doc.addPage();
    const pageW = doc.page.width - 80;
    const pgH = doc.page.height;

    // ===== EN-TÊTE =====
    doc.rect(0, 0, doc.page.width, 90).fill('#6d28d9');
    doc.fontSize(22).fillColor('#fff').text('BULLETIN DE PAIEMENT', 40, 18, { align: 'center' });
    doc.fontSize(10).fillColor('#e9d5ff').text('Heures complementaires des enseignants', 40, 45, { align: 'center' });
    doc.fontSize(8).fillColor('#c4b5fd').text(`${anneeLabel ? 'Annee : ' + anneeLabel + '  |  ' : ''}Genere le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 40, 65, { align: 'center' });

    // ===== INFOS ENSEIGNANT =====
    let y = 108;
    doc.roundedRect(40, y, pageW, 80, 6).fill('#f3f0ff');
    doc.fillColor('#6d28d9').fontSize(12).text('Informations de l\'enseignant', 55, y + 8);
    doc.fillColor('#374151').fontSize(10);
    doc.text(`Nom complet :  ${e.prenom} ${e.nom}`, 55, y + 28);
    doc.text(`Grade :  ${e.grade}    |    Statut :  ${e.statut}`, 55, y + 43);
    doc.text(`Departement :  ${e.departement || '-'}`, 55, y + 58);
    if (e.matricule) doc.text(`Matricule :  ${e.matricule}`, 350, y + 58);
    y += 95;

    // ===== RÉSUMÉ HORAIRES — Grille 3x2 bien espacée =====
    doc.roundedRect(40, y, pageW, 128, 6).stroke('#e5e7eb');
    doc.fillColor('#6d28d9').fontSize(12).text('Resume des heures', 55, y + 8);

    const boxW = (pageW - 40) / 3;
    const boxH = 48;
    const boxes = [
      { label: 'CM', value: `${cm.toFixed(1)} h`, color: '#7c3aed', bg: '#f5f3ff', sub: `= ${(cm * eqCmTd).toFixed(1)}h eq TD (coef. ${eqCmTd})` },
      { label: 'TD', value: `${td.toFixed(1)} h`, color: '#2563eb', bg: '#eff6ff', sub: `= ${td.toFixed(1)}h eq TD (coef. 1)` },
      { label: 'TP', value: `${tp.toFixed(1)} h`, color: '#059669', bg: '#ecfdf5', sub: `= ${(tp * eqTpTd).toFixed(1)}h eq TD (coef. ${eqTpTd})` },
      { label: 'Total Eq-TD', value: `${eqTD.toFixed(1)} h`, color: '#374151', bg: '#f9fafb', sub: 'Heures reelles ponderees' },
      { label: 'Heures contractuelles', value: `${contract} h`, color: '#6d28d9', bg: '#ede9fe', sub: 'Volume horaire de base' },
      { label: 'Heures complementaires', value: `${complementaires.toFixed(1)} h`, color: complementaires > 0 ? '#dc2626' : '#059669', bg: complementaires > 0 ? '#fef2f2' : '#ecfdf5', sub: complementaires > 0 ? 'Depassement a payer' : 'Aucun depassement' },
    ];

    boxes.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bx = 50 + col * (boxW + 5);
      const by = y + 28 + row * (boxH + 6);
      doc.roundedRect(bx, by, boxW, boxH, 4).fill(item.bg);
      doc.fillColor(item.color).fontSize(8).text(item.label, bx + 8, by + 5);
      doc.fillColor(item.color).fontSize(16).text(item.value, bx + 8, by + 16, { width: boxW - 16 });
      doc.fillColor('#6b7280').fontSize(6.5).text(item.sub, bx + 8, by + 37, { width: boxW - 16 });
    });

    y += 138;

    // ===== MONTANT =====
    if (montant > 0) {
      doc.roundedRect(40, y, pageW, 58, 6).fill('#ecfdf5').stroke('#a7f3d0');
      doc.fillColor('#059669').fontSize(9).text('Montant des heures complementaires', 55, y + 8);
      doc.fillColor('#059669').fontSize(24).text(`${montant.toLocaleString('fr-FR')} FCFA`, 55, y + 22);
      doc.fillColor('#6b7280').fontSize(8).text(`Taux horaire : ${taux.toLocaleString('fr-FR')} FCFA/h  x  ${complementaires.toFixed(1)}h complementaires`, 55, y + 44);
    } else {
      doc.roundedRect(40, y, pageW, 58, 6).fill('#f9fafb').stroke('#e5e7eb');
      doc.fillColor('#9ca3af').fontSize(9).text('Montant des heures complementaires', 55, y + 8);
      doc.fillColor('#d1d5db').fontSize(24).text('0 FCFA', 55, y + 22);
      doc.fillColor('#9ca3af').fontSize(8).text(complementaires === 0 ? 'Aucune heure complementaire - volume horaire non depasse' : 'Taux horaire non defini', 55, y + 44);
    }
    y += 72;

    // ===== DÉTAIL DES HEURES =====
    if (heures.rows.length > 0) {
      if (y > 600) { doc.addPage(); y = 50; }
      doc.fillColor('#6d28d9').fontSize(12).text('Detail des heures', 40, y);
      y += 18;

      doc.rect(40, y, pageW, 18).fill('#6d28d9');
      doc.fillColor('#fff').fontSize(7);
      doc.text('Matiere', 45, y + 5, { width: 140 });
      doc.text('Filiere', 190, y + 5, { width: 70 });
      doc.text('Type', 265, y + 5);
      doc.text('Duree', 295, y + 5);
      doc.text('Eq-TD', 340, y + 5);
      doc.text('Salle', 390, y + 5);
      doc.text('Date', 440, y + 5);
      y += 22;

      heures.rows.forEach((h, i) => {
        if (y > 700) { doc.addPage(); y = 50; }
        if (i % 2 === 0) doc.rect(40, y, pageW, 16).fill('#fafafa');
        let eqH = 0;
        if (h.type_heure === 'CM') eqH = parseFloat(h.duree) * eqCmTd;
        else if (h.type_heure === 'TD') eqH = parseFloat(h.duree);
        else if (h.type_heure === 'TP') eqH = parseFloat(h.duree) * eqTpTd;

        doc.fillColor('#374151').fontSize(7);
        doc.text(h.matiere || '-', 45, y + 4, { width: 140 });
        doc.text(h.filiere || '-', 190, y + 4, { width: 70 });
        doc.text(h.type_heure, 265, y + 4);
        doc.text(`${h.duree}h`, 295, y + 4);
        doc.text(`${eqH.toFixed(2)}h`, 340, y + 4);
        doc.text(h.salle || '-', 390, y + 4);
        doc.text(h.date_cours || '-', 440, y + 4);
        y += 17;
      });
      y += 10;
    } else {
      doc.roundedRect(40, y, pageW, 40, 6).fill('#f9fafb').stroke('#e5e7eb');
      doc.fillColor('#9ca3af').fontSize(9).text('Aucune heure enregistree pour cet enseignant.', 0, y + 14, { align: 'center', width: doc.page.width });
      y += 50;
    }

    // ===== HISTORIQUE PAIEMENTS =====
    if (paiements.rows.length > 0) {
      if (y > 580) { doc.addPage(); y = 50; }
      doc.fillColor('#6d28d9').fontSize(12).text('Historique des paiements', 40, y);
      y += 18;

      paiements.rows.forEach((p) => {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.roundedRect(40, y, pageW, 38, 4).fill('#f0fdf4').stroke('#bbf7d0');
        doc.fillColor('#059669').fontSize(10).text(`${parseFloat(p.montant).toLocaleString('fr-FR')} FCFA`, 55, y + 6);
        doc.fillColor('#059669').fontSize(7).text(`Periode : ${p.periode}`, 250, y + 6);
        doc.fillColor('#6b7280').fontSize(7);
        doc.text(`Eq-TD : ${parseFloat(p.nb_heures_eq_td || 0).toFixed(1)}h`, 250, y + 18);
        doc.text(`Compl. : ${parseFloat(p.nb_heures_complementaires || 0).toFixed(1)}h`, 370, y + 6);
        doc.text(`Date : ${p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '-'}`, 370, y + 18);
        if (p.notes) doc.text(`Note : ${p.notes}`, 55, y + 28);
        y += 45;
      });
      y += 10;
    }

    // ===== SIGNATURES =====
    if (y > 600) { doc.addPage(); y = 60; }
    y += 20;
    doc.moveTo(40, y).lineTo(40 + pageW, y).stroke('#d1d5db');
    y += 10;
    doc.fillColor('#374151').fontSize(9).text('Visas et signatures', 40, y);
    y += 20;

    const signW = (pageW - 40) / 3;
    ['Enseignant', 'Chef de departement', 'DRH / Doyen'].forEach((label, i) => {
      const sx = 40 + i * (signW + 20);
      doc.moveTo(sx, y + 35).lineTo(sx + signW, y + 35).stroke('#d1d5db');
      doc.fillColor('#374151').fontSize(8).text(label, sx, y + 40, { width: signW, align: 'center' });
      doc.fillColor('#9ca3af').fontSize(7).text('Nom, signature et cachet', sx, y + 52, { width: signW, align: 'center' });
    });

    // ===== PIED DE PAGE =====
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#9ca3af').text(
        `GestHeures - Bulletin de paiement | Genere automatiquement | Page ${i + 1}/${totalPages}`,
        40, pgH - 25, { align: 'center', width: pageW }
      );
    }

    doc.end();
  } catch (err) {
    console.error('Erreur bulletin PDF:', err);
    res.status(500).json({ message: 'Erreur export' });
  }
};

// Export PDF — Rapport annuel global
exports.exportPdfRapportAnnuel = async (req, res) => {
  try {
    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    const annee = await query("SELECT libelle FROM annees_academiques WHERE is_active = true LIMIT 1");
    const anneeLabel = annee.rows[0]?.libelle || new Date().getFullYear().toString();

    const result = await query(
      `SELECT e.id, e.nom, e.prenom, e.grade, e.statut, e.departement,
              e.taux_horaire, e.heures_contractuelles,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree ELSE 0 END) as cm,
              SUM(CASE WHEN h.type_heure = 'TD' THEN h.duree ELSE 0 END) as td,
              SUM(CASE WHEN h.type_heure = 'TP' THEN h.duree ELSE 0 END) as tp,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                       WHEN h.type_heure = 'TD' THEN h.duree
                       WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END) as heures_eq_td,
              COUNT(h.id) as nb_seances
       FROM enseignants e
       LEFT JOIN heures h ON e.id = h.enseignant_id
       GROUP BY e.id
       ORDER BY e.departement, e.nom, e.prenom`
    );

    const statsPaiement = await query(
      `SELECT COUNT(*) as nb, COALESCE(SUM(montant), 0) as total_paye, COUNT(DISTINCT enseignant_id) as nb_enseignants FROM paiements`
    );

    const deps = await query(
      `SELECT e.departement, COUNT(DISTINCT e.id) as nb_ens,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                       WHEN h.type_heure = 'TD' THEN h.duree
                       WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END) as total_eq_td
       FROM enseignants e
       LEFT JOIN heures h ON e.id = h.enseignant_id
       GROUP BY e.departement
       ORDER BY total_eq_td DESC`
    );

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport_annuel.pdf');
    doc.pipe(res);

    const pgW = doc.page.width;
    const pgH = doc.page.height;

    doc.rect(0, 0, pgW, 70).fill('#6d28d9');
    doc.fontSize(20).fillColor('#fff').text('RAPPORT ANNUEL — GESTION DES HEURES', 0, 15, { align: 'center' });
    doc.fontSize(10).fillColor('#e9d5ff').text(`Annee academique: ${anneeLabel}  |  Genere le ${new Date().toLocaleDateString('fr-FR')}`, 0, 45, { align: 'center' });

    let y = 90;

    let totalEqTD = 0, totalCompl = 0, totalMontant = 0, nbDepassement = 0;
    result.rows.forEach(r => {
      const eqTD = parseFloat(r.heures_eq_td) || 0;
      const contract = parseFloat(r.heures_contractuelles) || 0;
      const compl = Math.max(0, eqTD - contract);
      const taux = parseFloat(r.taux_horaire) || 0;
      totalEqTD += eqTD;
      totalCompl += compl;
      totalMontant += compl * taux;
      if (compl > 0) nbDepassement++;
    });

    const kpis = [
      { label: 'Enseignants', value: result.rows.length.toString(), color: '#7c3aed', bg: '#f5f3ff' },
      { label: 'Total Eq-TD', value: `${totalEqTD.toFixed(1)}h`, color: '#2563eb', bg: '#eff6ff' },
      { label: 'Heures compl.', value: `${totalCompl.toFixed(1)}h`, color: '#d97706', bg: '#fffbeb' },
      { label: 'Depassements', value: nbDepassement.toString(), color: '#dc2626', bg: '#fef2f2' },
      { label: 'Montant total', value: `${totalMontant.toLocaleString('fr-FR')} FCFA`, color: '#059669', bg: '#ecfdf5' },
      { label: 'Deja paye', value: `${parseFloat(statsPaiement.rows[0]?.total_paye || 0).toLocaleString('fr-FR')} FCFA`, color: '#0d9488', bg: '#f0fdfa' },
    ];

    const kpiW = (pgW - 100) / 6;
    kpis.forEach((kpi, i) => {
      const kx = 30 + i * (kpiW + 6);
      doc.roundedRect(kx, y, kpiW, 52, 5).fill(kpi.bg).stroke('#e5e7eb');
      doc.fillColor(kpi.color).fontSize(7).text(kpi.label, kx + 8, y + 6, { width: kpiW - 16 });
      doc.fillColor(kpi.color).fontSize(14).text(kpi.value, kx + 8, y + 20, { width: kpiW - 16 });
    });
    y += 70;

    doc.fillColor('#6d28d9').fontSize(11).text('Repartition par departement', 30, y);
    y += 18;

    const depColX = [30, 180, 310, 440, 560];
    doc.rect(25, y, pgW - 50, 18).fill('#6d28d9');
    doc.fillColor('#fff').fontSize(8);
    doc.text('Departement', depColX[0], y + 4);
    doc.text('Enseignants', depColX[1], y + 4);
    doc.text('Total Eq-TD', depColX[2], y + 4);
    doc.text('Part (%)', depColX[3], y + 4);
    doc.text('Barre', depColX[4], y + 4);
    y += 22;

    deps.rows.forEach((d, i) => {
      if (y > pgH - 80) { doc.addPage(); y = 50; }
      const eqTd = parseFloat(d.total_eq_td) || 0;
      const pct = totalEqTD > 0 ? (eqTd / totalEqTD * 100) : 0;
      if (i % 2 === 0) doc.rect(25, y, pgW - 50, 16).fill('#fafafa');
      doc.fillColor('#374151').fontSize(8);
      doc.text(d.departement || '-', depColX[0], y + 4);
      doc.text(`${d.nb_ens}`, depColX[1], y + 4);
      doc.text(`${eqTd.toFixed(1)}h`, depColX[2], y + 4);
      doc.text(`${pct.toFixed(1)}%`, depColX[3], y + 4);
      doc.roundedRect(depColX[4], y + 3, Math.max(pct * 2, 2), 10, 3).fill('#6d28d9');
      y += 18;
    });
    y += 20;

    doc.fillColor('#6d28d9').fontSize(11).text('Detail par enseignant', 30, y);
    y += 18;

    const colX = [25, 80, 145, 210, 265, 310, 350, 390, 430, 480, 540, 610, 690];
    doc.rect(20, y, pgW - 40, 18).fill('#6d28d9');
    doc.fillColor('#fff').fontSize(7);
    ['Depart.', 'Nom', 'Prenom', 'Grade', 'Statut', 'CM', 'TD', 'TP', 'Eq-TD', 'Contr.', 'Compl.', 'Taux', 'Montant'].forEach((h, i) => doc.text(h, colX[i], y + 4));
    y += 22;

    result.rows.forEach((row, i) => {
      if (y > pgH - 60) { doc.addPage(); y = 50; }
      const eqTD = parseFloat(row.heures_eq_td) || 0;
      const contract = parseFloat(row.heures_contractuelles) || 0;
      const compl = Math.max(0, eqTD - contract);
      const taux = parseFloat(row.taux_horaire) || 0;
      const montant = compl * taux;

      if (compl > 0 && i % 2 === 0) doc.rect(20, y, pgW - 40, 15).fill('#fffbeb');
      else if (i % 2 === 0) doc.rect(20, y, pgW - 40, 15).fill('#fafafa');

      doc.fillColor(compl > 0 ? '#92400e' : '#374151').fontSize(7);
      doc.text(row.departement || '-', colX[0], y + 4);
      doc.text(row.nom, colX[1], y + 4);
      doc.text(row.prenom, colX[2], y + 4);
      doc.text(row.grade, colX[3], y + 4);
      doc.text(row.statut, colX[4], y + 4);
      doc.text(`${parseFloat(row.cm || 0).toFixed(1)}h`, colX[5], y + 4);
      doc.text(`${parseFloat(row.td || 0).toFixed(1)}h`, colX[6], y + 4);
      doc.text(`${parseFloat(row.tp || 0).toFixed(1)}h`, colX[7], y + 4);
      doc.text(`${eqTD.toFixed(1)}h`, colX[8], y + 4);
      doc.text(`${contract}h`, colX[9], y + 4);
      doc.fillColor(compl > 0 ? '#dc2626' : '#9ca3af').text(`${compl.toFixed(1)}h`, colX[10], y + 4);
      doc.fillColor('#374151').text(`${taux}`, colX[11], y + 4);
      doc.fillColor(montant > 0 ? '#059669' : '#9ca3af').text(`${montant.toLocaleString('fr-FR')}`, colX[12], y + 4);
      y += 16;
    });

    y += 2;
    doc.rect(20, y, pgW - 40, 20).fill('#6d28d9');
    doc.fillColor('#fff').fontSize(8);
    doc.text('TOTAL', colX[1], y + 5);
    doc.text(`${result.rows.reduce((s, r) => s + parseFloat(r.cm || 0), 0).toFixed(1)}h`, colX[5], y + 5);
    doc.text(`${result.rows.reduce((s, r) => s + parseFloat(r.td || 0), 0).toFixed(1)}h`, colX[6], y + 5);
    doc.text(`${result.rows.reduce((s, r) => s + parseFloat(r.tp || 0), 0).toFixed(1)}h`, colX[7], y + 5);
    doc.text(`${totalEqTD.toFixed(1)}h`, colX[8], y + 5);
    doc.text(`${totalCompl.toFixed(1)}h`, colX[10], y + 5);
    doc.text(`${totalMontant.toLocaleString('fr-FR')} FCFA`, colX[12], y + 5);

    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#9ca3af').text(
        `GestHeures - Rapport annuel ${anneeLabel} | Page ${i + 1}/${totalPages}`,
        30, pgH - 25, { align: 'center', width: pgW - 60 }
      );
    }

    doc.end();
  } catch (err) {
    console.error('Erreur rapport annuel:', err);
    res.status(500).json({ message: 'Erreur export' });
  }
};