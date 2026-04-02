-- ============================================
-- BASE DE DONNÉES - GESTION DES HEURES
-- ============================================

-- 1. Table des utilisateurs (authentification)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'enseignant'
        CHECK (role IN ('admin', 'rh', 'enseignant')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des années académiques
CREATE TABLE IF NOT EXISTS annees_academiques (
    id SERIAL PRIMARY KEY,
    libelle VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des enseignants
CREATE TABLE IF NOT EXISTS enseignants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    grade VARCHAR(30) NOT NULL
        CHECK (grade IN ('Assistant', 'Maitre-Assistant', 'Professeur', 'Autre')),
    statut VARCHAR(20) NOT NULL
        CHECK (statut IN ('Permanent', 'Vacataire')),
    departement VARCHAR(100) NOT NULL,
    taux_horaire DECIMAL(10, 2) DEFAULT 0,
    heures_contractuelles DECIMAL(8, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des matières
CREATE TABLE IF NOT EXISTS matieres (
    id SERIAL PRIMARY KEY,
    intitule VARCHAR(200) NOT NULL,
    filiere VARCHAR(100) NOT NULL,
    niveau VARCHAR(10) NOT NULL
        CHECK (niveau IN ('L1', 'L2', 'L3', 'M1', 'M2')),
    volume_horaire_prevu DECIMAL(8, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des heures effectuées
CREATE TABLE IF NOT EXISTS heures (
    id SERIAL PRIMARY KEY,
    enseignant_id INTEGER REFERENCES enseignants(id) ON DELETE CASCADE,
    matiere_id INTEGER REFERENCES matieres(id) ON DELETE SET NULL,
    annee_id INTEGER REFERENCES annees_academiques(id) ON DELETE CASCADE,
    date_cours DATE NOT NULL,
    type_heure VARCHAR(10) NOT NULL
        CHECK (type_heure IN ('CM', 'TD', 'TP')),
    duree DECIMAL(4, 2) NOT NULL,
    salle VARCHAR(50),
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table des paramètres (équivalences, etc.)
CREATE TABLE IF NOT EXISTS parametres (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(50) UNIQUE NOT NULL,
    valeur VARCHAR(255) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Table des logs d'actions (journal)
CREATE TABLE IF NOT EXISTS action_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_concernee VARCHAR(50),
    enregistrement_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Année académique active
INSERT INTO annees_academiques (libelle, is_active) VALUES
('2024-2025', false),
('2025-2026', true);

-- Paramètres par défaut (équivalences)
INSERT INTO parametres (cle, valeur, description) VALUES
('equivalence_cm_td', '1.5', '1 heure CM = 1.5 heures TD'),
('equivalence_tp_td', '1', '1 heure TP = 1 heure TD'),
('seuil_heures_complementaires', '350', 'Seuil heures contractuelles par défaut');

-- Utilisateur admin par défaut (mot de passe : admin123)
-- Le mot de passe sera hashé par l'application au premier lancement
INSERT INTO users (nom, email, password, role) VALUES
('Administrateur', 'admin@university.com', '$2a$10$placeholder', 'admin');

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_heures_enseignant ON heures(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_heures_matiere ON heures(matiere_id);
CREATE INDEX IF NOT EXISTS idx_heures_annee ON heures(annee_id);
CREATE INDEX IF NOT EXISTS idx_heures_date ON heures(date_cours);
CREATE INDEX IF NOT EXISTS idx_enseignants_departement ON enseignants(departement);
CREATE INDEX IF NOT EXISTS idx_action_logs_user ON action_logs(user_id);