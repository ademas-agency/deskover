-- =============================================================================
-- OuBosser — Migration Scoring V2
-- Nouveaux critères (restauration, pricing) + OuBosser Score (Bayesian average)
-- À exécuter manuellement sur le dashboard Supabase
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. NOUVELLES COLONNES SUR `places`
-- =============================================================================

ALTER TABLE places ADD COLUMN score_food NUMERIC(3,2) DEFAULT 0;
ALTER TABLE places ADD COLUMN scraped_score_food NUMERIC(3,2);

-- free = bibliothèque, espace public
-- consumption = café, restaurant (conso obligatoire)
-- paid = coworking, espace payant
ALTER TABLE places ADD COLUMN pricing_model TEXT DEFAULT 'consumption'
    CHECK (pricing_model IN ('free', 'consumption', 'paid'));

-- free = gratuit, cheap = < 5€/h, moderate = 5-15€/h, expensive = > 15€/h
ALTER TABLE places ADD COLUMN price_range TEXT DEFAULT 'free'
    CHECK (price_range IN ('free', 'cheap', 'moderate', 'expensive'));

-- OuBosser Score pré-calculé (mis à jour par trigger)
ALTER TABLE places ADD COLUMN oubosser_score NUMERIC(5,2) DEFAULT 0;

-- Dernière date de contribution
ALTER TABLE places ADD COLUMN last_rating_at TIMESTAMPTZ;


-- =============================================================================
-- 2. NOUVELLE COLONNE SUR `ratings`
-- =============================================================================

-- 5 = menu complet, 3 = boissons/snacks, 1 = rien. Nullable (rétrocompat.)
ALTER TABLE ratings ADD COLUMN food SMALLINT CHECK (food IN (1, 3, 5));


-- =============================================================================
-- 3. PARAMÈTRES DE SCORING
-- =============================================================================

CREATE TABLE IF NOT EXISTS scoring_config (
    key   TEXT PRIMARY KEY,
    value NUMERIC NOT NULL,
    description TEXT
);

INSERT INTO scoring_config (key, value, description) VALUES
    ('w_wifi',    0.30, 'Poids WiFi dans le score qualité'),
    ('w_noise',   0.25, 'Poids bruit dans le score qualité'),
    ('w_power',   0.20, 'Poids prises dans le score qualité'),
    ('w_comfort', 0.15, 'Poids confort dans le score qualité'),
    ('w_food',    0.10, 'Poids restauration dans le score qualité'),
    ('bayesian_C', 5,    'Nombre d''avis fictifs (prior) pour Bayesian average'),
    ('bayesian_m', 2.50, 'Moyenne a priori sur 5'),
    ('decay_halflife', 180, 'Demi-vie en jours pour le decay temporel'),
    ('freshness_halflife', 90, 'Demi-vie fraîcheur en jours')
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- 4. FONCTION : Calcul du OuBosser Score (Bayesian average)
-- =============================================================================

CREATE OR REPLACE FUNCTION compute_oubosser_score(p_place_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_rating_count  INTEGER;
    v_raw_score     NUMERIC;
    v_bayesian      NUMERIC;
    v_freshness     NUMERIC;
    v_last_rating   TIMESTAMPTZ;
    v_C             NUMERIC;
    v_m             NUMERIC;
    v_fresh_hl      NUMERIC;
    v_w_wifi        NUMERIC;
    v_w_noise       NUMERIC;
    v_w_power       NUMERIC;
    v_w_comfort     NUMERIC;
    v_w_food        NUMERIC;
    v_s_wifi        NUMERIC;
    v_s_noise       NUMERIC;
    v_s_power       NUMERIC;
    v_s_comfort     NUMERIC;
    v_s_food        NUMERIC;
BEGIN
    SELECT value INTO v_C FROM scoring_config WHERE key = 'bayesian_C';
    SELECT value INTO v_m FROM scoring_config WHERE key = 'bayesian_m';
    SELECT value INTO v_fresh_hl FROM scoring_config WHERE key = 'freshness_halflife';
    SELECT value INTO v_w_wifi FROM scoring_config WHERE key = 'w_wifi';
    SELECT value INTO v_w_noise FROM scoring_config WHERE key = 'w_noise';
    SELECT value INTO v_w_power FROM scoring_config WHERE key = 'w_power';
    SELECT value INTO v_w_comfort FROM scoring_config WHERE key = 'w_comfort';
    SELECT value INTO v_w_food FROM scoring_config WHERE key = 'w_food';

    SELECT p.score_wifi, p.score_noise, p.score_power, p.score_comfort, p.score_food,
           p.rating_count, p.last_rating_at
    INTO v_s_wifi, v_s_noise, v_s_power, v_s_comfort, v_s_food,
         v_rating_count, v_last_rating
    FROM places p WHERE p.id = p_place_id;

    -- Fallback sur scores scrappés si pas de contributions
    IF v_rating_count IS NULL OR (v_rating_count = 0 AND COALESCE(v_s_wifi, 0) = 0) THEN
        SELECT p.scraped_score_wifi, p.scraped_score_noise, p.scraped_score_power,
               p.scraped_score_comfort, p.scraped_score_food
        INTO v_s_wifi, v_s_noise, v_s_power, v_s_comfort, v_s_food
        FROM places p WHERE p.id = p_place_id;
        IF v_s_wifi IS NULL THEN RETURN 0; END IF;
        v_rating_count := 0;
    END IF;

    -- Score qualité pondéré (sur 5)
    v_raw_score := (
        v_w_wifi    * COALESCE(v_s_wifi, 0) +
        v_w_noise   * COALESCE(v_s_noise, 0) +
        v_w_power   * COALESCE(v_s_power, 0) +
        v_w_comfort * COALESCE(v_s_comfort, 0) +
        v_w_food    * COALESCE(v_s_food, 0)
    );

    -- Bayesian average
    v_bayesian := (v_C * v_m + v_rating_count * v_raw_score) / (v_C + v_rating_count);

    -- Bonus fraîcheur (max +0.25)
    IF v_last_rating IS NOT NULL THEN
        v_freshness := 0.25 * EXP(
            -LN(2) / v_fresh_hl * EXTRACT(EPOCH FROM (NOW() - v_last_rating)) / 86400.0
        );
    ELSE
        v_freshness := 0;
    END IF;

    RETURN ROUND(v_bayesian + v_freshness, 2);
END;
$$ LANGUAGE plpgsql STABLE;


-- =============================================================================
-- 5. FONCTION : Recalculer les scores agrégés d'un lieu
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_place_scores(p_place_id UUID)
RETURNS VOID AS $$
DECLARE
    v_decay_hl    NUMERIC;
    v_count       INTEGER;
    v_avg_wifi    NUMERIC;
    v_avg_power   NUMERIC;
    v_avg_noise   NUMERIC;
    v_avg_comfort NUMERIC;
    v_avg_food    NUMERIC;
    v_last_at     TIMESTAMPTZ;
    v_sc_wifi     NUMERIC;
    v_sc_power    NUMERIC;
    v_sc_noise    NUMERIC;
    v_sc_comfort  NUMERIC;
    v_sc_food     NUMERIC;
    v_scrape_w    NUMERIC;
    v_user_w      NUMERIC;
BEGIN
    SELECT value INTO v_decay_hl FROM scoring_config WHERE key = 'decay_halflife';

    -- Moyennes pondérées par decay temporel
    SELECT
        COUNT(*),
        CASE WHEN SUM(EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0)) > 0
             THEN SUM(wifi    * EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0))
                / SUM(EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0)) END,
        CASE WHEN SUM(EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0)) > 0
             THEN SUM(power   * EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0))
                / SUM(EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0)) END,
        CASE WHEN SUM(EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0)) > 0
             THEN SUM(noise   * EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0))
                / SUM(EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0)) END,
        CASE WHEN SUM(EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0)) > 0
             THEN SUM(comfort * EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0))
                / SUM(EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0)) END,
        CASE WHEN SUM(CASE WHEN food IS NOT NULL
                 THEN EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0) ELSE 0 END) > 0
             THEN SUM(COALESCE(food,0) * CASE WHEN food IS NOT NULL
                  THEN EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0) ELSE 0 END)
                / SUM(CASE WHEN food IS NOT NULL
                  THEN EXP(-LN(2)/v_decay_hl * EXTRACT(EPOCH FROM (NOW()-created_at))/86400.0) ELSE 0 END) END,
        MAX(created_at)
    INTO v_count, v_avg_wifi, v_avg_power, v_avg_noise, v_avg_comfort, v_avg_food, v_last_at
    FROM ratings WHERE place_id = p_place_id;

    -- Scores scrappés
    SELECT p.scraped_score_wifi, p.scraped_score_power, p.scraped_score_noise,
           p.scraped_score_comfort, p.scraped_score_food
    INTO v_sc_wifi, v_sc_power, v_sc_noise, v_sc_comfort, v_sc_food
    FROM places p WHERE p.id = p_place_id;

    -- Poids scraping vs user (par lieu)
    IF v_count >= 10 THEN v_scrape_w := 0.1;
    ELSIF v_count >= 5 THEN v_scrape_w := 0.3;
    ELSIF v_count >= 1 THEN v_scrape_w := 0.6;
    ELSE v_scrape_w := 1.0;
    END IF;
    v_user_w := 1.0 - v_scrape_w;

    UPDATE places SET
        score_wifi    = ROUND(COALESCE(v_scrape_w * v_sc_wifi, 0) + COALESCE(v_user_w * v_avg_wifi, 0), 2),
        score_power   = ROUND(COALESCE(v_scrape_w * v_sc_power, 0) + COALESCE(v_user_w * v_avg_power, 0), 2),
        score_noise   = ROUND(COALESCE(v_scrape_w * v_sc_noise, 0) + COALESCE(v_user_w * v_avg_noise, 0), 2),
        score_comfort = ROUND(COALESCE(v_scrape_w * v_sc_comfort, 0) + COALESCE(v_user_w * v_avg_comfort, 0), 2),
        score_food    = ROUND(COALESCE(v_scrape_w * v_sc_food, 0) + COALESCE(v_user_w * v_avg_food, 0), 2),
        score_overall = ROUND(
            0.30 * (COALESCE(v_scrape_w * v_sc_wifi, 0) + COALESCE(v_user_w * v_avg_wifi, 0)) +
            0.25 * (COALESCE(v_scrape_w * v_sc_noise, 0) + COALESCE(v_user_w * v_avg_noise, 0)) +
            0.20 * (COALESCE(v_scrape_w * v_sc_power, 0) + COALESCE(v_user_w * v_avg_power, 0)) +
            0.15 * (COALESCE(v_scrape_w * v_sc_comfort, 0) + COALESCE(v_user_w * v_avg_comfort, 0)) +
            0.10 * (COALESCE(v_scrape_w * v_sc_food, 0) + COALESCE(v_user_w * v_avg_food, 0))
        , 2),
        rating_count   = v_count,
        last_rating_at = v_last_at,
        oubosser_score = compute_oubosser_score(p_place_id),
        updated_at     = NOW()
    WHERE id = p_place_id;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 6. TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_place_scores()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_place_scores(OLD.place_id);
    ELSE
        PERFORM refresh_place_scores(NEW.place_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_scores ON ratings;
CREATE TRIGGER trg_refresh_scores
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_place_scores();


-- =============================================================================
-- 7. FONCTION : ranking_places (classement TripAdvisor)
-- =============================================================================

CREATE OR REPLACE FUNCTION ranking_places(
    lat             DOUBLE PRECISION DEFAULT NULL,
    lng             DOUBLE PRECISION DEFAULT NULL,
    radius_m        INTEGER DEFAULT 5000,
    page_size       INTEGER DEFAULT 20,
    page_offset     INTEGER DEFAULT 0,
    filter_type     TEXT DEFAULT NULL,
    filter_pricing  TEXT DEFAULT NULL,
    filter_price    TEXT DEFAULT NULL,
    filter_city     TEXT DEFAULT NULL,
    min_wifi        NUMERIC DEFAULT NULL,
    min_noise       NUMERIC DEFAULT NULL,
    min_power       NUMERIC DEFAULT NULL,
    min_food        NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    rank            BIGINT,
    id              UUID,
    name            TEXT,
    slug            TEXT,
    city            TEXT,
    city_slug       TEXT,
    place_type      TEXT,
    pricing_model   TEXT,
    price_range     TEXT,
    score_wifi      NUMERIC,
    score_power     NUMERIC,
    score_noise     NUMERIC,
    score_comfort   NUMERIC,
    score_food      NUMERIC,
    score_overall   NUMERIC,
    oubosser_score  NUMERIC,
    rating_count    INTEGER,
    last_rating_at  TIMESTAMPTZ,
    cover_photo_url TEXT,
    distance_m      DOUBLE PRECISION,
    confidence      TEXT
) AS $$
DECLARE
    v_point GEOGRAPHY;
BEGIN
    IF lat IS NOT NULL AND lng IS NOT NULL THEN
        v_point := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
    END IF;

    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY p.oubosser_score DESC) AS rank,
        p.id, p.name, p.slug, p.city, p.city_slug, p.place_type,
        p.pricing_model, p.price_range,
        p.score_wifi, p.score_power, p.score_noise, p.score_comfort, p.score_food,
        p.score_overall, p.oubosser_score, p.rating_count, p.last_rating_at,
        p.cover_photo_url,
        CASE WHEN v_point IS NOT NULL
             THEN ST_Distance(p.location, v_point)
             ELSE NULL END AS distance_m,
        CASE
            WHEN p.rating_count = 0  THEN 'estimated'
            WHEN p.rating_count <= 2 THEN 'low'
            WHEN p.rating_count <= 4 THEN 'preliminary'
            ELSE 'confirmed'
        END AS confidence
    FROM places p
    WHERE p.status = 'approved'
      AND (v_point IS NULL OR ST_DWithin(p.location, v_point, radius_m))
      AND (filter_type    IS NULL OR p.place_type    = filter_type)
      AND (filter_pricing IS NULL OR p.pricing_model = filter_pricing)
      AND (filter_price   IS NULL OR p.price_range   = filter_price)
      AND (filter_city    IS NULL OR p.city_slug     = filter_city)
      AND (min_wifi  IS NULL OR p.score_wifi  >= min_wifi)
      AND (min_noise IS NULL OR p.score_noise >= min_noise)
      AND (min_power IS NULL OR p.score_power >= min_power)
      AND (min_food  IS NULL OR p.score_food  >= min_food)
    ORDER BY p.oubosser_score DESC, p.rating_count DESC
    LIMIT page_size OFFSET page_offset;
END;
$$ LANGUAGE plpgsql STABLE;


-- =============================================================================
-- 8. INDEX
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_places_oubosser_score
    ON places (oubosser_score DESC) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_places_type_score
    ON places (place_type, oubosser_score DESC) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_places_pricing
    ON places (pricing_model) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_places_city_score
    ON places (city_slug, oubosser_score DESC) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_ratings_place_created
    ON ratings (place_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_places_last_rating
    ON places (last_rating_at DESC NULLS LAST) WHERE status = 'approved';


-- =============================================================================
-- 9. BATCH : Recalculer tous les scores (post-migration)
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_all_oubosser_scores()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_place RECORD;
BEGIN
    FOR v_place IN SELECT id FROM places WHERE status = 'approved' LOOP
        PERFORM refresh_place_scores(v_place.id);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Décommenter pour initialiser :
-- SELECT refresh_all_oubosser_scores();

COMMIT;
