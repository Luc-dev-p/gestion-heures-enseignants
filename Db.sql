ALTER TABLE heures ADD COLUMN IF NOT EXISTS paiement_statut VARCHAR(20) DEFAULT 'non_paye';
UPDATE heures SET paiement_statut = 'non_paye' WHERE paiement_statut IS NULL;