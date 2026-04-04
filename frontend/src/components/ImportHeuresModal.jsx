import React, { useState, useRef } from 'react';
import { Upload, Download, X, FileSpreadsheet, AlertCircle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { heureApi } from '../api/heureApi';
import * as XLSX from 'xlsx';

const ImportHeuresModal = ({ isOpen, onClose, anneeActive, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  // Réinitialiser le modal à la fermeture
  const handleClose = () => {
    setFile(null);
    setResult(null);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  // Télécharger le modèle Excel
  const downloadTemplate = () => {
    const templateData = [
      {
        'Enseignant': 'Dupont Jean',
        'Matière': 'Algorithmique',
        'Date cours': '15/09/2024',
        'Type heure': 'CM',
        'Durée (h)': 1.5,
        'Salle': 'A101',
        'Observations': ''
      },
      {
        'Enseignant': 'Martin Marie',
        'Matière': 'Base de données',
        'Date cours': '16/09/2024',
        'Type heure': 'TD',
        'Durée (h)': 2,
        'Salle': 'B205',
        'Observations': 'Groupe 2'
      },
      {
        'Enseignant': 'Bernard Pierre',
        'Matière': 'Réseaux',
        'Date cours': '17/09/2024',
        'Type heure': 'TP',
        'Durée (h)': 3,
        'Salle': 'Labo Info 3',
        'Observations': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Largeur des colonnes
    ws['!cols'] = [
      { wch: 25 }, // Enseignant
      { wch: 25 }, // Matière
      { wch: 15 }, // Date cours
      { wch: 12 }, // Type heure
      { wch: 12 }, // Durée (h)
      { wch: 18 }, // Salle
      { wch: 30 }, // Observations
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Heures');
    XLSX.writeFile(wb, `modele_import_heures_${anneeActive?.nom || 'annee'}.xlsx`);
  };

  // Gérer la sélection de fichier
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const allowedExts = ['.xlsx', '.xls'];
    const ext = selected.name.toLowerCase().slice(selected.name.lastIndexOf('.'));

    if (!allowedTypes.includes(selected.type) && !allowedExts.includes(ext)) {
      setResult({
        success: 0,
        total: 0,
        errors: [{ row: 0, enseignant: '', message: 'Type de fichier non autorisé. Utilisez .xlsx ou .xls' }]
      });
      setFile(null);
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setResult({
        success: 0,
        total: 0,
        errors: [{ row: 0, enseignant: '', message: 'Fichier trop volumineux (maximum 5 Mo)' }]
      });
      setFile(null);
      return;
    }

    setFile(selected);
    setResult(null);
  };

  // Lancer l'import
  const handleImport = async () => {
    if (!file || !anneeActive) return;

    setImporting(true);
    setResult(null);

    try {
      const response = await heureApi.importExcel(file, anneeActive.id);
      setResult(response.data);
      if (response.data.success > 0 && onImportSuccess) {
        onImportSuccess(response.data.success);
      }
    } catch (error) {
      const message = error.response?.data?.message || "Erreur lors de l'import. Vérifiez le format du fichier.";
      setResult({
        success: 0,
        total: 0,
        errors: [{ row: 0, enseignant: '', message }]
      });
    } finally {
      setImporting(false);
    }
  };

  // Supprimer le fichier sélectionné
  const removeFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Import Excel en masse</h2>
              <p className="text-sm text-gray-500">
                Année : {anneeActive?.nom || 'Non sélectionnée'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Étape 1 : Télécharger le modèle */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 text-sm">Étape 1 : Télécharger le modèle</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Téléchargez le fichier modèle, remplissez-le avec vos données, puis uploadez-le.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger le modèle (.xlsx)
                  </button>
                </div>
                <div className="mt-3 text-xs text-blue-600">
                  <strong>Colonnes requises :</strong> Enseignant, Matière, Type heure (CM/TD/TP), Durée (h)
                  <br />
                  <strong>Colonnes optionnelles :</strong> Date cours (JJ/MM/AAAA), Salle, Observations
                </div>
              </div>
            </div>
          </div>

          {/* Étape 2 : Uploader le fichier */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">
              Étape 2 : Sélectionner votre fichier rempli
            </h3>

            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  Cliquez pour sélectionner un fichier
                </p>
                <p className="text-xs text-gray-400 mt-1">.xlsx ou .xls — Max 5 Mo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} Ko
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Résultats */}
          {result && (
            <div className="space-y-3">
              {/* Résumé */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">
                    {result.success} réussi(s)
                  </span>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-700">
                      {result.errors.length} erreur(s)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {result.total} ligne(s) traitée(s)
                  </span>
                </div>
              </div>

              {/* Détail des erreurs */}
              {result.errors && result.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                    <h4 className="text-sm font-semibold text-red-800">Détail des erreurs</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Ligne</th>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Enseignant</th>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Erreur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((err, idx) => (
                          <tr key={idx} className="border-t border-gray-100 hover:bg-red-50/50">
                            <td className="px-4 py-2 text-gray-700 font-mono text-xs">
                              {err.row > 0 ? err.row : '—'}
                            </td>
                            <td className="px-4 py-2 text-gray-700 text-xs max-w-[150px] truncate">
                              {err.enseignant || '—'}
                            </td>
                            <td className="px-4 py-2 text-red-700 text-xs">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handleImport}
            disabled={!file || !anneeActive || importing}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importer ({file ? '1 fichier' : 'aucun fichier'})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportHeuresModal;