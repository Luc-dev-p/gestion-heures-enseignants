-- ============================================================
-- GHES - Base de données complète (11 tables)
-- ============================================================

-- 1. DEPARTEMENTS
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'TEACHER' CHECK (role IN ('ADMIN', 'RH', 'TEACHER')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. ACADEMIC_YEARS
CREATE TABLE IF NOT EXISTS academic_years (
  id SERIAL PRIMARY KEY,
  label VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  level VARCHAR(50),
  field VARCHAR(100),
  planned_hours DECIMAL(10,2) DEFAULT 0,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  firstname VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  grade VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ON_LEAVE')),
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. TEACHER_SUBJECTS (table de liaison)
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(teacher_id, subject_id),
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- 7. HOUR_TYPES
CREATE TABLE IF NOT EXISTS hour_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('CM', 'TD', 'TP')),
  coefficient DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. HOUR_ENTRIES
CREATE TABLE IF NOT EXISTS hour_entries (
  id SERIAL PRIMARY KEY,
  teacher_subject_id INTEGER NOT NULL REFERENCES teacher_subjects(id) ON DELETE CASCADE,
  hour_type_id INTEGER NOT NULL REFERENCES hour_types(id),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  room VARCHAR(100),
  note TEXT,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALIDATED', 'REJECTED', 'PAID')),
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50),
  entity_id INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 10. NOTIFICATIONS (manquant → ajouté)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('success', 'danger', 'warning', 'info')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. PASSWORD_RESETS (manquant → ajouté)
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

-- Types d'heures avec coefficients
INSERT INTO hour_types (name, coefficient) VALUES
  ('CM', 1.50),
  ('TD', 1.00),
  ('TP', 0.75)
ON CONFLICT (name) DO NOTHING;

-- Année académique par défaut
INSERT INTO academic_years (label, is_active) VALUES
  ('2024-2025', true),
  ('2023-2024', false)
ON CONFLICT (label) DO NOTHING;

-- Départements par défaut
INSERT INTO departments (name) VALUES
  ('Informatique'),
  ('Mathématiques'),
  ('Physique'),
  ('Génie Civil')
ON CONFLICT DO NOTHING;

-- Admin par défaut (email: admin@ghes.com / mot de passe à hasher)
INSERT INTO users (email, password, role) VALUES
  ('admin@ghes.com', '$2b$10$dummy_hash_replace_me', 'ADMIN'),
  ('rh@ghes.com', '$2b$10$dummy_hash_replace_me', 'RH')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- INDEX pour la performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_hour_entries_teacher_subject ON hour_entries(teacher_subject_id);
CREATE INDEX IF NOT EXISTS idx_hour_entries_academic_year ON hour_entries(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_hour_entries_status ON hour_entries(status);
CREATE INDEX IF NOT EXISTS idx_hour_entries_date ON hour_entries(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);